import { NextResponse } from "next/server";
import { getActiveBdttTrialRun } from "@/lib/api/demoMode";
import { getAuthenticatedAccount, getAuthenticatedDataAdmin } from "@/lib/api/session";
import { forbiddenOriginMessage, isAllowedRequestOrigin } from "@/lib/api/security";
import { TASK_PHOTOS_BUCKET } from "@/lib/api/photoStorage";
import { getCurrentReportDate } from "@/lib/date";
import {
  createDemoProgressRows,
  DEMO_PROGRESS_BATCH_SIZE,
  DEMO_PROGRESS_NOTE,
  type DemoProgressTaskCandidate,
  pickDemoProgressTasks
} from "@/lib/demoProgress";
import { canGenerateDemoProgress, isDataAdminAccount } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESET_CONFIRMATION = "XOA DU LIEU THU";
const STORAGE_PAGE_SIZE = 1000;
const DB_PAGE_SIZE = 1000;

interface DemoModeBody {
  readonly name?: string;
  readonly confirmation?: string;
  readonly reportDate?: string;
}

interface DbDemoTask {
  readonly id: string;
  readonly assigned_to: string | null;
  readonly reporter_id: string | null;
  readonly don_vi: string | null;
  readonly nhom_truong: string | null;
  readonly priority: number | null;
  readonly start_date: string | null;
  readonly finish_date: string | null;
  readonly tagname: string | null;
  readonly progress_mode: string | null;
  readonly is_cancelled: boolean | null;
}

interface DbGeneratedProgress {
  readonly task_id: string;
  readonly report_date: string;
}

const text = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const errorResponse = (error: string, status: number): NextResponse =>
  NextResponse.json({ ok: false, error }, { status });

const isValidReportDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const listDemoTaskCandidates = async (
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>
): Promise<DemoProgressTaskCandidate[]> => {
  const rows: DbDemoTask[] = [];
  let page = 0;
  while (true) {
    const from = page * DB_PAGE_SIZE;
    const to = from + DB_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("tasks")
      .select(
        "id, assigned_to, reporter_id, don_vi, nhom_truong, priority, start_date, finish_date, tagname, progress_mode, is_cancelled"
      )
      .is("trial_run_id", null)
      .eq("is_cancelled", false)
      .order("stt", { ascending: true })
      .range(from, to);
    if (error) throw new Error(error.message);
    const pageRows = (data ?? []) as unknown as DbDemoTask[];
    rows.push(...pageRows);
    if (pageRows.length < DB_PAGE_SIZE) break;
    page += 1;
  }

  return rows.map((row) => ({
    id: row.id,
    assignedTo: row.assigned_to,
    reporterId: row.reporter_id,
    donVi: text(row.don_vi),
    nhomTruong: text(row.nhom_truong),
    priority: Number(row.priority) || 2,
    startDate: text(row.start_date),
    finishDate: text(row.finish_date),
    tagname: text(row.tagname),
    progressMode: row.progress_mode === "binary" ? "binary" : "continuous",
    isCancelled: Boolean(row.is_cancelled)
  }));
};

const listGeneratedProgress = async (
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  trialRunId: string
): Promise<DbGeneratedProgress[]> => {
  const rows: DbGeneratedProgress[] = [];
  let page = 0;
  while (true) {
    const from = page * DB_PAGE_SIZE;
    const to = from + DB_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("progress")
      .select("task_id, report_date")
      .eq("trial_run_id", trialRunId)
      .eq("note", DEMO_PROGRESS_NOTE)
      .range(from, to);
    if (error) throw new Error(error.message);
    const pageRows = (data ?? []) as unknown as DbGeneratedProgress[];
    rows.push(...pageRows);
    if (pageRows.length < DB_PAGE_SIZE) break;
    page += 1;
  }
  return rows;
};

const listTrialStoragePaths = async (
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  trialRunId: string
): Promise<string[]> => {
  const files: string[] = [];

  const visit = async (prefix: string): Promise<void> => {
    let offset = 0;
    while (true) {
      const { data, error } = await supabase.storage
        .from(TASK_PHOTOS_BUCKET)
        .list(prefix, {
          limit: STORAGE_PAGE_SIZE,
          offset,
          sortBy: { column: "name", order: "asc" }
        });
      if (error) throw new Error(error.message);
      const items = data ?? [];
      for (const item of items) {
        const itemPath = `${prefix}/${item.name}`;
        if (item.id) {
          files.push(itemPath);
        } else {
          await visit(itemPath);
        }
      }
      if (items.length < STORAGE_PAGE_SIZE) break;
      offset += STORAGE_PAGE_SIZE;
    }
  };

  await visit(`trials/${trialRunId}`);
  return files;
};

