import type { SupabaseClient } from "@supabase/supabase-js";
import { getActiveBdttTrialRun } from "@/lib/api/demoMode";
import {
  applyAccountProfileOverrides,
  createProfilesFromAccounts,
  createSeedAccounts,
  getLoginUsername
} from "@/lib/accounts";
import type { AppData, Profile, ProgressRecord, Task } from "@/types/domain";

const PAGE_SIZE = 1000;

interface DbProfile {
  readonly id: string;
  readonly username: string | null;
  readonly email: string | null;
  readonly employee_code: string | null;
  readonly full_name: string | null;
  readonly resource_name: string | null;
  readonly role: "admin" | "worker" | null;
  readonly must_change_password: boolean | null;
  readonly org_group?: string | null;
  readonly subgroup?: string | null;
  readonly org_role?: string | null;
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
  readonly reporter_id: string | null;
  readonly task_source: "plan" | "ad_hoc" | null;
  readonly progress_mode: "continuous" | "binary" | null;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly is_cancelled: boolean | null;
  readonly cancel_reason: string | null;
  readonly trial_run_id: string | null;
}

interface DbProgress {
  readonly task_id: string;
  readonly user_id: string;
  readonly report_date: string;
  readonly percent: number;
  readonly note: string | null;
  readonly photo_path: string | null;
  readonly photo_paths: string[] | null;
  readonly submitted_at: string | null;
  readonly submitted_by: string | null;
  readonly trial_run_id: string | null;
}

const text = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const listAll = async <TRow>(
  supabase: SupabaseClient,
  table: string,
  columns: string,
  orderColumn: string
): Promise<TRow[]> => {
  const rows: TRow[] = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order(orderColumn, { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as unknown as TRow[]));
    if (!data || data.length < PAGE_SIZE) break;
    page += 1;
  }
  return rows;
};

const listProfiles = async (supabase: SupabaseClient): Promise<DbProfile[]> => {
  const baseColumns =
    "id, username, email, employee_code, full_name, resource_name, role, must_change_password";
  try {
    return await listAll<DbProfile>(
      supabase,
      "profiles",
      `${baseColumns}, org_group, subgroup, org_role`,
      "username"
    );
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (!["org_group", "subgroup", "org_role"].some((column) => message.includes(column))) {
      throw error;
    }
    return listAll<DbProfile>(supabase, "profiles", baseColumns, "username");
  }
};

const buildProfiles = (rows: readonly DbProfile[]): Profile[] => {
  const seeded = createProfilesFromAccounts(
    applyAccountProfileOverrides(createSeedAccounts(), rows)
  );
  const byUsername = new Map(seeded.map((profile) => [profile.username, profile]));
  return rows.map((row) => {
    const username = getLoginUsername(text(row.username) || text(row.email));
    const seed = byUsername.get(username);
    if (seed) {
      return {
        ...seed,
        id: row.id,
        email: text(row.email) || seed.email,
        employeeCode: text(row.employee_code) || seed.employeeCode,
        fullName: text(row.full_name) || seed.fullName,
        resourceName: text(row.resource_name) || seed.resourceName,
        role: row.role ?? seed.role,
        mustChangePassword: Boolean(row.must_change_password)
      };
    }
    return {
      id: row.id,
      username,
      email: text(row.email),
      employeeCode: text(row.employee_code),
      fullName: text(row.full_name) || username,
      resourceName: text(row.resource_name),
      nhom: "",
      nhomTruong: "",
      role: row.role ?? "worker",
      orgGroup: "",
      subgroup: "",
      orgRole: "member",
      orgTitle: "Thành viên",
      orgAssignment: "",
      managedGroups: [],
      managedSubgroups: [],
      isPlaceholder: false,
      canLogin: true,
      mustChangePassword: Boolean(row.must_change_password)
    };
  });
};

const toPriority = (value: number | null): 1 | 2 | 3 =>
  value === 1 || value === 3 ? value : 2;

export const loadBdttSnapshot = async (supabase: SupabaseClient): Promise<AppData> => {
  const trialRun = await getActiveBdttTrialRun(supabase);
  const [profileRows, taskRows, progressRows, latestBatchResult] = await Promise.all([
    listProfiles(supabase),
    listAll<DbTask>(
      supabase,
      "tasks",
      "id, stt, wo, tagname, task_name, nhom, don_vi, section, duration, priority, start_date, finish_date, resource_name, nhom_truong, assigned_to, reporter_id, task_source, progress_mode, created_by, updated_by, is_cancelled, cancel_reason, trial_run_id",
      "stt"
    ).then((rows) =>
      rows.filter((row) => !row.trial_run_id || row.trial_run_id === trialRun?.id)
    ),
    listAll<DbProgress>(
      supabase,
      "progress",
      "task_id, user_id, report_date, percent, note, photo_path, photo_paths, submitted_at, submitted_by, trial_run_id",
      "report_date"
    ).then((rows) =>
      rows.filter((row) => !row.trial_run_id || row.trial_run_id === trialRun?.id)
    ),
    supabase
      .from("import_batches")
      .select("id, file_name, imported_at, row_count")
      .eq("status", "applied")
      .order("imported_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);
  if (latestBatchResult.error) throw new Error(latestBatchResult.error.message);

  const profiles = buildProfiles(profileRows);
  const tasks: Task[] = taskRows.map((row, index) => ({
    id: row.id,
    stt: row.stt ?? index + 1,
    taskName: text(row.task_name),
    wo: text(row.wo),
    tagname: text(row.tagname),
    nhom: text(row.nhom),
    donVi: text(row.don_vi),
    section: text(row.section),
    duration: text(row.duration),
    priority: toPriority(row.priority),
    startDate: text(row.start_date),
    finishDate: text(row.finish_date),
    resourceName: text(row.resource_name),
    nhomTruong: text(row.nhom_truong),
    assignedTo: row.assigned_to,
    reporterId: row.reporter_id ?? row.assigned_to,
    taskSource: row.task_source === "ad_hoc" ? "ad_hoc" : "plan",
    progressMode: row.progress_mode === "binary" ? "binary" : "continuous",
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    isCancelled: Boolean(row.is_cancelled),
    cancelReason: text(row.cancel_reason)
  }));
  const progress: ProgressRecord[] = progressRows.map((row) => ({
    taskId: row.task_id,
    userId: row.user_id,
    reportDate: row.report_date,
    percent: row.percent,
    note: text(row.note),
    photoPath: text(row.photo_path) || undefined,
    photoPaths: row.photo_paths ?? [],
    submittedAt: text(row.submitted_at) || undefined,
    submittedBy: text(row.submitted_by) || undefined
  }));
  const batch = latestBatchResult.data as {
    id: string;
    file_name: string;
    imported_at: string;
    row_count: number | null;
  } | null;

  return {
    accounts: [],
    profiles,
    tasks,
    progress,
    dailySnapshots: [],
    offlineQueue: [],
    activeUserId: null,
    planVersion: batch
      ? {
          batchId: batch.id,
          fileName: batch.file_name,
          importedAt: batch.imported_at,
          rowCount: batch.row_count ?? tasks.length
        }
      : undefined,
    trialRun: trialRun
      ? { id: trialRun.id, name: trialRun.name, startedAt: trialRun.startedAt }
      : undefined
  };
};
