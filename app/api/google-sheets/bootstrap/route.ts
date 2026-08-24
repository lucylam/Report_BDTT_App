import { NextResponse } from "next/server";
import { forbiddenOriginMessage, isAllowedRequestOrigin } from "@/lib/api/security";
import { getAuthenticatedDataAdmin } from "@/lib/api/session";
import { getActiveBdttTrialRun } from "@/lib/api/demoMode";
import { parseBootstrapSheet } from "@/lib/google/bootstrap";
import { computeSheetChecksum, readDataSheetValues } from "@/lib/google/sheets";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createTaskReporterPeople,
  resolveTaskReporterId
} from "@/lib/taskReporter";

export const runtime = "nodejs";
export const maxDuration = 60;

interface BootstrapBody {
  readonly action?: "preview" | "apply";
  readonly expectedChecksum?: string;
}

interface DbProfile {
  readonly id: string;
  readonly username: string | null;
  readonly resource_name: string | null;
  readonly role: string | null;
  readonly org_group: string | null;
  readonly subgroup: string | null;
  readonly org_role: string | null;
}

const errorResponse = (error: string, status: number): NextResponse =>
  NextResponse.json({ ok: false, error }, { status });

export const POST = async (request: Request): Promise<NextResponse> => {
  if (!isAllowedRequestOrigin(request)) return errorResponse(forbiddenOriginMessage, 403);
  const supabase = await createServerSupabaseClient();
  if (!supabase) return errorResponse("Chưa cấu hình Supabase server cho khởi tạo DATA.", 503);
  const auth = await getAuthenticatedDataAdmin(request, supabase);
  if (!auth.ok) return errorResponse(auth.error, auth.status);
  if (await getActiveBdttTrialRun(supabase)) {
    return errorResponse("Hãy kết thúc Demo Mode trước khi khởi tạo lại dữ liệu.", 409);
  }

  const body = (await request.json().catch(() => ({}))) as BootstrapBody;
  const action = body.action ?? "preview";
  if (action !== "preview" && action !== "apply") {
    return errorResponse("Thao tác khởi tạo không hợp lệ.", 400);
  }

  let checksumForLog = "unavailable";
  let rowCountForLog = 0;
  try {
    const [{ count, error: countError }, profileResult, values] = await Promise.all([
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("task_source", "plan"),
      supabase
        .from("profiles")
        .select("id, username, resource_name, role, org_group, subgroup, org_role")
        .eq("is_active", true),
      readDataSheetValues("A2:AG")
    ]);
    if (countError) throw new Error(countError.message);
    if (profileResult.error) throw new Error(profileResult.error.message);
    if ((count ?? 0) > 0) {
      return NextResponse.json({
        ok: true,
        initialized: true,
        action,
        rowCount: count,
        message: "Database đã có kế hoạch. Chức năng khởi tạo từ Sheet đã được khóa."
      });
    }

    const dbProfiles = (profileResult.data ?? []) as DbProfile[];
    const reporterPeople = createTaskReporterPeople(dbProfiles);
    const preview = parseBootstrapSheet(
      values,
      dbProfiles.map((profile) => ({
        id: profile.id,
        username: profile.username ?? "",
        resourceName: profile.resource_name ?? ""
      }))
    );
    const checksum = computeSheetChecksum(values.slice(1));
    checksumForLog = checksum;
    rowCountForLog = preview.rowCount;
    const hasBlockingErrors =
      preview.rowCount === 0 ||
      preview.missingColumns.length > 0 ||
      preview.duplicateKeys.length > 0 ||
      preview.unmappedResourceNames.length > 0 ||
      preview.incompleteRows.length > 0;

    if (action === "preview") {
      return NextResponse.json({
        ok: true,
        initialized: false,
        checksum,
        rowCount: preview.rowCount,
        duplicateKeys: preview.duplicateKeys,
        unmappedResourceNames: preview.unmappedResourceNames,
        missingColumns: preview.missingColumns,
        incompleteRows: preview.incompleteRows,
        progressModeHeaderMissing: preview.progressModeHeaderMissing,
        hasBlockingErrors,
        sample: preview.tasks.slice(0, 5)
      });
    }

    if (hasBlockingErrors) {
      return errorResponse("Google Sheet còn lỗi bắt buộc. Hãy sửa trước khi khởi tạo.", 409);
    }
    if (!body.expectedChecksum || body.expectedChecksum !== checksum) {
      return errorResponse("Google Sheet đã thay đổi. Hãy xem trước lại trước khi khởi tạo.", 409);
    }

    const rows = preview.tasks.map((task) => ({
      stt: task.stt,
      wo: task.wo,
      tagname: task.tagname,
      task_name: task.taskName,
      nhom: task.nhom,
      don_vi: task.donVi,
      section: task.section,
      duration: task.duration,
      priority: task.priority,
      start_date: task.startDate || null,
      finish_date: task.finishDate || null,
      resource_name: task.resourceName,
      nhom_truong: task.nhomTruong,
      assigned_to: task.assignedTo,
      reporter_id: resolveTaskReporterId(task.assignedTo, reporterPeople),
      progress_mode: task.progressMode
    }));
    const { error: bootstrapError } = await supabase.rpc("bootstrap_bdtt_plan", {
      p_actor_id: auth.profile.id,
      p_checksum: checksum,
      p_rows: rows
    });
    if (bootstrapError) throw new Error(bootstrapError.message);

    return NextResponse.json({
      ok: true,
      initialized: true,
      action,
      checksum,
      rowCount: preview.rowCount,
      completedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("[api/google-sheets/bootstrap]", error);
    const message = error instanceof Error
      ? error.message
      : "Không khởi tạo được dữ liệu từ Google Sheet.";
    if (action === "apply") {
      await supabase.from("google_sheet_sync_runs").insert({
        run_type: "bootstrap",
        status: "failed",
        checksum: checksumForLog,
        actor_id: auth.profile.id,
        row_count: rowCountForLog,
        error_message: message,
        completed_at: new Date().toISOString()
      }).then(() => undefined, () => undefined);
    }
    return errorResponse(message, 500);
  }
};
