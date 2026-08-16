import type { SupabaseClient } from "@supabase/supabase-js";
import { createSeedAccounts, getLoginUsername } from "@/lib/accounts";
import { getAuthenticatedProfile } from "@/lib/api/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  AmModuleRole,
  AmPermissions,
  AmPerson
} from "@/lib/amActivity";

export const AM_PHOTO_BUCKET = "task-photos";
export const AM_PHOTO_LIMIT_PER_KIND = 4;
export const AM_SIGNED_URL_TTL_SECONDS = 60 * 60;

export interface AmApiContext {
  readonly supabase: SupabaseClient;
  readonly profile: {
    readonly id: string;
    readonly username: string;
    readonly role: "admin" | "worker";
  };
  readonly permissions: AmPermissions;
}

export type AmApiContextResult =
  | { readonly ok: true; readonly context: AmApiContext }
  | { readonly ok: false; readonly status: number; readonly error: string };

interface DbAmRole {
  readonly profile_id: string;
  readonly role: AmModuleRole;
  readonly is_active: boolean;
}

interface DbModuleMembership {
  readonly profile_id: string;
  readonly role: AmModuleRole;
  readonly is_active: boolean;
}

interface DbProfileSummary {
  readonly id: string;
  readonly username: string | null;
  readonly full_name: string | null;
  readonly is_active: boolean | null;
}

const isAmModuleRole = (value: unknown): value is AmModuleRole =>
  value === "leader" ||
  value === "member" ||
  value === "workshop_manager" ||
  value === "web_admin";

export const getAmPermissions = (role: AmModuleRole | null): AmPermissions => ({
  role,
  canAccess: role !== null,
  canManageTeam: role === "leader",
  canAssign: role === "leader" || role === "workshop_manager" || role === "web_admin",
  canAssignOutsideTeam: role === "workshop_manager" || role === "web_admin",
  canReview: role === "leader" || role === "workshop_manager",
  canViewAll: role === "leader" || role === "workshop_manager" || role === "web_admin"
});

export const getAmApiContext = async (request: Request): Promise<AmApiContextResult> => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      status: 503,
      error: "Chua cau hinh Supabase server env cho phan he AM."
    };
  }

  const auth = await getAuthenticatedProfile(request, supabase);
  if (!auth.ok) return auth;

  let { data, error } = await supabase
    .from("app_module_memberships")
    .select("profile_id, role, is_active")
    .eq("module_key", "am")
    .eq("profile_id", auth.profile.id)
    .maybeSingle();

  if (error?.message.toLowerCase().includes("app_module_memberships")) {
    const legacy = await supabase
      .from("am_module_roles")
      .select("profile_id, role, is_active")
      .eq("profile_id", auth.profile.id)
      .maybeSingle();
    data = legacy.data;
    error = legacy.error;
  }

  if (error) {
    const missingMigration = error.message.toLowerCase().includes("am_module_roles");
    return {
      ok: false,
      status: missingMigration ? 503 : 500,
      error: missingMigration
        ? "Chua ap dung migration 20260717_am_workflow.sql tren Supabase."
        : error.message
    };
  }

  const row = data as DbModuleMembership | null;
  const role = row?.is_active !== false && isAmModuleRole(row?.role) ? row.role : null;
  return {
    ok: true,
    context: {
      supabase,
      profile: auth.profile,
      permissions: getAmPermissions(role)
    }
  };
};

export const listAmPeople = async (
  supabase: SupabaseClient
): Promise<{ readonly people: AmPerson[]; readonly error: string | null }> => {
  const [{ data: profiles, error: profilesError }, membershipResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, full_name, is_active")
        .order("full_name", { ascending: true }),
      supabase
        .from("app_module_memberships")
        .select("profile_id, role, is_active")
        .eq("module_key", "am")
        .eq("is_active", true)
    ]);

  if (profilesError) return { people: [], error: profilesError.message };
  let roles = membershipResult.data;
  let rolesError = membershipResult.error;
  if (rolesError?.message.toLowerCase().includes("app_module_memberships")) {
    const legacy = await supabase
      .from("am_module_roles")
      .select("profile_id, role, is_active")
      .eq("is_active", true);
    roles = legacy.data;
    rolesError = legacy.error;
  }
  if (rolesError) return { people: [], error: rolesError.message };

  const roleByProfileId = new Map(
    ((roles ?? []) as DbModuleMembership[])
      .filter((row) => row.is_active && isAmModuleRole(row.role))
      .map((row) => [row.profile_id, row.role])
  );
  const accountByUsername = new Map(
    createSeedAccounts().map((account) => [getLoginUsername(account.username), account])
  );

  return {
    people: ((profiles ?? []) as DbProfileSummary[])
      .filter((profile) => profile.is_active !== false && Boolean(profile.username))
      .map((profile) => {
        const username = getLoginUsername(profile.username ?? "");
        const account = accountByUsername.get(username);
        return {
          id: profile.id,
          username,
          fullName: profile.full_name?.trim() || account?.fullName || username,
          orgTitle: account?.orgTitle || "Nhân sự Xưởng",
          canLogin: account?.canLogin ?? true,
          amRole: roleByProfileId.get(profile.id)
        };
      })
      .filter((person) => person.canLogin),
    error: null
  };
};

export const isActiveAmTeamMember = (person: AmPerson): boolean =>
  person.amRole === "leader" || person.amRole === "member";

export const canReportAmTask = async (
  context: AmApiContext,
  taskId: string
): Promise<boolean> => {
  const { data, error } = await context.supabase
    .from("am_task_assignees")
    .select("task_id")
    .eq("task_id", taskId)
    .eq("profile_id", context.profile.id)
    .maybeSingle();
  return !error && Boolean(data);
};

export const addAmEvent = async (
  supabase: SupabaseClient,
  taskId: string,
  eventType: string,
  actorId: string,
  details: Record<string, unknown> = {}
): Promise<string | null> => {
  const { error } = await supabase.from("am_task_events").insert({
    task_id: taskId,
    event_type: eventType,
    actor_id: actorId,
    details
  });
  return error?.message ?? null;
};

export const createAmNotifications = async (
  supabase: SupabaseClient,
  recipientIds: readonly string[],
  input: {
    readonly eventType: string;
    readonly taskId?: string;
    readonly title: string;
    readonly message: string;
  },
  excludeProfileId?: string
): Promise<string | null> => {
  const recipients = [...new Set(recipientIds)].filter(
    (profileId) => profileId && profileId !== excludeProfileId
  );
  if (recipients.length === 0) return null;

  const { error } = await supabase.from("app_notifications").insert(
    recipients.map((recipientId) => ({
      recipient_id: recipientId,
      module: "am",
      event_type: input.eventType,
      entity_id: input.taskId ?? null,
      title: input.title,
      message: input.message
    }))
  );
  return error?.message ?? null;
};

export const listAmSupervisorIds = async (
  supabase: SupabaseClient
): Promise<string[]> => {
  const { data } = await supabase
    .from("am_module_roles")
    .select("profile_id, role")
    .eq("is_active", true)
    .in("role", ["leader", "workshop_manager"]);
  return ((data ?? []) as Pick<DbAmRole, "profile_id" | "role">[]).map(
    (row) => row.profile_id
  );
};

export const normalizeAmText = (value: unknown, maxLength = 2000): string =>
  (typeof value === "string" ? value.trim() : "").slice(0, maxLength);

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
