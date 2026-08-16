import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  AM_PHOTO_BUCKET,
  AM_PHOTO_LIMIT_PER_KIND,
  addAmEvent,
  canReportAmTask,
  createAmNotifications,
  getAmApiContext,
  isUuid,
  listAmSupervisorIds
} from "@/lib/api/am";
import type { AmApiContext } from "@/lib/api/am";
import { parsePhotoDataUrl } from "@/lib/api/photoStorage";
import { forbiddenOriginMessage, isAllowedRequestOrigin } from "@/lib/api/security";

export const runtime = "nodejs";

interface UploadPhotoBody {
  readonly taskId?: string;
  readonly kind?: "before" | "after";
  readonly dataUrl?: string;
}

interface DeletePhotoBody {
  readonly taskId?: string;
  readonly photoId?: string;
}

interface DbTaskState {
  readonly status: string;
  readonly request_content: string;
  readonly created_by: string;
}

const toErrorResponse = (error: string, status: number): NextResponse =>
  NextResponse.json({ ok: false, error }, { status });

const loadEditableTask = async (
  context: AmApiContext,
  taskId: string
): Promise<{ readonly task: DbTaskState | null; readonly error?: NextResponse }> => {
  const canReport = await canReportAmTask(context, taskId);
  if (!canReport) {
    return { task: null, error: toErrorResponse("Chi nguoi duoc giao moi duoc cap nhat anh.", 403) };
  }
  const { data, error } = await context.supabase
    .from("am_tasks")
    .select("status, request_content, created_by")
    .eq("id", taskId)
    .maybeSingle();
  if (error) return { task: null, error: toErrorResponse(error.message, 500) };
  if (!data) return { task: null, error: toErrorResponse("Khong tim thay nhiem vu AM.", 404) };
  const task = data as DbTaskState;
  if (!["assigned", "in_progress", "needs_revision"].includes(task.status)) {
    return {
      task: null,
      error: toErrorResponse("Bao cao dang cho duyet hoac da duyet, khong the sua anh.", 409)
    };
  }
  return { task };
};

export const POST = async (request: Request): Promise<NextResponse> => {
  if (!isAllowedRequestOrigin(request)) {
    return toErrorResponse(forbiddenOriginMessage, 403);
  }
  const contextResult = await getAmApiContext(request);
  if (!contextResult.ok) return toErrorResponse(contextResult.error, contextResult.status);
  const { context } = contextResult;
  const body = (await request.json()) as UploadPhotoBody;
  if (!isUuid(body.taskId) || (body.kind !== "before" && body.kind !== "after")) {
    return toErrorResponse("Thong tin anh AM khong hop le.", 400);
  }
  const editable = await loadEditableTask(context, body.taskId);
  if (editable.error) return editable.error;
  if (!editable.task) return toErrorResponse("Khong tim thay nhiem vu AM.", 404);

  let photo: ReturnType<typeof parsePhotoDataUrl>;
  try {
    photo = parsePhotoDataUrl(body.dataUrl ?? "");
  } catch (error) {
    return toErrorResponse(error instanceof Error ? error.message : "Anh khong hop le.", 400);
  }

  const { count, error: countError } = await context.supabase
    .from("am_task_photos")
    .select("id", { count: "exact", head: true })
    .eq("task_id", body.taskId)
    .eq("kind", body.kind);
  if (countError) return toErrorResponse(countError.message, 500);
  if ((count ?? 0) >= AM_PHOTO_LIMIT_PER_KIND) {
    return toErrorResponse(`Moi nhom anh chi nhan toi da ${AM_PHOTO_LIMIT_PER_KIND} anh.`, 400);
  }

  const safeTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const storagePath = `am/${body.taskId}/${context.profile.id}/${body.kind}-${safeTimestamp}-${randomUUID()}.jpg`;
  const { error: uploadError } = await context.supabase.storage
    .from(AM_PHOTO_BUCKET)
    .upload(storagePath, photo.bytes, { contentType: photo.mimeType, upsert: false });
  if (uploadError) return toErrorResponse(uploadError.message, 500);

  const { error: insertError } = await context.supabase.from("am_task_photos").insert({
    task_id: body.taskId,
    kind: body.kind,
    storage_path: storagePath,
    uploaded_by: context.profile.id
  });
  if (insertError) {
    await context.supabase.storage.from(AM_PHOTO_BUCKET).remove([storagePath]);
    return toErrorResponse(insertError.message, 500);
  }

  const isFirstUpdate = editable.task.status === "assigned";
  if (isFirstUpdate) {
    await context.supabase
      .from("am_tasks")
      .update({ status: "in_progress", updated_at: new Date().toISOString() })
      .eq("id", body.taskId);
  }
  const supervisorIds = isFirstUpdate
    ? await listAmSupervisorIds(context.supabase)
    : [];
  await Promise.all([
    addAmEvent(context.supabase, body.taskId, "photo_added", context.profile.id, {
      kind: body.kind
    }),
    isFirstUpdate
      ? createAmNotifications(
          context.supabase,
          [...supervisorIds, editable.task.created_by],
          {
            eventType: "task_started",
            taskId: body.taskId,
            title: "Nhiệm vụ AM đã bắt đầu",
            message: editable.task.request_content
          },
          context.profile.id
        )
      : Promise.resolve(null)
  ]);

  return NextResponse.json({ ok: true }, { status: 201 });
};

export const DELETE = async (request: Request): Promise<NextResponse> => {
  if (!isAllowedRequestOrigin(request)) {
    return toErrorResponse(forbiddenOriginMessage, 403);
  }
  const contextResult = await getAmApiContext(request);
  if (!contextResult.ok) return toErrorResponse(contextResult.error, contextResult.status);
  const { context } = contextResult;
  const body = (await request.json()) as DeletePhotoBody;
  if (!isUuid(body.taskId) || !isUuid(body.photoId)) {
    return toErrorResponse("Thong tin anh AM khong hop le.", 400);
  }
  const editable = await loadEditableTask(context, body.taskId);
  if (editable.error) return editable.error;

  const { data, error } = await context.supabase
    .from("am_task_photos")
    .select("id, storage_path")
    .eq("id", body.photoId)
    .eq("task_id", body.taskId)
    .maybeSingle();
  if (error) return toErrorResponse(error.message, 500);
  if (!data) return toErrorResponse("Khong tim thay anh AM.", 404);

  const { error: storageError } = await context.supabase.storage
    .from(AM_PHOTO_BUCKET)
    .remove([String(data.storage_path)]);
  if (storageError) return toErrorResponse(storageError.message, 500);
  const { error: deleteError } = await context.supabase
    .from("am_task_photos")
    .delete()
    .eq("id", body.photoId);
  if (deleteError) return toErrorResponse(deleteError.message, 500);
  await addAmEvent(context.supabase, body.taskId, "photo_removed", context.profile.id);

  return NextResponse.json({ ok: true });
};
