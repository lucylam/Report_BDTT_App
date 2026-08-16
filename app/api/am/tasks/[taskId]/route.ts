import { NextResponse } from "next/server";
import {
  addAmEvent,
  canReportAmTask,
  createAmNotifications,
  getAmApiContext,
  isActiveAmTeamMember,
  isUuid,
  listAmPeople,
  listAmSupervisorIds,
  normalizeAmText
} from "@/lib/api/am";
import { forbiddenOriginMessage, isAllowedRequestOrigin } from "@/lib/api/security";
import { isAmAssignee } from "@/lib/amPersonnel";

export const runtime = "nodejs";

type TaskAction = "update_report" | "submit" | "review" | "reassign";

interface UpdateTaskBody {
  readonly action?: TaskAction;
  readonly performerNote?: string;
  readonly supervisorNote?: string;
  readonly reviewStatus?: "approved" | "needsRevision";
  readonly assigneeIds?: readonly string[];
}

interface DbTaskState {
  readonly id: string;
  readonly request_content: string;
  readonly status: "assigned" | "in_progress" | "submitted" | "needs_revision" | "approved";
  readonly created_by: string;
}

interface DbAssignee {
  readonly profile_id: string;
}

const toErrorResponse = (error: string, status: number): NextResponse =>
  NextResponse.json({ ok: false, error }, { status });