const getPreview = async (
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  trialRunId: string
): Promise<Record<string, number>> => {
  const [tasks, taskChanges, progress, generatedProgress, dataIssues, abnormalities, notifications, files] =
    await Promise.all([
      supabase.from("tasks").select("id", { count: "exact", head: true }).eq("trial_run_id", trialRunId),
      supabase.from("bdtt_trial_task_backups").select("task_id", { count: "exact", head: true }).eq("trial_run_id", trialRunId),
      supabase.from("progress").select("id", { count: "exact", head: true }).eq("trial_run_id", trialRunId),
      supabase.from("progress").select("id", { count: "exact", head: true }).eq("trial_run_id", trialRunId).eq("note", DEMO_PROGRESS_NOTE),
      supabase.from("data_issue_reports").select("id", { count: "exact", head: true }).eq("trial_run_id", trialRunId),
      supabase.from("bdtt_abnormalities").select("id", { count: "exact", head: true }).eq("trial_run_id", trialRunId),
      supabase.from("app_notifications").select("id", { count: "exact", head: true }).eq("trial_run_id", trialRunId),
      listTrialStoragePaths(supabase, trialRunId)
    ]);
  const firstError = [tasks, taskChanges, progress, generatedProgress, dataIssues, abnormalities, notifications]
    .map((result) => result.error)
    .find(Boolean);
  if (firstError) throw new Error(firstError.message);
  return {
    tasks: tasks.count ?? 0,
    taskChanges: taskChanges.count ?? 0,
    progress: progress.count ?? 0,
    generatedProgress: generatedProgress.count ?? 0,
    dataIssues: dataIssues.count ?? 0,
    abnormalities: abnormalities.count ?? 0,
    notifications: notifications.count ?? 0,
    photos: files.length
  };
};

export const PUT = async (request: Request): Promise<NextResponse> => {
  if (!isAllowedRequestOrigin(request)) return errorResponse(forbiddenOriginMessage, 403);
  const supabase = await createServerSupabaseClient();
  if (!supabase) return errorResponse("Chưa cấu hình Supabase cho Demo Mode.", 503);
  const auth = await getAuthenticatedAccount(request, supabase);
  if (!auth.ok) return errorResponse(auth.error, auth.status);
  if (!canGenerateDemoProgress(auth.account)) {
    return errorResponse("Chỉ tài khoản giám sát phạm vi toàn tổ mới được tạo báo cáo demo.", 403);
  }

  const body = (await request.json().catch(() => ({}))) as DemoModeBody;
  const reportDate = text(body.reportDate) || getCurrentReportDate();
  if (!isValidReportDate(reportDate)) {
    return errorResponse("Ngày báo cáo demo không hợp lệ.", 400);
  }

  try {
    const run = await getActiveBdttTrialRun(supabase);
    if (!run) return errorResponse("Hãy bật Demo Mode trước khi tạo báo cáo demo.", 409);
    const [tasks, existingRows] = await Promise.all([
      listDemoTaskCandidates(supabase),
      listGeneratedProgress(supabase, run.id)
    ]);
    const existingTaskIds = new Set(
      existingRows
        .filter((row) => row.report_date === reportDate)
        .map((row) => row.task_id)
    );
    const candidates = pickDemoProgressTasks(
      tasks,
      existingTaskIds,
      reportDate,
      DEMO_PROGRESS_BATCH_SIZE
    );
    const rows = createDemoProgressRows(candidates, {
      reportDate,
      trialRunId: run.id,
      submittedBy: auth.profile.id,
      submittedAt: new Date().toISOString(),
      sequenceOffset: existingRows.length
    });
    if (rows.length > 0) {
      const { error } = await supabase.from("progress").insert(rows);
      if (error) throw new Error(error.message);
    }
    return NextResponse.json({
      ok: true,
      created: rows.length,
      totalDemo: existingRows.length + rows.length,
      reportDate
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Không tạo được báo cáo demo.",
      500
    );
  }
};

export const PATCH = async (request: Request): Promise<NextResponse> => {
  if (!isAllowedRequestOrigin(request)) return errorResponse(forbiddenOriginMessage, 403);
  const supabase = await createServerSupabaseClient();
  if (!supabase) return errorResponse("Chưa cấu hình Supabase cho Demo Mode.", 503);
  const auth = await getAuthenticatedAccount(request, supabase);
  if (!auth.ok) return errorResponse(auth.error, auth.status);
  if (!canGenerateDemoProgress(auth.account)) {
    return errorResponse("Chỉ tài khoản giám sát phạm vi toàn tổ mới được xóa báo cáo demo.", 403);
  }

  try {
    const run = await getActiveBdttTrialRun(supabase);
    if (!run) return errorResponse("Demo Mode hiện không hoạt động.", 409);
    const { count, error } = await supabase
      .from("progress")
      .delete({ count: "exact" })
      .eq("trial_run_id", run.id)
      .eq("note", DEMO_PROGRESS_NOTE);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, cleared: count ?? 0, totalDemo: 0 });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Không xóa được báo cáo demo.",
      500
    );
  }
};

