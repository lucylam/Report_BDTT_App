import { NextResponse } from "next/server";
import { getAuthenticatedProfile } from "@/lib/api/session";
import {
  canAccessPhotoPath,
  isAbsolutePhotoUrl,
  isInlinePhotoDataUrl,
  SIGNED_PHOTO_URL_TTL_SECONDS,
  TASK_PHOTOS_BUCKET
} from "@/lib/api/photoStorage";
import { forbiddenOriginMessage, isAllowedRequestOrigin } from "@/lib/api/security";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const normalizeText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const toErrorResponse = (error: string, status: number): NextResponse =>
  NextResponse.json({ ok: false, error }, { status });

export const GET = async (request: Request): Promise<NextResponse> => {
  if (!isAllowedRequestOrigin(request)) {
    return toErrorResponse(forbiddenOriginMessage, 403);
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return toErrorResponse(
      "Chua cau hinh Supabase server env cho API xem anh.",
      503
    );
  }

  const auth = await getAuthenticatedProfile(request, supabase);
  if (!auth.ok) return toErrorResponse(auth.error, auth.status);

  const { searchParams } = new URL(request.url);
  const photoPath = normalizeText(searchParams.get("path"));
  if (!photoPath || isInlinePhotoDataUrl(photoPath) || isAbsolutePhotoUrl(photoPath)) {
    return toErrorResponse("Duong dan anh storage khong hop le.", 400);
  }
  if (!canAccessPhotoPath(auth.profile, photoPath)) {
    return toErrorResponse("Khong co quyen xem anh nay.", 403);
  }

  const { data, error } = await supabase.storage
    .from(TASK_PHOTOS_BUCKET)
    .createSignedUrl(photoPath, SIGNED_PHOTO_URL_TTL_SECONDS);

  if (error) {
    return toErrorResponse(error.message, 500);
  }

  return NextResponse.json({ ok: true, signedUrl: data.signedUrl });
};
