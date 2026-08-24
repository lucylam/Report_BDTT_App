import { NextResponse } from "next/server";
import { getActiveBdttTrialRun } from "@/lib/api/demoMode";
import { getAuthenticatedAccount, getAuthenticatedDataAdmin } from "@/lib/api/session";
import { forbiddenOriginMessage, isAllowedRequestOrigin } from "@/lib/api/security";
import { TASK_PHOTOS_BUCKET } from "@/lib/api/photoStorage";
import { isDataAdminAccount } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESET_CONFIRMATION = "XOA DU LIEU THU";
const STORAGE_PAGE_SIZE = 1000;

interface DemoModeBody {
  readonly name?: string;
  readonly confirmation?: string;
}

const text = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const errorResponse = (error: string, status: number): NextResponse =>
  NextResponse.json({ ok: false, error }, { status });

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
  const [tasks, taskChanges, progress, dataIssues, abnormalities, notifications, files] =
    await Promise.all([
      supabase.from("tasks").select("id", { count: "exact", head: true }).eq("trial_run_id", trialRunId),
      supabase.from("bdtt_trial_task_backups").select("task_id", { count: "exact", head: true }).eq("trial_run_id", trialRunId),
      supabase.from("progress").select("id", { count: "exact", head: true }).eq("trial_run_id", trialRunId),
      supabase.from("data_issue_reports").select("id", { count: "exact", head: true }).eq("trial_run_id", trialRunId),
      supabase.from("bdtt_abnormalities").select("id", { count: "exact", head: true }).eq("trial_run_id", trialRunId),
      supabase.from("app_notifications").select("id", { count: "exact", head: true }).eq("trial_run_id", trialRunId),
      listTrialStoragePaths(supabase, trialRunId)
    ]);
  const firstError = [tasks, taskChanges, progress, dataIssues, abnormalities, notifications]
    .map((result) => result.error)
    .find(Boolean);
  if (firstError) throw new Error(firstError.message);
  return {
    tasks: tasks.count ?? 0,
    taskChanges: taskChanges.count ?? 0,
    progress: progress.count ?? 0,
    dataIssues: dataIssues.count ?? 0,
    abnormalities: abnormalities.count ?? 0,
    notifications: notifications.count ?? 0,
    photos: files.length
  };
};

export const GET = async (request: Request): Promise<NextResponse> => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return errorResponse("Chưa cấu hình Supabase cho Demo Mode.", 503);
  const auth = await getAuthenticatedAccount(request, supabase);
  if (!auth.ok) return errorResponse(auth.error, auth.status);

  try {
    const run = await getActiveBdttTrialRun(supabase);
    const canManage = isDataAdminAccount(auth.account);
    const includeDetails = new URL(request.url).searchParams.get("details") === "1";
    const preview = run && canManage && includeDetails
      ? await getPreview(supabase, run.id)
      : undefined;
    return NextResponse.json({
      ok: true,
      mode: run ? "trial" : "live",
      run,
      canManage,
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