export const GET = async (request: Request): Promise<NextResponse> => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return errorResponse("Chưa cấu hình Supabase cho Demo Mode.", 503);
  const auth = await getAuthenticatedAccount(request, supabase);
  if (!auth.ok) return errorResponse(auth.error, auth.status);

  try {
    const run = await getActiveBdttTrialRun(supabase);
    const canManage = isDataAdminAccount(auth.account);
    const canGenerateProgress = canGenerateDemoProgress(auth.account);
    const includeDetails = new URL(request.url).searchParams.get("details") === "1";
    const preview = run && canGenerateProgress && includeDetails
      ? await getPreview(supabase, run.id)
      : undefined;
    return NextResponse.json({
      ok: true,
      mode: run ? "trial" : "live",
      run,
      canManage,
      canGenerateProgress,
      preview,
      resetConfirmation: canManage ? RESET_CONFIRMATION : undefined
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Không đọc được trạng thái Demo Mode.",
      500
    );
  }
};

export const POST = async (request: Request): Promise<NextResponse> => {
  if (!isAllowedRequestOrigin(request)) return errorResponse(forbiddenOriginMessage, 403);
  const supabase = await createServerSupabaseClient();
  if (!supabase) return errorResponse("Chưa cấu hình Supabase cho Demo Mode.", 503);
  const auth = await getAuthenticatedDataAdmin(request, supabase);
  if (!auth.ok) return errorResponse(auth.error, auth.status);

  const body = (await request.json().catch(() => ({}))) as DemoModeBody;
  const name = text(body.name) || "Dùng thử trước vận hành";
  if (name.length < 3 || name.length > 120) {
    return errorResponse("Tên đợt dùng thử cần từ 3 đến 120 ký tự.", 400);
  }

  try {
    const activeRun = await getActiveBdttTrialRun(supabase);
    if (activeRun) return errorResponse("Demo Mode đang được bật.", 409);
    const { data, error } = await supabase
      .from("bdtt_trial_runs")
      .insert({ name, created_by: auth.profile.id })
      .select("id, name, started_at, created_by")
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, mode: "trial", run: data }, { status: 201 });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Không bật được Demo Mode.",
      500
    );
  }
};

export const DELETE = async (request: Request): Promise<NextResponse> => {
  if (!isAllowedRequestOrigin(request)) return errorResponse(forbiddenOriginMessage, 403);
  const supabase = await createServerSupabaseClient();
  if (!supabase) return errorResponse("Chưa cấu hình Supabase cho Demo Mode.", 503);
  const auth = await getAuthenticatedDataAdmin(request, supabase);
  if (!auth.ok) return errorResponse(auth.error, auth.status);

  const body = (await request.json().catch(() => ({}))) as DemoModeBody;
  if (text(body.confirmation).toUpperCase() !== RESET_CONFIRMATION) {
    return errorResponse(`Nhập chính xác “${RESET_CONFIRMATION}” để xác nhận.`, 400);
  }

  try {
    const run = await getActiveBdttTrialRun(supabase);
    if (!run) return errorResponse("Demo Mode hiện không hoạt động.", 409);
    const storagePaths = await listTrialStoragePaths(supabase, run.id);
    for (let index = 0; index < storagePaths.length; index += 100) {
      const { error } = await supabase.storage
        .from(TASK_PHOTOS_BUCKET)
        .remove(storagePaths.slice(index, index + 100));
      if (error) throw new Error(`Không xóa được ảnh demo: ${error.message}`);
    }
    const { data, error } = await supabase.rpc("cleanup_bdtt_trial_run", {
      p_trial_run_id: run.id,
      p_ended_by: auth.profile.id
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({
      ok: true,
      mode: "live",
      removedPhotos: storagePaths.length,
      summary: data
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Không xóa được dữ liệu dùng thử.",
      500
    );
  }
};
