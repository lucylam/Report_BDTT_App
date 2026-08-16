import { NextResponse } from "next/server";
import {
  addAmEvent,
  createAmNotifications,
  getAmApiContext,
  isActiveAmTeamMember,
  isUuid,
  listAmPeople,
  normalizeAmText
} from "@/lib/api/am";
import { forbiddenOriginMessage, isAllowedRequestOrigin } from "@/lib/api/security";
import { isAmAssignee } from "@/lib/amPersonnel";

export const runtime = "nodejs";

interface CreateTaskBody {
  readonly requestContent?: string;
  readonly locationTag?: string;
  readonly scheduledDate?: string;
  readonly assigneeIds?: readonly string[];
}

const toErrorResponse = (error: string, status: number): NextResponse =>
  NextResponse.json({ ok: false, error }, { status });

export const POST = async (request: Request): Promise<NextResponse> => {
  if (!isAllowedRequestOrigin(request)) {
    return toErrorResponse(forbiddenOriginMessage, 403);
  }

  const contextResult = await getAmApiContext(request);
  if (!contextResult.ok) return toErrorResponse(contextResult.error, contextResult.status);
  const { context } = contextResult;
  if (!context.permissions.canAssign) {
    return toErrorResponse("Khong co quyen giao nhiem vu AM.", 403);
  }

  const body = (await request.json()) as CreateTaskBody;
  const requestContent = normalizeAmText(body.requestContent, 2000);
  const locationTag = normalizeAmText(body.locationTag, 120);
  const scheduledDate = normalizeAmText(body.scheduledDate, 10);
  const assigneeIds = [...new Set(body.assigneeIds ?? [])].filter(isUuid);
  if (!requestContent) return toErrorResponse("Can nhap noi dung yeu cau.", 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
    return toErrorResponse("Ngay thuc hien khong hop le.", 400);
  }
  if (assigneeIds.length === 0) {
    return toErrorResponse("Can chon it nhat mot nguoi thuc hien.", 400);
  }

  const peopleResult = await listAmPeople(context.supabase);
  if (peopleResult.error) return toErrorResponse(peopleResult.error, 500);
  const peopleById = new Map(peopleResult.people.map((person) => [person.id, person]));
  const assignees = assigneeIds
    .map((profileId) => peopleById.get(profileId))
    .filter((person): person is NonNullable<typeof person> => Boolean(person));
  if (assignees.length !== assigneeIds.length) {
    return toErrorResponse("Danh sach nguoi thuc hien co tai khoan khong hop le.", 400);
  }
  if (assignees.some((person) => !isAmAssignee(person))) {
    return toErrorResponse("Nhan su thuc hien khong nam trong danh sach AM.", 400);
  }
  if (
    !context.permissions.canAssignOutsideTeam &&
    assignees.some((person) => !isActiveAmTeamMember(person))
  ) {
    return toErrorResponse("To truong AM chi duoc giao cho thanh vien dang hoat dong.", 403);
  }

  const { data: task, error: taskError } = await context.supabase
    .from("am_tasks")
    .insert({
      request_content: requestContent,
      location_tag: locationTag,
      scheduled_date: scheduledDate,
      created_by: context.profile.id
    })
    .select("id")
    .single();
  if (taskError || !task?.id) {
    return toErrorResponse(taskError?.message || "Khong tao duoc nhiem vu AM.", 500);
  }

  const taskId = String(task.id);
  const { error: assigneeError } = await context.supabase
    .from("am_task_assignees")
    .insert(
      assigneeIds.map((profileId) => ({
        task_id: taskId,
        profile_id: profileId,
        assigned_by: context.profile.id
      }))
    );
  if (assigneeError) {
    await context.supabase.from("am_tasks").delete().eq("id", taskId);
    return toErrorResponse(assigneeError.message, 500);
  }

  await Promise.all([
    addAmEvent(context.supabase, taskId, "assigned", context.profile.id, {
      assigneeIds
    }),
    createAmNotifications(
      context.supabase,
      assigneeIds,
      {
        eventType: "task_assigned",
        taskId,
        title: "Nhiệm vụ AM mới",
        message: `${requestContent}${locationTag ? ` · ${locationTag}` : ""}`
      },
      context.profile.id
    )
  ]);

  return NextResponse.json({ ok: true, taskId }, { status: 201 });
};
