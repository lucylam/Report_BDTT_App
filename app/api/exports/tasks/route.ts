import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { loadBdttSnapshot } from "@/lib/api/bdttSnapshot";
import { getAuthenticatedAccount } from "@/lib/api/session";
import { buildExportRows } from "@/lib/excel/exporter";
import { getScopedAppData } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export const GET = async (request: Request): Promise<NextResponse> => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Chưa cấu hình Supabase cho xuất Excel." }, { status: 503 });
  const auth = await getAuthenticatedAccount(request, supabase);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const snapshot = await loadBdttSnapshot(supabase);
    const scoped = getScopedAppData(snapshot, { ...auth.account, id: auth.profile.id });
    const rows = buildExportRows(scoped);
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DATA");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx", compression: true }) as Buffer;
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="bdtt-${auth.account.username}-${date}.xlsx"`,
        "cache-control": "private, no-store"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không xuất được Excel." },
      { status: 500 }
    );
  }
};
