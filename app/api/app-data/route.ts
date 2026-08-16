import { NextResponse } from "next/server";
import {
  applyAccountPasswordRequirements,
  createProfilesFromAccounts,
  createSeedAccounts
} from "@/lib/accounts";
import { forbiddenOriginMessage, isAllowedRequestOrigin } from "@/lib/api/security";
import { getAuthenticatedAccount } from "@/lib/api/session";
import { getScopedAppData } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  AppData,
  AuthAccount,
  ProgressPercent,
  ProgressRecord,
  Profile,
  Task
} from "@/types/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DB_PAGE_SIZE = 1000;
const BASE_TASK_COLUMNS = [
  "id",
  "stt",
  "wo",
  "tagname",
  "task_name",
  "nhom",
  "don_vi",
  "section",
  "duration",
  "priority",
  "start_date",
  "finish_date",
  "resource_name",
  "nhom_truong",
  "assigned_to",
  "is_cancelled",
  "cancel_reason"
] as const;
const LEADER_TASK_COLUMNS = [
  "reporter_id",
  "task_source",
  "progress_mode",
  "created_by",
  "updated_by"
] as const;

interface DbProfile {
  readonly id: string;
  readonly username: string | null;
  readonly resource_name: string | null;
  readonly must_change_password: boolean | null;
  readonly password_hash: string | null;
}

interface DbTask {
  readonly id: string;
  readonly stt: number | null;
  readonly wo: string | null;
  readonly tagname: string | null;
  readonly task_name: string | null;
  readonly nhom: string | null;
  readonly don_vi: string | null;
  readonly section: string | null;
  readonly duration: string | null;
  readonly priority: number | null;
  readonly start_date: string | null;
  readonly finish_date: string | null;
  readonly resource_name: string | null;
  readonly nhom_truong: string | null;
  readonly assigned_to: string | null;
  readonly reporter_id?: string | null;
  readonly task_source?: "plan" | "ad_hoc" | null;
  readonly progress_mode?: "continuous" | "binary" | null;
  readonly created_by?: string | null;
  readonly updated_by?: string | null;
  readonly is_cancelled: boolean | null;
  readonly cancel_reason: string | null;
}

interface DbProgress {
  readonly task_id: string | null;
  readonly user_id: string | null;
  readonly report_date: string | null;
  readonly percent: number | null;
  readonly note: string | null;
  readonly photo_path: string | null;
  readonly photo_paths?: string[] | null;
  readonly submitted_at: string | null;
  readonly submitted_by?: string | null;
}

interface DbImportBatch {
  readonly id: string;
  readonly file_name: string;
  readonly imported_at: string;
  readonly row_count: number | null;
}

const normalizeText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const normalizeResourceName = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toUpperCase();

const getResourceNameSuffix = (value: string): string => {
  const parts = value.split("_");
  return normalizeResourceName(parts[parts.length - 1] ?? value);
};

const isProgressPercent = (value: unknown): value is ProgressPercent =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= 100;

const toPriority = (value: number | null): Task["priority"] => {
  if (value === 1 || value === 2 || value === 3) return value;
  return 3;
};

const toErrorResponse = (error: string, status: number): NextResponse =>
  NextResponse.json({ ok: false, error }, { status });

const sanitizeAccounts = (
  accounts: readonly AuthAccount[],
  visibleProfileIds: ReadonlySet<string>
): AuthAccount[] =>
  accounts
    .filter((account) => visibleProfileIds.has(account.id))
    .map((account) => ({
      id: account.id,
      username: account.username,
      email: account.email,
      employeeCode: account.employeeCode,
      fullName: account.fullName,
      resourceName: account.resourceName,
      role: account.role,
      orgGroup: account.orgGroup,
      subgroup: account.subgroup,
      orgRole: account.orgRole,
      orgTitle: account.orgTitle,
      orgAssignment: account.orgAssignment,
      managedGroups: account.managedGroups,
      managedSubgroups: account.managedSubgroups,
      isPlaceholder: account.isPlaceholder,
      canLogin: account.canLogin,
      mustChangePassword: account.mustChangePassword
    }));

const listTasks = async (
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>
): Promise<{ readonly data: DbTask[]; readonly error: string | null }> => {
  const rows: DbTask[] = [];
  let page = 0;
  let supportsLeaderColumns = true;

  while (true) {
    const from = page * DB_PAGE_SIZE;
    const to = from + DB_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("tasks")
      .select(
        [
          ...BASE_TASK_COLUMNS,
          ...(supportsLeaderColumns ? LEADER_TASK_COLUMNS : [])
        ].join(", ")
      )
      .order("stt", { ascending: true })
      .range(from, to);

    if (
      error &&
      supportsLeaderColumns &&
      LEADER_TASK_COLUMNS.some((column) =>
        error.message.toLowerCase().includes(column)
      )
    ) {
      supportsLeaderColumns = false;
      rows.length = 0;
      page = 0;
      continue;
    }
    if (error) return { data: [], error: error.message };

    rows.push(...((data ?? []) as unknown as DbTask[]));
    if (!data || data.length < DB_PAGE_SIZE) break;
    page += 1;
  }

  return { data: rows, error: null };
};

