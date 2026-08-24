import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedAccount, isUuid } from "@/lib/api/session";
import { getActiveBdttTrialRun } from "@/lib/api/demoMode";
import { loadBdttSnapshot } from "@/lib/api/bdttSnapshot";
import { forbiddenOriginMessage, isAllowedRequestOrigin } from "@/lib/api/security";
import { parsePhotoDataUrl, TASK_PHOTOS_BUCKET } from "@/lib/api/photoStorage";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { canManageBdttTasks, canViewProfile, canViewTask } from "@/lib/permissions";

export const runtime = "nodejs";

interface PhotoBody {
  readonly abnormalityId?: string;
  readonly dataUrl?: string;
}

const errorResponse = (error: string, status: number): NextResponse =>
  NextResponse.json({ ok: false, error }, { status });

export const POST = async (request: Request): Promise<NextResponse> => {
  if (!isAllowedRequestOrigin(request)) return errorResponse(forbiddenOriginMessage, 403);
  const supabase = await createServerSupabaseClient();
  if (!supabase) return errorResponse("Chưa cấu hình Supabase cho ảnh bất thường.", 503);
  const auth = await getAuthenticatedAccount(request, supabase);
  if (!auth.ok) return errorResponse(auth.error, auth.status);
  const trialRun = await getActiveBdttTrialRun(supabase);
  const body = (await request.json()) as PhotoBody;
  if (!isUuid(body.abnormalityId ?? "")) return errorResponse("Mã bất thường không hợp lệ.", 400);

  const { data: item, error: itemError } = await supabase
    .from("bdtt_abnormalities")
    .select("id, task_id, reported_by, assigned_to, status, trial_run_id")
    .eq("id", body.abnormalityId)
    .maybeSingle();
  if (itemError) return errorResponse(itemError.message, 500);
  if (!item) return errorResponse("Không tìm thấy bất thường.", 404);
  if ((item.trial_run_id ?? null) !== (trialRun?.id ?? null)) {
    return errorResponse("Bất thường không thuộc chế độ dữ liệu hiện tại.", 409);
  }
  let canUpload = item.reported_by === auth.profile.id || item.assigned_to === auth.profile.id;
  if (!canUpload && canManageBdttTasks(auth.account)) {
    const snapshot = await loadBdttSnapshot(supabase);
    const scopedAccount = { ...auth.account, id: auth.profile.id };
    const task = item.task_id
      ? snapshot.tasks.find((entry) => entry.id === item.task_id)
      : null;
    const responsible = snapshot.profiles.find(
      (profile) => profile.id === (item.assigned_to || item.reported_by)
    );
    canUpload = task
      ? canViewTask(scopedAccount, task, snapshot.profiles)
      : responsible
        ? canViewProfile(scopedAccount, responsible)
        : false;
  }
  if (!canUpload) {
    return errorResponse("Bạn không có quyền thêm ảnh cho bất thường này.", 403);
  }
  if (item.status === "closed") return errorResponse("Bất thường đã đóng, không thể thêm ảnh.", 409);

  let photo: ReturnType<typeof parsePhotoDataUrl>;
  try {
    photo = parsePhotoDataUrl(body.dataUrl ?? "");
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Ảnh không hợp lệ.", 400);
  }
  const { count, error: countError } = await supabase
    .from("bdtt_abnormality_photos")
    .select("id", { count: "exact", head: true })
    .eq("abnormality_id", body.abnormalityId);
  if (countError) return errorResponse(countError.message, 500);
  if ((count ?? 0) >= 5) return errorResponse("Mỗi bất thường chỉ được tối đa 5 ảnh.", 400);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const basePath = `${auth.profile.id}/abnormalities/${body.abnormalityId}/${stamp}-${randomUUID()}.jpg`;
  const storagePath = trialRun ? `trials/${trialRun.id}/${basePath}` : basePath;
  const { error: uploadError } = await supabase.storage
    .from(TASK_PHOTOS_BUCKET)
    .upload(storagePath, photo.bytes, { contentType: photo.mimeType, upsert: false });
  if (uploadError) return errorResponse(uploadError.message, 500);
  const { error: insertError } = await supabase.from("bdtt_abnormality_photos").insert({
    abnormality_id: body.abnormalityId,
    storage_path: storagePath,
    uploaded_by: auth.profile.id
  });
  if (insertError) {
    await supabase.storage.from(TASK_PHOTOS_BUCKET).remove([storagePath]);
    return errorResponse(insertError.message, 500);
  }
  await supabase.from("bdtt_abnormality_events").insert({
    abnormality_id: body.abnormalityId,
    event_type: "photo_added",
    actor_id: auth.profile.id,
    details: { storage_path: storagePath }
  });
  return NextResponse.json({ ok: true, storagePath }, { status: 201 });
};
