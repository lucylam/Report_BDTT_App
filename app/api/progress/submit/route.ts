import { NextResponse } from "next/server";
import { getLoginUsername } from "@/lib/accounts";
import {
  findReportableTask,
  getAuthenticatedProfile,
  isSessionProfileReference
} from "@/lib/api/session";
import { forbiddenOriginMessage, isAllowedRequestOrigin } from "@/lib/api/security";
import { isInlinePhotoDataUrl } from "@/lib/api/photoStorage";
import { getActiveBdttTrialRun, isTrialRunContextCurrent } from "@/lib/api/demoMode";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isPercentAllowedForMode } from "@/lib/progressMode";
import type { Task } from "@/types/domain";

export const runtime = "nodejs";

interface SubmitProgressBody {
  readonly trialRunId?: string | null;
  readonly update?: {
    readonly taskId?: string;
    readonly userId?: string;
    readonly reportDate?: string;
    readonly percent?: number;
    readonly note?: string;
    readonly photoPath?: string;
    readonly photoPaths?: string[];
  };
  readonly task?: Task;
  readonly worker?: {
    readonly username?: string;
    readonly fullName?: string;
    readonly resourceName?: string;
  };
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
      "Chua cau hinh Supabase server env cho API ghi tien do.",
      503
    );
  }

  const auth = await getAuthenticatedProfile(request, supabase);
  if (!auth.ok) return toErrorResponse(auth.error, auth.status);
  const { profile } = auth;

  const body = (await request.json()) as SubmitProgressBody;
  const trialRun = await getActiveBdttTrialRun(supabase);
  if (!isTrialRunContextCurrent(body.trialRunId, trialRun?.id ?? null)) {
    return toErrorResponse(
      "Chế độ dùng thử đã thay đổi. Hãy tải lại trang trước khi gửi báo cáo.",
      409
    );
  }
  const update = body.update;
  const task = body.task;
  if (!update || !task) {
    return toErrorResponse("Thieu update hoac task.", 400);
  }

  const bodyUsername = normalizeText(body.worker?.username);
  if (bodyUsername && getLoginUsername(bodyUsername) !== profile.username) {
    return toErrorResponse("Tai khoan trong request khong khop phien dang nhap.", 403);
  }

  const updateUserId = normalizeText(update.userId);
  if (!updateUserId || !isSessionProfileReference(updateUserId, profile)) {
    return toErrorResponse("User cap nhat khong khop phien dang nhap.", 403);
  }

  const reportDate = normalizeText(update.reportDate);
  if (!reportDate || typeof update.percent !== "number") {
    return toErrorResponse("Dữ liệu tiến độ không hợp lệ.", 400);
  }

  const photoPath = normalizeText(update.photoPath);
  const photoPaths = Array.from(
    new Set(
      [...(Array.isArray(update.photoPaths) ? update.photoPaths : []), photoPath]
        .map(normalizeText)
        .filter(Boolean)
    )
  );
  if (photoPaths.length > 5) {
    return toErrorResponse("Moi bao cao chi duoc toi da 5 anh.", 400);
  }
  if (photoPaths.some(isInlinePhotoDataUrl)) {
    return toErrorResponse("Anh can duoc upload len storage truoc khi submit.", 400);
  }

  const taskResult = await findReportableTask(supabase, profile.id, task);
  if (!taskResult.ok) return toErrorResponse(taskResult.error, taskResult.status);
  if (taskResult.task.is_cancelled) {
    return toErrorResponse("Hạng mục đã hủy, không thể cập nhật tiến độ.", 409);
  }
  const progressMode =
    taskResult.task.progress_mode === "binary" ? "binary" : "continuous";
  if (!isPercentAllowedForMode(update.percent, progressMode)) {
    return toErrorResponse(
      progressMode === "binary"
        ? "Hạng mục này chỉ cho phép tiến độ 0% hoặc 100%."
        : "Phần trăm tiến độ phải là số nguyên từ 0 đến 100.",
      400
    );
  }

  const now = new Date().toISOString();
  const baseRow = {
    task_id: taskResult.task.id,
    user_id: profile.id,
    report_date: reportDate,
    percent: update.percent,
    note: normalizeText(update.note),
    photo_path: photoPaths[0] || null,
    submitted_by: profile.id,
    submitted_at: now,
    updated_at: now,
    trial_run_id: trialRun?.id ?? null
  };
  let { error: progressError } = await supabase.from("progress").upsert(
    { ...baseRow, photo_paths: photoPaths },
    { onConflict: "task_id,user_id,report_date,trial_run_id" }
  );

  if (progressError?.message.toLowerCase().includes("photo_paths")) {
    const fallback = await supabase.from("progress").upsert(baseRow, {
      onConflict: "task_id,user_id,report_date,trial_run_id"
    });
    progressError = fallback.error;
  }

  if (progressError) {
    return toErrorResponse(progressError.message, 500);
  }

  return NextResponse.json({ ok: true, taskId: taskResult.task.id });
};
