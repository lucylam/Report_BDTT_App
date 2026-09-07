import { NextResponse } from "next/server";
import { forbiddenOriginMessage, isAllowedRequestOrigin } from "@/lib/api/security";
import { getAuthenticatedDataAdmin } from "@/lib/api/session";
import { GROUP_IMPORT_MIGRATION, GROUP_IMPORT_SHEET, planGroupImport, resolveGroupImportState, type GroupImportState } from "@/lib/google/groupImport";
import { buildGroupImportTemplate } from "@/lib/google/groupImportTemplate";
import { computeSheetChecksum, readDataSheetValues } from "@/lib/google/sheets";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export const GET = async (request: Request): Promise<Response> => {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return errorResponse("Chưa cấu hình Supabase server.", 503);
    const auth = await getAuthenticatedDataAdmin(request, supabase);
    if (!auth.ok) return errorResponse(auth.error, auth.status);
    const { data, error } = await supabase.rpc("get_bdtt_thao_lap_import_state");
    if (error) return databaseError(error);
    const state = resolveGroupImportState(data as GroupImportState);
    if (state.trialActive) return errorResponse("Hãy kết thúc Demo Mode trước khi tải mẫu import nhóm.", 409);
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(buildGroupImportTemplate(state)), GROUP_IMPORT_SHEET);
    return new Response(new Uint8Array(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer), {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": 'attachment; filename="import-thao-lap.xlsx"',
        "cache-control": "no-store"
      }
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Không tạo được mẫu import nhóm.", 500);
  }
};

const errorResponse = (error: string, status: number): NextResponse => NextResponse.json({ ok: false, error }, { status });
const databaseError = (error: { readonly code?: string; readonly message: string }): NextResponse => {
  if (["PGRST202", "42883"].includes(error.code ?? "")) {
    return errorResponse(`Database chưa có chức năng import nhóm. Cần áp dụng migration ${GROUP_IMPORT_MIGRATION} trên môi trường được phép.`, 503);
  }
  return errorResponse(error.message, error.code === "40001" ? 409 : error.code === "42501" ? 403 : 500);
};

export const POST = async (request: Request): Promise<NextResponse> => {
  if (!isAllowedRequestOrigin(request)) return errorResponse(forbiddenOriginMessage, 403);
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return errorResponse("Chưa cấu hình Supabase server.", 503);
    const auth = await getAuthenticatedDataAdmin(request, supabase);
    if (!auth.ok) return errorResponse(auth.error, auth.status);
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || !("action" in body) || !["preview", "apply"].includes(String(body.action))) {
      return errorResponse("Thao tác import không hợp lệ.", 400);
    }
    const action = body.action;
    const sheetName = process.env.GOOGLE_SHEETS_THAO_LAP_IMPORT_SHEET_NAME?.trim() || GROUP_IMPORT_SHEET;
    const { data: stateData, error: stateError } = await supabase.rpc("get_bdtt_thao_lap_import_state");
    if (stateError) return databaseError(stateError);
    const state = resolveGroupImportState(stateData as GroupImportState);
    if (state.trialActive) return errorResponse("Hãy kết thúc Demo Mode trước khi import nhóm.", 409);
    const values = await readDataSheetValues("A2:ZZ10003", { sheetName, unformatted: true });
    const { preview, rows } = planGroupImport(values, state, sheetName);
    const checksum = computeSheetChecksum([[sheetName, state.version], ...values]);
    if (action === "preview") return NextResponse.json({ ok: true, ...preview, checksum });
    if (!("expectedChecksum" in body) || body.expectedChecksum !== checksum) {
      return errorResponse("Sheet hoặc dữ liệu web đã thay đổi. Hãy đọc và xem trước lại trước khi import.", 409);
    }
    if (preview.hasBlockingErrors) return errorResponse("Sheet còn lỗi. Hãy sửa các dòng được chỉ ra rồi xem trước lại.", 409);
    if (!rows.length) return NextResponse.json({ ok: true, ...preview, applied: { added: 0, updated: 0, progress: 0, cancelled: 0 } });
    const { data: applied, error } = await supabase.rpc("import_bdtt_thao_lap", {
      p_actor_id: auth.profile.id, p_checksum: checksum, p_expected_version: state.version, p_sheet_name: sheetName, p_rows: rows
    });
    if (error) return databaseError(error);
    return NextResponse.json({ ok: true, ...preview, applied });
  } catch (error) {
    console.error("[api/google-sheets/import-thao-lap]", error);
    return errorResponse(error instanceof Error ? error.message : "Không import được dữ liệu nhóm.", 500);
  }
};
