import { NextResponse } from "next/server";
import {
  AUTH_SESSION_COOKIE,
  getRequestCookie,
  verifyAuthSessionToken
} from "@/lib/authSession";
import { DEFAULT_INITIAL_PASSWORD } from "@/lib/accounts";
import { forbiddenOriginMessage, isAllowedRequestOrigin } from "@/lib/api/security";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface ChangePasswordBody {
  readonly nextPassword?: string;
}

interface DbPasswordProfile {
  readonly id: string;
  readonly username: string | null;
  readonly is_active: boolean | null;
  readonly password_hash: string | null;
}

const toErrorResponse = (error: string, status: number): NextResponse =>
  NextResponse.json({ ok: false, error }, { status });

const isMissingPasswordHashColumn = (error: { readonly message?: string }): boolean =>
  Boolean(error.message?.toLowerCase().includes("password_hash"));

export const POST = async (request: Request): Promise<NextResponse> => {
  if (!isAllowedRequestOrigin(request)) {
    return toErrorResponse(forbiddenOriginMessage, 403);
  }

  const session = await verifyAuthSessionToken(
    getRequestCookie(request, AUTH_SESSION_COOKIE)
  );
  if (!session) {
    return toErrorResponse("Phien dang nhap khong hop le. Vui long dang nhap lai.", 401);
  }

  const body = (await request.json()) as ChangePasswordBody;
  const nextPassword = typeof body.nextPassword === "string" ? body.nextPassword : "";
  if (nextPassword.length < 6) {
    return toErrorResponse("Mat khau moi phai co it nhat 6 ky tu.", 400);
  }
  if (nextPassword === DEFAULT_INITIAL_PASSWORD) {
    return toErrorResponse("Khong duoc dung lai mat khau mac dinh.", 400);
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return toErrorResponse(
      "Chua cau hinh Supabase server env nen khong the doi mat khau.",
      503
    );
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, is_active, password_hash")
    .eq("id", session.profileId)
    .maybeSingle();

  if (error) {
    if (isMissingPasswordHashColumn(error)) {
      return toErrorResponse(
        "Chua apply migration profiles.password_hash tren Supabase.",
        503
      );
    }
    return toErrorResponse(error.message, 500);
  }

  const profile = data as DbPasswordProfile | null;
  if (!profile?.id || profile.username !== session.username) {
    return toErrorResponse("Phien dang nhap khong khop tai khoan.", 401);
  }
  if (profile.is_active === false) {
    return toErrorResponse("Tai khoan chua duoc kich hoat.", 403);
  }

  const isSamePassword = profile.password_hash
    ? verifyPassword(nextPassword, profile.password_hash)
    : nextPassword === DEFAULT_INITIAL_PASSWORD;
  if (isSamePassword) {
    return toErrorResponse("Mat khau moi phai khac mat khau hien tai.", 400);
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      password_hash: hashPassword(nextPassword),
      must_change_password: false
    })
    .eq("id", profile.id);

  if (updateError) {
    if (isMissingPasswordHashColumn(updateError)) {
      return toErrorResponse(
        "Chua apply migration profiles.password_hash tren Supabase.",
        503
      );
    }
    return toErrorResponse(updateError.message, 500);
  }

  return NextResponse.json({ ok: true });
};
