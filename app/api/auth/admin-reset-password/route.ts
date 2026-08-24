import { NextResponse } from "next/server";
import { DEFAULT_INITIAL_PASSWORD, getLoginUsername } from "@/lib/accounts";
import { forbiddenOriginMessage, isAllowedRequestOrigin } from "@/lib/api/security";
import { getAuthenticatedAdmin } from "@/lib/api/session";
import { hashPassword } from "@/lib/password";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface ResetPasswordBody {
  readonly username?: string;
}

interface ResetTargetProfile {
  readonly id: string;
  readonly username: string | null;
  readonly is_active: boolean | null;
}

const errorResponse = (error: string, status: number): NextResponse =>
  NextResponse.json({ ok: false, error }, { status });

const isMissingPasswordColumn = (message: string): boolean =>
  message.toLowerCase().includes("password_hash") ||
  message.toLowerCase().includes("must_change_password");

export const POST = async (request: Request): Promise<NextResponse> => {
  if (!isAllowedRequestOrigin(request)) {
    return errorResponse(forbiddenOriginMessage, 403);
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return errorResponse("Chua cau hinh Supabase server.", 503);
  }

  const auth = await getAuthenticatedAdmin(request, supabase);
  if (!auth.ok) return errorResponse(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as ResetPasswordBody | null;
  const username = getLoginUsername(body?.username ?? "");
  if (!username) {
    return errorResponse("Thieu tai khoan can dat lai mat khau.", 400);
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, is_active")
    .eq("username", username)
    .maybeSingle();

  if (error) return errorResponse(error.message, 500);

  const profile = data as ResetTargetProfile | null;
  if (!profile?.id || !profile.username) {
    return errorResponse("Khong tim thay tai khoan.", 404);
  }
  if (profile.is_active === false) {
    return errorResponse("Tai khoan chua duoc kich hoat.", 400);
  }

  const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
    profile.id,
    { password: DEFAULT_INITIAL_PASSWORD }
  );
  if (authUpdateError) {
    return errorResponse(`Khong dat lai duoc tai khoan Auth: ${authUpdateError.message}`, 500);
  }

  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({
      password_hash: hashPassword(DEFAULT_INITIAL_PASSWORD),
      must_change_password: true
    })
    .eq("id", profile.id);

  if (profileUpdateError) {
    return errorResponse(
      isMissingPasswordColumn(profileUpdateError.message)
        ? "Chua apply migration profiles.password_hash tren Supabase."
        : profileUpdateError.message,
      isMissingPasswordColumn(profileUpdateError.message) ? 503 : 500
    );
  }

  return NextResponse.json({
    ok: true,
    username: getLoginUsername(profile.username),
    mustChangePassword: true
  });
};
