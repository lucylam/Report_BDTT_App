import { NextResponse } from "next/server";
import {
  AUTH_SESSION_COOKIE,
  createAuthSessionToken
} from "@/lib/authSession";
import { DEFAULT_INITIAL_PASSWORD, getLoginUsername } from "@/lib/accounts";
import { forbiddenOriginMessage, isAllowedRequestOrigin } from "@/lib/api/security";
import { verifyPassword } from "@/lib/password";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/domain";

export const runtime = "nodejs";

interface LoginBody {
  readonly username?: string;
  readonly password?: string;
  readonly rememberLogin?: boolean;
}

interface DbAuthProfile {
  readonly id: string;
  readonly username: string | null;
  readonly role: UserRole | null;
  readonly must_change_password: boolean | null;
  readonly is_active: boolean | null;
  readonly password_hash: string | null;
}

const normalizeText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const toErrorResponse = (error: string, status: number): NextResponse =>
  NextResponse.json({ ok: false, error }, { status });

const isMissingPasswordHashColumn = (error: { readonly message?: string }): boolean =>
  Boolean(error.message?.toLowerCase().includes("password_hash"));

export const POST = async (request: Request): Promise<NextResponse> => {
  if (!isAllowedRequestOrigin(request)) {
    return toErrorResponse(forbiddenOriginMessage, 403);
  }

  const body = (await request.json()) as LoginBody;
  const username = getLoginUsername(normalizeText(body.username));
  const password = typeof body.password === "string" ? body.password : "";

  if (!username || !password) {
    return toErrorResponse("Thieu ten dang nhap hoac mat khau.", 400);
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return toErrorResponse(
      "Chua cau hinh Supabase server env nen khong the xac thuc mat khau.",
      503
    );
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, role, must_change_password, is_active, password_hash")
    .eq("username", username)
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

  const profile = data as DbAuthProfile | null;
  if (!profile?.id || !profile.username) {
    return toErrorResponse("Sai tai khoan hoac mat khau.", 401);
  }
  if (profile.is_active === false) {
    return toErrorResponse("Tai khoan chua duoc kich hoat.", 403);
  }

  const hasPasswordHash = Boolean(profile.password_hash);
  const isPasswordValid = hasPasswordHash
    ? verifyPassword(password, profile.password_hash)
    : password === DEFAULT_INITIAL_PASSWORD;

  if (!isPasswordValid) {
    return toErrorResponse("Sai tai khoan hoac mat khau.", 401);
  }

  const token = await createAuthSessionToken({
    profileId: profile.id,
    username: profile.username
  });
  const mustChangePassword = Boolean(profile.must_change_password) || !hasPasswordHash;
  const response = NextResponse.json({
    ok: true,
    account: {
      username: profile.username,
      role: profile.role ?? "worker",
      mustChangePassword,
      canLogin: true
    }
  });

  response.cookies.set(AUTH_SESSION_COOKIE, token, {
    httpOnly: true,
    maxAge: body.rememberLogin ? 30 * 24 * 60 * 60 : undefined,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  return response;
};