const listProgress = async (
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>
): Promise<{ readonly data: DbProgress[]; readonly error: string | null }> => {
  const rows: DbProgress[] = [];
  let page = 0;
  let columnMode: "full" | "photos" | "legacy" = "full";

  while (true) {
    const from = page * DB_PAGE_SIZE;
    const to = from + DB_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("progress")
      .select(
        columnMode === "full"
          ? "task_id, user_id, report_date, percent, note, photo_path, photo_paths, submitted_at, submitted_by"
          : columnMode === "photos"
            ? "task_id, user_id, report_date, percent, note, photo_path, photo_paths, submitted_at"
            : "task_id, user_id, report_date, percent, note, photo_path, submitted_at"
      )
      .order("submitted_at", { ascending: false })
      .range(from, to);

    if (error && columnMode === "full" && error.message.toLowerCase().includes("submitted_by")) {
      columnMode = "photos";
      rows.length = 0;
      page = 0;
      continue;
    }
    if (error && columnMode !== "legacy" && error.message.toLowerCase().includes("photo_paths")) {
      columnMode = "legacy";
      rows.length = 0;
      page = 0;
      continue;
    }
    if (error) return { data: [], error: error.message };

    rows.push(...((data ?? []) as unknown as DbProgress[]));
    if (!data || data.length < DB_PAGE_SIZE) break;
    page += 1;
  }

  return { data: rows, error: null };
};

const findProfileByResourceName = (
  profiles: readonly Profile[],
  resourceName: string
): Profile | null => {
  const normalizedResource = normalizeResourceName(resourceName);
  const resourceSuffix = getResourceNameSuffix(resourceName);
  return (
    profiles.find((profile) => {
      const profileResource = normalizeResourceName(profile.resourceName);
      return (
        profileResource === normalizedResource ||
        profileResource === resourceSuffix ||
        normalizedResource.endsWith(`_${profileResource}`)
      );
    }) ?? null
  );
};

const createDbProfileMap = (
  dbProfiles: readonly DbProfile[],
  profiles: readonly Profile[]
): Map<string, string> => {
  const byUsername = new Map(
    profiles.map((profile) => [profile.username.toLowerCase(), profile])
  );
  const result = new Map<string, string>();

  dbProfiles.forEach((dbProfile) => {
    const byUser =
      dbProfile.username ? byUsername.get(dbProfile.username.toLowerCase()) : null;
    const byResource = findProfileByResourceName(
      profiles,
      normalizeText(dbProfile.resource_name)
    );
    const localProfile = byUser ?? byResource;
    if (localProfile) result.set(dbProfile.id, localProfile.id);
  });

  return result;
};

const toTask = (
  row: DbTask,
  index: number,
  profiles: readonly Profile[],
  dbProfileIdToLocalId: ReadonlyMap<string, string>
): Task => {
  const resourceName = normalizeText(row.resource_name);
  const assignedTo =
    (row.assigned_to ? dbProfileIdToLocalId.get(row.assigned_to) : null) ??
    findProfileByResourceName(profiles, resourceName)?.id ??
    null;
  const reporterId =
    (row.reporter_id ? dbProfileIdToLocalId.get(row.reporter_id) : null) ??
    assignedTo;

  return {
    id: row.id,
    stt: Number.isFinite(row.stt) ? Number(row.stt) : index + 1,
    taskName: normalizeText(row.task_name),
    wo: normalizeText(row.wo),
    tagname: normalizeText(row.tagname),
    nhom: normalizeText(row.nhom),
    donVi: normalizeText(row.don_vi),
    section: normalizeText(row.section),
    duration: normalizeText(row.duration),
    priority: toPriority(row.priority),
    startDate: normalizeText(row.start_date),
    finishDate: normalizeText(row.finish_date),
    resourceName,
    nhomTruong: normalizeText(row.nhom_truong),
    assignedTo,
    reporterId,
    taskSource: row.task_source === "ad_hoc" ? "ad_hoc" : "plan",
    progressMode: row.progress_mode === "binary" ? "binary" : "continuous",
    createdBy: row.created_by
      ? dbProfileIdToLocalId.get(row.created_by) ?? row.created_by
      : null,
    updatedBy: row.updated_by
      ? dbProfileIdToLocalId.get(row.updated_by) ?? row.updated_by
      : null,
    isCancelled: Boolean(row.is_cancelled),
    cancelReason: normalizeText(row.cancel_reason)
  };
};

