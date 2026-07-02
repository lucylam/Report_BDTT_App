import { NextResponse } from "next/server";
import { createProfilesFromAccounts, createSeedAccounts } from "@/lib/accounts";
import { forbiddenOriginMessage, isAllowedRequestOrigin } from "@/lib/api/security";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AppData, ProgressPercent, ProgressRecord, Profile, Task } from "@/types/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DB_PAGE_SIZE = 1000;

interface DbProfile {
  readonly id: string;
  readonly username: string | null;
  readonly resource_name: string | null;
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
  readonly submitted_at: string | null;
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

const listTasks = async (
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>
): Promise<{ readonly data: DbTask[]; readonly error: string | null }> => {
  const rows: DbTask[] = [];
  let page = 0;

  while (true) {
    const from = page * DB_PAGE_SIZE;
    const to = from + DB_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("tasks")
      .select(
        [
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
        ].join(", ")
      )
      .order("stt", { ascending: true })
      .range(from, to);

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

  while (true) {
    const from = page * DB_PAGE_SIZE;
    const to = from + DB_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("progress")
      .select("task_id, user_id, report_date, percent, note, photo_path, submitted_at")
      .order("submitted_at", { ascending: false })
      .range(from, to);

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
    photoPath: normalizeText(row.photo_path) || undefined,
    submittedAt: normalizeText(row.submitted_at) || undefined
  };
};

export const GET = async (request: Request): Promise<NextResponse> => {
  if (!isAllowedRequestOrigin(request)) {
    return NextResponse.json({ error: forbiddenOriginMessage }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Chua cau hinh Supabase server env. App se tiep tuc dung cache local."
      },
      { status: 503 }
    );
  }

  const [{ data: dbProfiles, error: profilesError }, tasksResult, progressResult] =
    await Promise.all([
      supabase.from("profiles").select("id, username, resource_name"),
      listTasks(supabase),
      listProgress(supabase)
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

  const accounts = createSeedAccounts();
  const profiles = createProfilesFromAccounts(accounts);
  const dbProfileIdToLocalId = createDbProfileMap(
    (dbProfiles ?? []) as DbProfile[],
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
    activeUserId: null
  };

  return NextResponse.json({
    ok: true,
    data,
    meta: {
      source: "supabase",
      taskCount: tasks.length,
      progressCount: progress.length
    }
  });
};
