import { NextResponse } from "next/server";
import { findOwnedTask, getAuthenticatedProfile } from "@/lib/api/session";
import { forbiddenOriginMessage, isAllowedRequestOrigin } from "@/lib/api/security";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Task } from "@/types/domain";

export const runtime = "nodejs";

interface CancelTaskBody {
  readonly task?: Task;
  readonly cancelReason?: string;
}

const normalizeText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const toErrorResponse = (error: string, status: number): NextResponse =>
  NextResponse.json({ ok: false, error }, { status });

export const POST = async (request: Request): Promise<NextResponse> => {
  if (!isAllowedRequestOrigin(request)) {
    return toErrorResponse(forbiddenOriginMessage, 403);
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return toErrorResponse(
      "Chua cau hinh Supabase server env cho API cancel task.",
      503
    );
  }

  const auth = await getAuthenticatedProfile(request, supabase);
  if (!auth.ok) return toErrorResponse(auth.error, auth.status);

  const body = (await request.json()) as CancelTaskBody;
  const task = body.task;
  const cancelReason = normalizeText(body.cancelReason);
  if (!task) return toErrorResponse("Thieu task can cancel.", 400);
  if (cancelReason.length < 3) {
    return toErrorResponse("Ly do cancel phai co it nhat 3 ky tu.", 400);
  }

  const taskResult = await findOwnedTask(supabase, auth.profile.id, task);
  if (!taskResult.ok) return toErrorResponse(taskResult.error, taskResult.status);

  const { data: updatedTask, error } = await supabase
    .from("tasks")
    .update({
      is_cancelled: true,
      cancel_reason: cancelReason,
      updated_at: new Date().toISOString()
    })
    .eq("id", taskResult.task.id)
    .eq("assigned_to", auth.profile.id)
    .select("id")
    .maybeSingle();

  if (error) return toErrorResponse(error.message, 500);
  if (!updatedTask?.id) {
    return toErrorResponse("Khong co quyen cancel hang muc nay.", 403);
  }

  return NextResponse.json({
    ok: true,
    taskId: taskResult.task.id,
    cancelReason
  });
};
