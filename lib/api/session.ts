import type { SupabaseClient } from "@supabase/supabase-js";
import {
  applyAccountProfileOverrides,
  createSeedAccounts,
  getLoginUsername
} from "@/lib/accounts";
import {
  AUTH_SESSION_COOKIE,
  getRequestCookie,
  verifyAuthSessionToken
} from "@/lib/authSession";
import { canManagePersonnelOrg, isDataAdminAccount } from "@/lib/permissions";
import type { AuthAccount, Task, UserRole } from "@/types/domain";

interface DbProfile {
  readonly id: string;
  readonly username: string | null;
  readonly role: UserRole | null;
  readonly is_active: boolean | null;
  readonly org_group?: string | null;
  readonly subgroup?: string | null;
  readonly org_role?: string | null;
}

interface DbTaskOwnership {
  readonly id: string;
  readonly assigned_to: string | null;
  readonly reporter_id?: string | null;
  readonly is_cancelled: boolean | null;
  readonly progress_mode?: "continuous" | "binary" | null;
}

export interface AuthenticatedProfile {
  readonly id: string;
  readonly username: string;
  readonly role: UserRole;
  readonly org_group?: string | null;
  readonly subgroup?: string | null;
  readonly org_role?: string | null;
}

export type ApiAuthResult =
  | { readonly ok: true; readonly profile: AuthenticatedProfile }
  | { readonly ok: false; readonly status: number; readonly error: string };

export type ApiAccountAuthResult =
  | {
      readonly ok: true;
      readonly profile: AuthenticatedProfile;
      readonly account: AuthAccount;
    }
  | { readonly ok: false; readonly status: number; readonly error: string };

export type TaskOwnershipResult =
  | { readonly ok: true; readonly task: DbTaskOwnership }
  | { readonly ok: false; readonly status: number; readonly error: string };

export const getLocalAccountIdForUsername = (username: string): string =>
  `user-${getLoginUsername(username)}`;

export const isSessionProfileReference = (
  value: string,
  profile: Pick<AuthenticatedProfile, "id" | "username">
): boolean => {
  const normalizedValue = value.trim().toLowerCase();
  return (
    normalizedValue === profile.id.toLowerCase() ||
    normalizedValue === getLocalAccountIdForUsername(profile.username).toLowerCase()
  );
};

export const getAuthenticatedProfile = async (
  request: Request,
  supabase: SupabaseClient
): Promise<ApiAuthResult> => {
  const session = await verifyAuthSessionToken(
    getRequestCookie(request, AUTH_SESSION_COOKIE)
  );
  if (!session) {
    return {
      ok: false,
      status: 401,
      error: "Phien dang nhap khong hop le. Vui long dang nhap lai."
    };
  }

  const profileResult = await supabase
    .from("profiles")
    .select("id, username, role, is_active, org_group, subgroup, org_role")
    .eq("id", session.profileId)
    .maybeSingle();
  let profile = profileResult.data as DbProfile | null;
  let profileError = profileResult.error;

  if (
    profileError &&
    ["org_group", "subgroup", "org_role"].some((column) =>
      profileError?.message.toLowerCase().includes(column)
    )
  ) {
    const fallback = await supabase
      .from("profiles")
      .select("id, username, role, is_active")
      .eq("id", session.profileId)
      .maybeSingle();
    profile = fallback.data as DbProfile | null;
    profileError = fallback.error;
  }

  if (profileError) {
    return { ok: false, status: 500, error: profileError.message };
  }

  if (!profile?.id || !profile.username) {
    return { ok: false, status: 401, error: "Khong tim thay profile dang nhap." };
  }
  if (profile.is_active === false) {
    return { ok: false, status: 403, error: "Tai khoan chua duoc kich hoat." };
  }
  if (getLoginUsername(profile.username) !== getLoginUsername(session.username)) {
    return { ok: false, status: 401, error: "Phien dang nhap khong khop tai khoan." };
  }

  return {
    ok: true,
    profile: {
      id: profile.id,
      username: getLoginUsername(profile.username),
      role: profile.role ?? "worker",
      org_group: profile.org_group,
      subgroup: profile.subgroup,
      org_role: profile.org_role
    }
  };
};

