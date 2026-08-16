import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getAuthenticatedProfile } from "@/lib/api/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export const GET = async (request: Request): Promise<NextResponse> => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Chưa cấu hình máy chủ." }, { status: 503 });
  const auth = await getAuthenticatedProfile(request, supabase);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const buffer = await readFile(path.join(process.cwd(), "docs", "BDTT_User_Guide_Mobile.pptx"));
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "content-disposition": "attachment; filename=BDTT_User_Guide_Mobile.pptx",
        "cache-control": "private, no-store"
      }
    });
  } catch {
    return NextResponse.json({ error: "Không tìm thấy tài liệu hướng dẫn." }, { status: 404 });
  }
};