export const PATCH = async (
  request: Request,
  { params }: { readonly params: Promise<{ readonly taskId: string }> }
): Promise<NextResponse> => {
  if (!isAllowedRequestOrigin(request)) {
    return toErrorResponse(forbiddenOriginMessage, 403);
  }

  const { taskId } = await params;
  if (!isUuid(taskId)) return toErrorResponse("Ma nhiem vu AM khong hop le.", 400);
  const contextResult = await getAmApiContext(request);
  if (!contextResult.ok) return toErrorResponse(contextResult.error, contextResult.status);
  const { context } = contextResult;
  const body = (await request.json()) as UpdateTaskBody;

  const [{ data: taskData, error: taskError }, { data: assigneeData, error: assigneeError }] =
    await Promise.all([
      context.supabase
        .from("am_tasks")
        .select("id, request_content, status, created_by")
        .eq("id", taskId)
        .maybeSingle(),
      context.supabase
        .from("am_task_assignees")
        .select("profile_id")
        .eq("task_id", taskId)
    ]);
  if (taskError) return toErrorResponse(taskError.message, 500);
  if (assigneeError) return toErrorResponse(assigneeError.message, 500);
  if (!taskData) return toErrorResponse("Khong tim thay nhiem vu AM.", 404);

  const task = taskData as DbTaskState;
  const currentAssigneeIds = ((assigneeData ?? []) as DbAssignee[]).map(
    (row) => row.profile_id
  );
  const isAssignee = await canReportAmTask(context, taskId);

  if (body.action === "update_report") {
    if (!isAssignee) return toErrorResponse("Chi nguoi duoc giao moi duoc bao cao.", 403);
    if (task.status !== "assigned" && task.status !== "in_progress" && task.status !== "needs_revision") {
      return toErrorResponse("Bao cao dang cho duyet hoac da duyet, khong the sua.", 409);
    }
    const performerNote = normalizeAmText(body.performerNote, 4000);
    const nextStatus = task.status === "assigned" ? "in_progress" : task.status;
    const { error } = await context.supabase
      .from("am_tasks")
      .update({
        performer_note: performerNote,
        status: nextStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", taskId);
    if (error) return toErrorResponse(error.message, 500);
    await addAmEvent(context.supabase, taskId, "report_updated", context.profile.id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "submit") {
    if (!isAssignee) return toErrorResponse("Chi nguoi duoc giao moi duoc gui bao cao.", 403);
    if (task.status !== "assigned" && task.status !== "in_progress" && task.status !== "needs_revision") {
      return toErrorResponse("Trang thai nhiem vu khong cho phep gui bao cao.", 409);
    }
    const { data: photos, error: photoError } = await context.supabase
      .from("am_task_photos")
      .select("kind")
      .eq("task_id", taskId);
    if (photoError) return toErrorResponse(photoError.message, 500);
    const kinds = new Set((photos ?? []).map((photo) => String(photo.kind)));
    if (!kinds.has("before") || !kinds.has("after")) {
      return toErrorResponse("Can co it nhat mot anh truoc va mot anh sau.", 400);
    }
    const now = new Date().toISOString();
    const { error } = await context.supabase
      .from("am_tasks")
      .update({
        status: "submitted",
        submitted_by: context.profile.id,
        submitted_at: now,
        updated_at: now
      })
      .eq("id", taskId);
    if (error) return toErrorResponse(error.message, 500);
    const supervisorIds = await listAmSupervisorIds(context.supabase);
    await Promise.all([
      addAmEvent(context.supabase, taskId, "submitted", context.profile.id),
      createAmNotifications(
        context.supabase,
        [...supervisorIds, task.created_by],
        {
          eventType: "report_submitted",
          taskId,
          title: "Báo cáo AM chờ duyệt",
          message: task.request_content
        },
        context.profile.id
      )
    ]);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "review") {
    if (!context.permissions.canReview) {
      return toErrorResponse("Khong co quyen duyet bao cao AM.", 403);
    }
    if (task.status !== "submitted") {
      return toErrorResponse("Chi bao cao da gui moi duoc duyet.", 409);
    }
    const status = body.reviewStatus;
    if (status !== "approved" && status !== "needsRevision") {
      return toErrorResponse("Ket qua duyet khong hop le.", 400);
    }
    const supervisorNote = normalizeAmText(body.supervisorNote, 4000);
    if (status === "needsRevision" && supervisorNote.length < 3) {
      return toErrorResponse("Can ghi ro noi dung yeu cau bo sung.", 400);
    }
    const now = new Date().toISOString();
    const { error } = await context.supabase
      .from("am_tasks")
      .update({
        status: status === "needsRevision" ? "needs_revision" : "approved",
        supervisor_note: supervisorNote,
        reviewed_by: context.profile.id,
        reviewed_at: now,
        updated_at: now
      })
      .eq("id", taskId);
    if (error) return toErrorResponse(error.message, 500);
    await Promise.all([
      addAmEvent(context.supabase, taskId, status, context.profile.id, {
        supervisorNote
      }),
      createAmNotifications(
        context.supabase,
        currentAssigneeIds,
        {
          eventType: status === "approved" ? "report_approved" : "report_needs_revision",
          taskId,
          title: status === "approved" ? "Báo cáo AM đã được duyệt" : "Báo cáo AM cần bổ sung",
          message: supervisorNote || task.request_content
        },
        context.profile.id
      )
    ]);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "reassign") {
    if (!context.permissions.canAssign) {
      return toErrorResponse("Khong co quyen phan cong lai nhiem vu AM.", 403);
    }
    if (task.status === "approved") {
      return toErrorResponse("Nhiem vu da duyet khong the phan cong lai.", 409);
    }
    const assigneeIds = [...new Set(body.assigneeIds ?? [])].filter(isUuid);
    if (assigneeIds.length === 0) {
      return toErrorResponse("Can chon it nhat mot nguoi thuc hien.", 400);
    }
    const peopleResult = await listAmPeople(context.supabase);
    if (peopleResult.error) return toErrorResponse(peopleResult.error, 500);
    const peopleById = new Map(peopleResult.people.map((person) => [person.id, person]));
    const assignees = assigneeIds.map((id) => peopleById.get(id));
    if (assignees.some((person) => !person)) {
      return toErrorResponse("Danh sach nguoi thuc hien co tai khoan khong hop le.", 400);
    }
    if (assignees.some((person) => person && !isAmAssignee(person))) {
      return toErrorResponse("Nhan su thuc hien khong nam trong danh sach AM.", 400);
    }
    if (
      !context.permissions.canAssignOutsideTeam &&
      assignees.some((person) => person && !isActiveAmTeamMember(person))
    ) {
      return toErrorResponse("To truong AM chi duoc giao cho thanh vien dang hoat dong.", 403);
    }

    const oldSet = new Set(currentAssigneeIds);
    const nextSet = new Set(assigneeIds);
    const addedIds = assigneeIds.filter((id) => !oldSet.has(id));
    const removedIds = currentAssigneeIds.filter((id) => !nextSet.has(id));
    if (addedIds.length > 0) {
      const { error: insertError } = await context.supabase
        .from("am_task_assignees")
        .insert(
          addedIds.map((profileId) => ({
            task_id: taskId,
            profile_id: profileId,
            assigned_by: context.profile.id
          }))
        );
      if (insertError) return toErrorResponse(insertError.message, 500);
    }
    if (removedIds.length > 0) {
      const { error: deleteError } = await context.supabase
        .from("am_task_assignees")
        .delete()
        .eq("task_id", taskId)
        .in("profile_id", removedIds);
      if (deleteError) return toErrorResponse(deleteError.message, 500);
    }
    await Promise.all([
      addAmEvent(context.supabase, taskId, "reassigned", context.profile.id, {
        assigneeIds,
        removedIds
      }),
      createAmNotifications(
        context.supabase,
        addedIds,
        {
          eventType: "task_reassigned",
          taskId,
          title: "Bạn được phân công nhiệm vụ AM",
          message: task.request_content
        },
        context.profile.id
      ),
      createAmNotifications(
        context.supabase,
        removedIds,
        {
          eventType: "task_unassigned",
          taskId,
          title: "Đã điều chỉnh phân công AM",
          message: `Bạn không còn được giao: ${task.request_content}`
        },
        context.profile.id
      )
    ]);
    return NextResponse.json({ ok: true });
  }

  return toErrorResponse("Hanh dong AM khong hop le.", 400);
};
