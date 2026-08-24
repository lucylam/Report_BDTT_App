import { NextResponse } from "next/server";
import { forbiddenOriginMessage, isAllowedRequestOrigin } from "@/lib/api/security";
import { loadBdttSnapshot } from "@/lib/api/bdttSnapshot";
import { getAuthenticatedDataAdmin } from "@/lib/api/session";
import { getActiveBdttTrialRun } from "@/lib/api/demoMode";
import { buildFullDataSheetRangeValues } from "@/lib/excel/exporter";
import {
  computeSheetChecksum,
  readDataSheetValues,
  syncFullDataSheetValues
} from "@/lib/google/sheets";
import { compareSheetSnapshot } from "@/lib/google/snapshot";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

interface SyncBody {
  readonly action?: "preview" | "apply";
  readonly expectedChecksum?: string;
}

const errorResponse = (error: string, status: number): NextResponse =>
  NextResponse.json({ ok: false, error }, { status });

export const POST = async (request: Request): Promise<NextResponse> => {
  if (!isAllowedRequestOrigin(request)) {
    return errorResponse(forbiddenOriginMessage, 403);
  }
  const supabase = await createServerSupabaseClient();
  if (!supabase) return errorResponse("Chưa cấu hình Supabase server cho đồng bộ DATA.", 503);
  const auth = await getAuthenticatedDataAdmin(request, supabase);
  if (!auth.ok) return errorResponse(auth.error, auth.status);
  if (await getActiveBdttTrialRun(supabase)) {
    return errorResponse("Đồng bộ Google Sheet tạm khóa trong Demo Mode.", 409);
  }

  const body = (await request.json().catch(() => ({}))) as SyncBody;
  const action = body.action ?? "preview";
  if (action !== "preview" && action !== "apply") {
    return errorResponse("Thao tác đồng bộ không hợp lệ.", 400);
  }

  try {
    const [data, sheetRows, latestSuccessResult, latestRunResult] = await Promise.all([
      loadBdttSnapshot(supabase),
      readDataSheetValues("A3:AG"),
      supabase
        .from("google_sheet_sync_runs")
        .select("checksum, completed_at, row_count")
        .eq("run_type", "outbound")
        .eq("status", "success")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("google_sheet_sync_runs")
        .select("status, error_message, created_at")
        .eq("run_type", "outbound")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);
    if (latestSuccessResult.error) throw new Error(latestSuccessResult.error.message);
    if (latestRunResult.error) throw new Error(latestRunResult.error.message);
    if (data.tasks.length === 0) {
      return errorResponse("Database chưa có task. Hãy khởi tạo từ Google Sheet trước.", 409);
    }

    const rangeValues = buildFullDataSheetRangeValues(data, sheetRows.length);
    const checksum = computeSheetChecksum(rangeValues.values);
    const stats = compareSheetSnapshot(
      rangeValues.values,
      sheetRows,
      data.tasks.filter((task) => task.taskSource === "ad_hoc").length
    );
    const lastSuccess = latestSuccessResult.data as {
      checksum?: string;
      completed_at?: string;
      row_count?: number;
    } | null;
    const latestRun = latestRunResult.data as {
      status?: string;
      error_message?: string;
      created_at?: string;
    } | null;

    if (action === "preview") {
      const latestRunAt = latestRun?.created_at ?? "";
      const status =
        latestRun?.status === "failed" && latestRunAt > (lastSuccess?.completed_at ?? "")
          ? "failed"
          : lastSuccess?.checksum === checksum
            ? "synced"
            : lastSuccess
              ? "pending"
              : "never";
      return NextResponse.json({
        ok: true,
        action,
        checksum,
        stats,
        range: rangeValues.clearRange,
        status,
        lastSyncedAt: lastSuccess?.completed_at,
        lastError: status === "failed" ? latestRun?.error_message : undefined
      });
    }

    if (!body.expectedChecksum || body.expectedChecksum !== checksum) {
      return errorResponse(
        "Dữ liệu đã thay đổi sau lúc xem trước. Hãy tải lại preview trước khi đồng bộ.",
        409
      );
    }

    try {
      const result = await syncFullDataSheetValues(rangeValues.values, {
        clearRange: rangeValues.clearRange,
        updateRange: rangeValues.range
      });
      const completedAt = new Date().toISOString();
      const { error: logError } = await supabase.from("google_sheet_sync_runs").insert({
        run_type: "outbound",
        status: "success",
        checksum,
        actor_id: auth.profile.id,
        row_count: rangeValues.values.length,
        stats,
        completed_at: completedAt
      });
      if (logError) throw new Error(logError.message);
      return NextResponse.json({
        ok: true,
        action,
        checksum,
        stats,
        range: rangeValues.clearRange,
        completedAt,
        ...result
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không đồng bộ được Google Sheet.";
      await supabase.from("google_sheet_sync_runs").insert({
        run_type: "outbound",
        status: "failed",
        checksum,
        actor_id: auth.profile.id,
        row_count: rangeValues.values.length,
        stats,
        error_message: message,
        completed_at: new Date().toISOString()
      });
      throw error;
    }
  } catch (error) {
    console.error("[api/google-sheets/sync-data]", error);
    return errorResponse(
      error instanceof Error ? error.message : "Không đồng bộ được Google Sheet DATA.",
      500
    );
  }
};
