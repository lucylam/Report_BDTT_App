import { NextResponse } from "next/server";
import { getAuthenticatedProfile } from "@/lib/api/session";
import { forbiddenOriginMessage, isAllowedRequestOrigin } from "@/lib/api/security";
import type { AppNotification } from "@/lib/notifications";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DbNotification {
  readonly id: string;
  readonly module: string;
  readonly event_type: string;
  readonly entity_id: string | null;
  readonly href: string | null;
  readonly title: string;
  readonly message: string;
  readonly read_at: string | null;
  readonly created_at: string;
}

interface ReadNotificationsBody {
  readonly notificationIds?: readonly string[];
  readonly markAll?: boolean;
}

const toErrorResponse = (error: string, status: number): NextResponse =>
  NextResponse.json({ ok: false, error }, { status });

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getContext = async (request: Request) => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { ok: false as const, response: toErrorResponse("Chua cau hinh Supabase server env cho thong bao.", 503) };
  }
  const auth = await getAuthenticatedProfile(request, supabase);
  if (!auth.ok) {
    return { ok: false as const, response: toErrorResponse(auth.error, auth.status) };
  }
  return { ok: true as const, supabase, profile: auth.profile };
};

export const GET = async (request: Request): Promise<NextResponse> => {
  const context = await getContext(request);
  if (!context.ok) return context.response;

  let { data, error } = await context.supabase
    .from("app_notifications")
    .select("id, module, event_type, entity_id, href, title, message, read_at, created_at")
    .eq("recipient_id", context.profile.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error?.message.toLowerCase().includes("href")) {
    const fallback = await context.supabase
      .from("app_notifications")
      .select("id, module, event_type, entity_id, title, message, read_at, created_at")
      .eq("recipient_id", context.profile.id)
      .order("created_at", { ascending: false })
      .limit(50);
    data = (fallback.data ?? []).map((row) => ({ ...row, href: null }));
    error = fallback.error;
  }
  if (error) {
    const missingMigration = error.message.toLowerCase().includes("app_notifications");
    return toErrorResponse(
      missingMigration
        ? "Chua ap dung migration 20260717_am_workflow.sql cho thong bao."
        : error.message,
      missingMigration ? 503 : 500
    );
  }

  const notifications: AppNotification[] = ((data ?? []) as DbNotification[]).map(
    (notification) => ({
      id: notification.id,
      module: notification.module,
      eventType: notification.event_type,
      entityId: notification.entity_id ?? undefined,
      href: notification.href ?? undefined,
      title: notification.title,
      message: notification.message,
      readAt: notification.read_at ?? undefined,
      createdAt: notification.created_at
    })
  );
  return NextResponse.json({ ok: true, notifications });
};

export const POST = async (request: Request): Promise<NextResponse> => {
  if (!isAllowedRequestOrigin(request)) {
    return toErrorResponse(forbiddenOriginMessage, 403);
  }
  const context = await getContext(request);
  if (!context.ok) return context.response;
  const body = (await request.json()) as ReadNotificationsBody;
  const ids = [...new Set(body.notificationIds ?? [])].filter((id) => uuidPattern.test(id));
  if (!body.markAll && ids.length === 0) {
    return toErrorResponse("Danh sach thong bao khong hop le.", 400);
  }

  let query = context.supabase
    .from("app_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", context.profile.id)
    .is("read_at", null);
  if (!body.markAll) query = query.in("id", ids);
  const { error } = await query;
  if (error) return toErrorResponse(error.message, 500);
  return NextResponse.json({ ok: true });
};
