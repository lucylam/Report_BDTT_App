import { NextResponse } from "next/server";
import {
  createAmNotifications,
  getAmApiContext,
  isUuid,
  listAmPeople
} from "@/lib/api/am";
import { forbiddenOriginMessage, isAllowedRequestOrigin } from "@/lib/api/security";

export const runtime = "nodejs";

interface UpdateTeamBody {
  readonly memberIds?: readonly string[];
}

interface DbMemberRole {
  readonly profile_id: string;
}

interface DbAssignedTask {
  readonly task_id: string;
}

const toErrorResponse = (error: string, status: number): NextResponse =>
  NextResponse.json({ ok: false, error }, { status });

export const PUT = async (request: Request): Promise<NextResponse> => {
  if (!isAllowedRequestOrigin(request)) {
    return toErrorResponse(forbiddenOriginMessage, 403);
  }

  const contextResult = await getAmApiContext(request);
  if (!contextResult.ok) return toErrorResponse(contextResult.error, contextResult.status);
  const { context } = contextResult;
  if (!context.permissions.canManageTeam) {
    return toErrorResponse("Chi To truong AM duoc thay doi danh sach to vien.", 403);
  }

  const body = (await request.json()) as UpdateTeamBody;
  const requestedIds = [...new Set(body.memberIds ?? [])].filter(isUuid);
  const peopleResult = await listAmPeople(context.supabase);
  if (peopleResult.error) return toErrorResponse(peopleResult.error, 500);
  const peopleById = new Map(peopleResult.people.map((person) => [person.id, person]));
  if (requestedIds.some((profileId) => !peopleById.has(profileId))) {
    return toErrorResponse("Danh sach to vien co tai khoan khong hop le.", 400);
  }
  if (
    requestedIds.some((profileId) => {
      const role = peopleById.get(profileId)?.amRole;
      return role === "leader" || role === "workshop_manager" || role === "web_admin";
    })
  ) {
    return toErrorResponse("Khong the thay doi vai tro quan ly trong danh sach to vien.", 400);
  }

  const { data: currentRows, error: currentError } = await context.supabase
    .from("am_module_roles")
    .select("profile_id")
    .eq("role", "member")
    .eq("is_active", true);
  if (currentError) return toErrorResponse(currentError.message, 500);

  const currentIds = ((currentRows ?? []) as DbMemberRole[]).map((row) => row.profile_id);
  const requestedSet = new Set(requestedIds);
  const currentSet = new Set(currentIds);
  const addedIds = requestedIds.filter((profileId) => !currentSet.has(profileId));
  const removedIds = currentIds.filter((profileId) => !requestedSet.has(profileId));

  if (removedIds.length > 0) {
    const { data: assignedRows, error: assignedError } = await context.supabase
      .from("am_task_assignees")
      .select("task_id")
      .in("profile_id", removedIds);
    if (assignedError) return toErrorResponse(assignedError.message, 500);
    const taskIds = [...new Set(((assignedRows ?? []) as DbAssignedTask[]).map((row) => row.task_id))];
    const { data: openTasks, error: openTaskError } = taskIds.length > 0
      ? await context.supabase
          .from("am_tasks")
          .select("id")
          .in("id", taskIds)
          .neq("status", "approved")
          .limit(1)
      : { data: [], error: null };
    if (openTaskError) return toErrorResponse(openTaskError.message, 500);
    if ((openTasks ?? []).length > 0) {
      return toErrorResponse(
        "Can phan cong lai cac nhiem vu chua duyet truoc khi rut thanh vien khoi To AM.",
        409
      );
    }
  }

  if (removedIds.length > 0) {
    const { error } = await context.supabase
      .from("am_module_roles")
      .delete()
      .eq("role", "member")
      .in("profile_id", removedIds);
    if (error) return toErrorResponse(error.message, 500);
  }
  if (addedIds.length > 0) {
    const { error } = await context.supabase.from("am_module_roles").upsert(
      addedIds.map((profileId) => ({
        profile_id: profileId,
        role: "member",
        is_active: true,
        assigned_by: context.profile.id,
        updated_at: new Date().toISOString()
      })),
      { onConflict: "profile_id" }
    );
    if (error) return toErrorResponse(error.message, 500);
  }

  await Promise.all([
    createAmNotifications(
      context.supabase,
      addedIds,
      {
        eventType: "team_member_added",
        title: "Đã thêm vào Tổ AM",
        message: "Bạn đã được Tổ trưởng thêm vào danh sách thực hiện công tác AM."
      },
      context.profile.id
    ),
    createAmNotifications(
      context.supabase,
      removedIds,
      {
        eventType: "team_member_removed",
        title: "Đã cập nhật danh sách Tổ AM",
        message: "Bạn không còn nằm trong danh sách tổ viên AM cố định."
      },
      context.profile.id
    )
  ]);

  return NextResponse.json({ ok: true, added: addedIds.length, removed: removedIds.length });
};
