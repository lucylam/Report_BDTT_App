import { NextResponse } from "next/server";
import { getAuthenticatedProfile } from "@/lib/api/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentReportDate } from "@/lib/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const executiveRoles = new Set(["leader", "workshop_manager", "web_admin"]);

export const GET = async (request: Request): Promise<NextResponse> => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Chưa cấu hình Supabase server." }, { status: 503 });
  }
  const auth = await getAuthenticatedProfile(request, supabase);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  let moduleRoles: string[] = [];
  const membershipResult = await supabase
    .from("app_module_memberships")
    .select("role")
    .eq("profile_id", auth.profile.id)
    .eq("is_active", true);
  if (!membershipResult.error) {
    moduleRoles = (membershipResult.data ?? []).map((row) => String(row.role));
  } else if (membershipResult.error.message.toLowerCase().includes("app_module_memberships")) {
    const legacy = await supabase
      .from("am_module_roles")
      .select("role")
      .eq("profile_id", auth.profile.id)
      .eq("is_active", true);
    moduleRoles = (legacy.data ?? []).map((row) => String(row.role));
  }

  const isExecutive = auth.profile.role === "admin" || moduleRoles.some((role) => executiveRoles.has(role));
  if (!isExecutive) {
    return NextResponse.json({ ok: false, error: "Tài khoản không có quyền xem cockpit." }, { status: 403 });
  }

  const [notificationResult, taskResult] = await Promise.all([
    supabase
      .from("app_notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", auth.profile.id)
      .is("read_at", null),
    supabase.from("am_tasks").select("status, scheduled_date")
  ]);

  if (notificationResult.error) {
    return NextResponse.json({ ok: false, error: notificationResult.error.message }, { status: 500 });
  }
  if (taskResult.error) {
    return NextResponse.json({ ok: false, error: taskResult.error.message }, { status: 500 });
  }

  const today = getCurrentReportDate();
  const tasks = taskResult.data ?? [];
  return NextResponse.json({
    ok: true,
    unreadNotifications: notificationResult.count ?? 0,
    am: {
      active: tasks.filter((task) => task.status === "assigned" || task.status === "in_progress").length,
      waitingReview: tasks.filter((task) => task.status === "submitted").length,
      needsRevision: tasks.filter((task) => task.status === "needs_revision").length,
      overdue: tasks.filter((task) => task.scheduled_date < today && task.status !== "approved").length
    }
  });
};

