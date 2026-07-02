import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE } from "@/lib/authSession";
import { forbiddenOriginMessage, isAllowedRequestOrigin } from "@/lib/api/security";

export const runtime = "nodejs";

export const POST = async (request: Request): Promise<NextResponse> => {
  if (!isAllowedRequestOrigin(request)) {
    return NextResponse.json({ ok: false, error: forbiddenOriginMessage }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_SESSION_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
  return response;
};
