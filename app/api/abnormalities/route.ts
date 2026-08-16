import { NextResponse } from "next/server";
import { loadBdttSnapshot } from "@/lib/api/bdttSnapshot";
import { getScopedBdttManagerIds } from "@/lib/api/bdttRecipients";
import { getAuthenticatedAccount, findReportableTask, isUuid } from "@/lib/api/session";
import { forbiddenOriginMessage, isAllowedRequestOrigin } from "@/lib/api/security";
import { canManageBdttTasks, canViewProfile, canViewTask } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AbnormalitySeverity, AbnormalityStatus, Task } from "@/types/domain";
import { canTransitionAbnormality } from "@/lib/abnormalityWorkflow";

export const runtime = "nodejs";

interface AbnormalityBody {
  readonly abnormalityId?: string;
  readonly task?: Task;
  readonly taskId?: string;
  readonly title?: string;
  readonly description?: string;
  readonly location?: string;
  readonly severity?: AbnormalitySeverity;
  readonly status?: AbnormalityStatus;
  readonly assigneeUsername?: string;
  readonly resolutionNote?: string;
}

const text = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";
const errorResponse = (error: string, status: number): NextResponse =>
  NextResponse.json({ ok: false, error }, { status });
const severities: readonly AbnormalitySeverity[] = ["low", "medium", "high", "critical"];
const statuses: readonly AbnormalityStatus[] = ["new", "in_progress", "resolved", "closed"];

export const GET = async (request: Request): Promise<NextResponse> => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return errorResponse("Chưa cấu hình Supabase cho bất thường.", 503);
  const auth = await getAuthenticatedAccount(request, supabase);
  if (!auth.ok) return errorResponse(auth.error, auth.status);
  try {
    const [snapshot, abnormalityResult, photoResult] = await Promise.all([
      loadBdttSnapshot(supabase),
      supabase.from("bdtt_abnormalities").select("*").order("created_at", { ascending: false }),
      supabase
        .from("bdtt_abnormality_photos")
        .select("id, abnormality_id, storage_path, uploaded_by, created_at")
        .order("created_at", { ascending: true })
    ]);
    if (abnormalityResult.error) throw new Error(abnormalityResult.error.message);
    if (photoResult.error) throw new Error(photoResult.error.message);
    const scopedAccount = { ...auth.account, id: auth.profile.id };
    const taskById = new Map(snapshot.tasks.map((task) => [task.id, task]));
    const profileById = new Map(snapshot.profiles.map((profile) => [profile.id, profile]));
    const photosByParent = new Map<string, string[]>();
    (photoResult.data ?? []).forEach((photo) => {
      const parentId = String(photo.abnormality_id);
      photosByParent.set(parentId, [...(photosByParent.get(parentId) ?? []), String(photo.storage_path)]);
    });
    const items = (abnormalityResult.data ?? []).filter((item) => {
      if (item.reported_by === auth.profile.id || item.assigned_to === auth.profile.id) return true;
      if (!canManageBdttTasks(scopedAccount)) return false;
      const task = item.task_id ? taskById.get(String(item.task_id)) : null;
      if (task) return canViewTask(scopedAccount, task, snapshot.profiles);
      const responsible = profileById.get(String(item.assigned_to || item.reported_by));
      return responsible ? canViewProfile(scopedAccount, responsible) : false;
    }).map((item) => ({ ...item, photo_paths: photosByParent.get(String(item.id)) ?? [] }));
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Không tải được bất thường.", 500);
  }
};

export const POST = async (request: Request): Promise<NextResponse> => {
  if (!isAllowedRequestOrigin(request)) return errorResponse(forbiddenOriginMessage, 403);
  const supabase = await createServerSupabaseClient();
  if (!supabase) return errorResponse("Chưa cấu hình Supabase cho bất thường.", 503);
  const auth = await getAuthenticatedAccount(request, supabase);
  if (!auth.ok) return errorResponse(auth.error, auth.status);
  const body = (await request.json()) as AbnormalityBody;
  const title = text(body.title);
  const description = text(body.description);
  const location = text(body.location);
  const severity = severities.includes(body.severity ?? "medium")
    ? (body.severity ?? "medium")
    : "medium";
  if (title.length < 3 || title.length > 200 || description.length > 2000 || location.length > 300) {
    return errorResponse("Thông tin bất thường không hợp lệ hoặc quá dài.", 400);
  }
  let taskId: string | null = null;
  if (body.task) {
    if (canManageBdttTasks(auth.account)) {
      const snapshot = await loadBdttSnapshot(supabase);
      const scopedAccount = { ...auth.account, id: auth.profile.id };
      const scopedTask = snapshot.tasks.find((task) => task.id === body.task?.id);
      if (!scopedTask || !canViewTask(scopedAccount, scopedTask, snapshot.profiles)) {
        return errorResponse("Task không thuộc phạm vi phụ trách.", 403);
      }
      taskId = scopedTask.id;
    } else {
      const taskResult = await findReportableTask(supabase, auth.profile.id, body.task);
      if (!taskResult.ok) return errorResponse(taskResult.error, taskResult.status);
      taskId = taskResult.task.id;
    }
  }
  const now = new Date().toISOString();
  const { data: item, error } = await supabase
    .from("bdtt_abnormalities")
    .insert({
      task_id: taskId,
      title,
      description,
      location,
      severity,
      status: "new",
      reported_by: auth.profile.id,
      created_at: now,
      updated_at: now
    })
    .select("id")
    .single();
  if (error) return errorResponse(error.message, 500);
  await supabase.from("bdtt_abnormality_events").insert({
    abnormality_id: item.id,
    event_type: "created",
    actor_id: auth.profile.id,
    details: { task_id: taskId, severity }
  });

  const recipients = await getScopedBdttManagerIds(supabase, {
    taskId,
    profileId: auth.profile.id,
    excludeId: auth.profile.id
  });
  if (recipients.length > 0) {
    await supabase.from("app_notifications").insert(
      recipients.map((recipientId) => ({
        recipient_id: recipientId,
        module: "bdtt",
        event_type: "abnormality_reported",
        entity_id: item.id,
        href: "/admin/tasks?tab=abnormalities",
        title: `Bất thường mới: ${title}`,
        message: location ? `${auth.account.fullName} · ${location}` : auth.account.fullName
      }))
    );
  }
  return NextResponse.json({ ok: true, abnormalityId: item.id }, { status: 201 });
};

