import { NextResponse } from "next/server";
import { findOwnedTask, getAuthenticatedProfile } from "@/lib/api/session";
import {
  createTaskPhotoPath,
  parsePhotoDataUrl,
  TASK_PHOTOS_BUCKET
} from "@/lib/api/photoStorage";
import { forbiddenOriginMessage, isAllowedRequestOrigin } from "@/lib/api/security";
import { getActiveBdttTrialRun, isTrialRunContextCurrent } from "@/lib/api/demoMode";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Task } from "@/types/domain";

export const runtime = "nodejs";

interface UploadPhotoBody {
  readonly trialRunId?: string | null;
  readonly task?: Task;
  readonly reportDate?: string;
  readonly dataUrl?: string;
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
      "Chua cau hinh Supabase server env cho API upload anh.",
      503
    );
  }

  const auth = await getAuthenticatedProfile(request, supabase);
  if (!auth.ok) return toErrorResponse(auth.error, auth.status);

  const body = (await request.json()) as UploadPhotoBody;
  const trialRun = await getActiveBdttTrialRun(supabase);
  if (!isTrialRunContextCurrent(body.trialRunId, trialRun?.id ?? null)) {
    return toErrorResponse("Chế độ dùng thử đã thay đổi. Hãy tải lại trang.", 409);
  }
  const task = body.task;
  const reportDate = normalizeText(body.reportDate);
  const dataUrl = normalizeText(body.dataUrl);
  if (!task || !reportDate || !dataUrl) {
    return toErrorResponse("Thieu task, reportDate hoac anh.", 400);
  }

  const taskResult = await findOwnedTask(supabase, auth.profile.id, task);
  if (!taskResult.ok) return toErrorResponse(taskResult.error, taskResult.status);
  if (taskResult.task.is_cancelled) {
    return toErrorResponse("Hang muc da cancel, khong the upload anh.", 409);
  }

  let parsedPhoto: ReturnType<typeof parsePhotoDataUrl>;
  try {
    parsedPhoto = parsePhotoDataUrl(dataUrl);
  } catch (error) {
    return toErrorResponse(
      error instanceof Error ? error.message : "Anh khong hop le.",
      400
    );
  }

  const photoPath = createTaskPhotoPath({
    profileId: auth.profile.id,
    taskId: taskResult.task.id,
    reportDate,
    trialRunId: trialRun?.id ?? null
  });

  const { error: uploadError } = await supabase.storage
    .from(TASK_PHOTOS_BUCKET)
    .upload(photoPath, parsedPhoto.bytes, {
      contentType: parsedPhoto.mimeType,
      upsert: true
    });

  if (uploadError) {
    return toErrorResponse(uploadError.message, 500);
  }

  return NextResponse.json({ ok: true, photoPath });
};
