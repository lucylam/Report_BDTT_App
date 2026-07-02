import { createHmac, timingSafeEqual } from "node:crypto";
import { getSupabaseServerConfig } from "@/lib/supabase/server";

export const AUTH_SESSION_COOKIE = "bdtt-auth-session";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface AuthSessionPayload {
  readonly profileId: string;
  readonly username: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
}

const toBase64Url = (value: string): string =>
  Buffer.from(value, "utf8").toString("base64url");

const fromBase64Url = (value: string): string =>
  Buffer.from(value, "base64url").toString("utf8");

const getAuthSessionSecret = async (): Promise<string | null> => {
  if (process.env.BDTT_AUTH_SESSION_SECRET) {
    return process.env.BDTT_AUTH_SESSION_SECRET;
  }

  const serverConfig = await getSupabaseServerConfig();
  return serverConfig?.serviceRoleKey ?? null;
};

const sign = (payload: string, secret: string): string =>
  createHmac("sha256", secret).update(payload).digest("base64url");

export const createAuthSessionToken = async (
  payload: Pick<AuthSessionPayload, "profileId" | "username">
): Promise<string> => {
  const secret = await getAuthSessionSecret();
  if (!secret) {
    throw new Error("Chua cau hinh khoa ky phien dang nhap.");
  }

  const now = Date.now();
  const sessionPayload: AuthSessionPayload = {
    ...payload,
    issuedAt: now,
    expiresAt: now + SESSION_TTL_MS
  };
  const encodedPayload = toBase64Url(JSON.stringify(sessionPayload));
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
};

export const verifyAuthSessionToken = async (
  token: string | null | undefined
): Promise<AuthSessionPayload | null> => {
  if (!token) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const secret = await getAuthSessionSecret();
  if (!secret) return null;

  const expectedSignature = sign(encodedPayload, secret);
  const actual = Buffer.from(signature, "base64url");
  const expected = Buffer.from(expectedSignature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as Partial<AuthSessionPayload>;
    if (
      typeof payload.profileId !== "string" ||
      typeof payload.username !== "string" ||
      typeof payload.issuedAt !== "number" ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= Date.now()
    ) {
      return null;
    }

    return payload as AuthSessionPayload;
  } catch {
    return null;
  }
};

export const getRequestCookie = (request: Request, name: string): string | null => {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const cookie = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));

  if (!cookie) return null;
  return decodeURIComponent(cookie.slice(name.length + 1));
};