export const getAuthenticatedAccount = async (
  request: Request,
  supabase: SupabaseClient
): Promise<ApiAccountAuthResult> => {
  const auth = await getAuthenticatedProfile(request, supabase);
  if (!auth.ok) return auth;

  const seededAccount =
    createSeedAccounts().find(
      (item) => getLoginUsername(item.username) === auth.profile.username
    ) ?? null;
  if (!seededAccount) {
    return {
      ok: false,
      status: 403,
      error: "Tai khoan chua co trong danh sach noi bo."
    };
  }
  const account = applyAccountProfileOverrides(
    [seededAccount],
    [auth.profile]
  )[0];
  if (!account) {
    return {
      ok: false,
      status: 403,
      error: "Tai khoan chua co trong danh sach noi bo."
    };
  }
  if (!account.canLogin) {
    return {
      ok: false,
      status: 403,
      error: "Tai khoan tam chua duoc kich hoat."
    };
  }

  return {
    ok: true,
    profile: auth.profile,
    account
  };
};

export const getAuthenticatedDataAdmin = async (
  request: Request,
  supabase: SupabaseClient
): Promise<ApiAccountAuthResult> => {
  const auth = await getAuthenticatedAccount(request, supabase);
  if (!auth.ok) return auth;

  if (!isDataAdminAccount(auth.account)) {
    return {
      ok: false,
      status: 403,
      error: "Chi tai khoan DATA admin moi duoc thuc hien thao tac nay."
    };
  }

  return auth;
};

export const getAuthenticatedPersonnelAdmin = async (
  request: Request,
  supabase: SupabaseClient
): Promise<ApiAccountAuthResult> => {
  const auth = await getAuthenticatedAccount(request, supabase);
  if (!auth.ok) return auth;

  if (!canManagePersonnelOrg(auth.account)) {
    return {
      ok: false,
      status: 403,
      error: "Chỉ vinhlpp và kiaq được quản lý sơ đồ nhân sự."
    };
  }

  return auth;
};

export const isUuid = (value: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
};

const normalizeText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const findTaskForProfile = async (
  supabase: SupabaseClient,
  profileId: string,
  task: Pick<Task, "id" | "tagname" | "wo">,
  allowReporter: boolean
): Promise<TaskOwnershipResult> => {
  let query = supabase
    .from("tasks")
    .select("id, assigned_to, reporter_id, is_cancelled, progress_mode")
    .limit(1);

  if (isUuid(task.id)) {
    query = query.eq("id", task.id);
  } else {
    const tagname = normalizeText(task.tagname);
    if (!tagname) {
      return {
        ok: false,
        status: 400,
        error: "Thieu tagname de xac dinh hang muc."
      };
    }
    query = query.eq("tagname", tagname).eq("assigned_to", profileId);
    const wo = normalizeText(task.wo);
    if (wo) query = query.eq("wo", wo);
  }

  const { data, error } = await query.maybeSingle();
  if (error) return { ok: false, status: 500, error: error.message };

  const dbTask = data as DbTaskOwnership | null;
  const canAccess =
    dbTask?.assigned_to === profileId ||
    (allowReporter && dbTask?.reporter_id === profileId);
  if (!dbTask?.id || !canAccess) {
    return {
      ok: false,
      status: 403,
      error: "Khong co quyen thao tac hang muc nay."
    };
  }

  return { ok: true, task: dbTask };
};

export const findOwnedTask = async (
  supabase: SupabaseClient,
  profileId: string,
  task: Pick<Task, "id" | "tagname" | "wo">
): Promise<TaskOwnershipResult> =>
  findTaskForProfile(supabase, profileId, task, false);

export const findReportableTask = async (
  supabase: SupabaseClient,
  profileId: string,
  task: Pick<Task, "id" | "tagname" | "wo">
): Promise<TaskOwnershipResult> =>
  findTaskForProfile(supabase, profileId, task, true);