export const PATCH = async (request: Request): Promise<NextResponse> => {
  if (!isAllowedRequestOrigin(request)) return errorResponse(forbiddenOriginMessage, 403);
  const supabase = await createServerSupabaseClient();
  if (!supabase) return errorResponse("Chưa cấu hình Supabase cho bất thường.", 503);
  const auth = await getAuthenticatedAccount(request, supabase);
  if (!auth.ok) return errorResponse(auth.error, auth.status);
  if (!canManageBdttTasks(auth.account)) return errorResponse("Bạn không có quyền xử lý bất thường.", 403);

  const body = (await request.json()) as AbnormalityBody;
  const abnormalityId = text(body.abnormalityId);
  if (!isUuid(abnormalityId)) return errorResponse("Mã bất thường không hợp lệ.", 400);
  try {
    const [{ data: item, error: itemError }, snapshot, profileResult] = await Promise.all([
      supabase.from("bdtt_abnormalities").select("*").eq("id", abnormalityId).maybeSingle(),
      loadBdttSnapshot(supabase),
      supabase.from("profiles").select("id, username").eq("is_active", true)
    ]);
    if (itemError) throw new Error(itemError.message);
    if (profileResult.error) throw new Error(profileResult.error.message);
    if (!item) return errorResponse("Không tìm thấy bất thường.", 404);
    const scopedAccount = { ...auth.account, id: auth.profile.id };
    const task = item.task_id ? snapshot.tasks.find((entry) => entry.id === item.task_id) : null;
    const responsible = snapshot.profiles.find(
      (profile) => profile.id === (item.assigned_to || item.reported_by)
    );
    const inScope = task
      ? canViewTask(scopedAccount, task, snapshot.profiles)
      : responsible
        ? canViewProfile(scopedAccount, responsible)
        : false;
    if (!inScope) return errorResponse("Bất thường không thuộc phạm vi phụ trách.", 403);

    const currentStatus = item.status as AbnormalityStatus;
    const nextStatus = body.status ?? currentStatus;
    if (!statuses.includes(nextStatus) || !canTransitionAbnormality(currentStatus, nextStatus)) {
      return errorResponse("Chuyển trạng thái bất thường không hợp lệ.", 409);
    }
    const assignee = body.assigneeUsername
      ? (profileResult.data ?? []).find(
          (profile) => String(profile.username).toLowerCase() === body.assigneeUsername?.trim().toLowerCase()
        )
      : null;
    if (body.assigneeUsername && !assignee) return errorResponse("Người phụ trách không hợp lệ.", 400);
    const resolutionNote = text(body.resolutionNote);
    if ((nextStatus === "resolved" || nextStatus === "closed") && resolutionNote.length < 3) {
      return errorResponse("Cần nhập kết quả xử lý ít nhất 3 ký tự.", 400);
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("bdtt_abnormalities")
      .update({
        status: nextStatus,
        assigned_to: assignee?.id ?? item.assigned_to,
        resolution_note: resolutionNote || item.resolution_note,
        resolved_at: nextStatus === "resolved" ? now : item.resolved_at,
        closed_at: nextStatus === "closed" ? now : item.closed_at,
        updated_at: now
      })
      .eq("id", abnormalityId);
    if (error) throw new Error(error.message);
    await supabase.from("bdtt_abnormality_events").insert({
      abnormality_id: abnormalityId,
      event_type: nextStatus !== currentStatus ? "status_changed" : assignee ? "assigned" : "note_updated",
      actor_id: auth.profile.id,
      details: { from: currentStatus, to: nextStatus, assigned_to: assignee?.id, resolution_note: resolutionNote }
    });

    const recipients = Array.from(new Set([item.reported_by, item.assigned_to, assignee?.id]))
      .filter((id): id is string => Boolean(id) && id !== auth.profile.id);
    if (recipients.length > 0) {
      await supabase.from("app_notifications").insert(
        recipients.map((recipientId) => ({
          recipient_id: recipientId,
          module: "bdtt",
          event_type: "abnormality_updated",
          entity_id: abnormalityId,
          href: "/admin/tasks?tab=abnormalities",
          title: `Bất thường: ${item.title}`,
          message: `Trạng thái: ${nextStatus}${resolutionNote ? ` · ${resolutionNote}` : ""}`
        }))
      );
    }
    return NextResponse.json({ ok: true, abnormalityId, status: nextStatus });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Không cập nhật được bất thường.", 500);
  }
};