const toProgressRecord = (
  row: DbProgress,
  dbProfileIdToLocalId: ReadonlyMap<string, string>
): ProgressRecord | null => {
  const taskId = normalizeText(row.task_id);
  const userId = normalizeText(row.user_id);
  const reportDate = normalizeText(row.report_date);

  if (!taskId || !userId || !reportDate || !isProgressPercent(row.percent)) {
    return null;
  }

  return {
    taskId,
    userId: dbProfileIdToLocalId.get(userId) ?? userId,
    reportDate,
    percent: row.percent,
    note: normalizeText(row.note),
    photoPath:
      (row.photo_paths ?? []).map(normalizeText).find(Boolean) ||
      normalizeText(row.photo_path) ||
      undefined,
    photoPaths: Array.from(
      new Set(
        [...(row.photo_paths ?? []), row.photo_path ?? ""]
          .map(normalizeText)
          .filter(Boolean)
      )
    ).slice(0, 5),
    submittedAt: normalizeText(row.submitted_at) || undefined,
    submittedBy: row.submitted_by
      ? dbProfileIdToLocalId.get(row.submitted_by) ?? row.submitted_by
      : undefined
  };
};

export const GET = async (request: Request): Promise<NextResponse> => {
  if (!isAllowedRequestOrigin(request)) {
    return toErrorResponse(forbiddenOriginMessage, 403);
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Chua cau hinh Supabase server env nen khong the xac minh phien va tai du lieu."
      },
      { status: 503 }
    );
  }

  const auth = await getAuthenticatedAccount(request, supabase);
  if (!auth.ok) return toErrorResponse(auth.error, auth.status);

  const [
    { data: dbProfiles, error: profilesError },
    tasksResult,
    progressResult,
    { data: latestBatch, error: batchError }
  ] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, resource_name, must_change_password, password_hash"),
      listTasks(supabase),
      listProgress(supabase),
      supabase
        .from("import_batches")
        .select("id, file_name, imported_at, row_count")
        .eq("status", "applied")
        .order("imported_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

  if (profilesError) {
    return NextResponse.json({ ok: false, error: profilesError.message }, { status: 500 });
  }
  if (tasksResult.error) {
    return NextResponse.json({ ok: false, error: tasksResult.error }, { status: 500 });
  }
  if (progressResult.error) {
    return NextResponse.json({ ok: false, error: progressResult.error }, { status: 500 });
  }
  if (batchError) {
    return NextResponse.json({ ok: false, error: batchError.message }, { status: 500 });
  }

  const typedDbProfiles = (dbProfiles ?? []) as DbProfile[];
  const accounts = applyAccountPasswordRequirements(
    createSeedAccounts(),
    typedDbProfiles
      .filter((profile) => Boolean(profile.username))
      .map((profile) => ({
        username: profile.username ?? "",
        mustChangePassword:
          Boolean(profile.must_change_password) || !normalizeText(profile.password_hash)
      }))
  );
  const profiles = createProfilesFromAccounts(accounts);
  const dbProfileIdToLocalId = createDbProfileMap(
    typedDbProfiles,
    profiles
  );
  const tasks = tasksResult.data.map((row, index) =>
    toTask(row, index, profiles, dbProfileIdToLocalId)
  );
  const progress = progressResult.data
    .map((row) => toProgressRecord(row, dbProfileIdToLocalId))
    .filter((record): record is ProgressRecord => Boolean(record));

  const data: AppData = {
    accounts,
    profiles,
    tasks,
    progress,
    dailySnapshots: [],
    offlineQueue: [],
    activeUserId: null,
    planVersion: latestBatch
      ? {
          batchId: (latestBatch as DbImportBatch).id,
          fileName: (latestBatch as DbImportBatch).file_name,
          importedAt: (latestBatch as DbImportBatch).imported_at,
          rowCount: (latestBatch as DbImportBatch).row_count ?? tasks.length
        }
      : undefined
  };
  const scopedData = getScopedAppData(
    {
      ...data,
      activeUserId: auth.account.id
    },
    auth.account
  );
  const visibleProfileIds = new Set(scopedData.profiles.map((profile) => profile.id));
  const responseData: AppData = {
    ...scopedData,
    accounts: sanitizeAccounts(accounts, visibleProfileIds),
    activeUserId: auth.account.id
  };

  return NextResponse.json({
    ok: true,
    data: responseData,
    meta: {
      source: "supabase",
      taskCount: responseData.tasks.length,
      progressCount: responseData.progress.length
    }
  });
};
