import { NextResponse } from "next/server";
import {
  AM_PHOTO_BUCKET,
  AM_SIGNED_URL_TTL_SECONDS,
  getAmApiContext,
  listAmPeople
} from "@/lib/api/am";
import { forbiddenOriginMessage, isAllowedRequestOrigin } from "@/lib/api/security";
import type {
  AmActivity,
  AmActivityStatus,
  AmEvent,
  AmPhoto
} from "@/lib/amActivity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DbAssignee {
  readonly profile_id: string;
}

interface DbPhoto {
  readonly id: string;
  readonly kind: "before" | "after";
  readonly storage_path: string;
  readonly uploaded_by: string;
  readonly created_at: string;
}

interface DbTask {
  readonly id: string;
  readonly request_content: string;
  readonly location_tag: string;
  readonly scheduled_date: string;
  readonly status: string;
  readonly performer_note: string;
  readonly supervisor_note: string;
  readonly created_by: string;
  readonly submitted_by: string | null;
  readonly submitted_at: string | null;
  readonly reviewed_by: string | null;
  readonly reviewed_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly am_task_assignees: DbAssignee[];
  readonly am_task_photos: DbPhoto[];
}

interface DbEvent {
  readonly id: string;
  readonly task_id: string;
  readonly event_type: string;
  readonly actor_id: string;
  readonly details: Record<string, unknown> | null;
  readonly created_at: string;
}

const toErrorResponse = (error: string, status: number): NextResponse =>
  NextResponse.json({ ok: false, error }, { status });

const toStatus = (value: string): AmActivityStatus => {
  if (value === "in_progress") return "inProgress";
  if (value === "needs_revision") return "needsRevision";
  if (value === "submitted" || value === "approved") return value;
  return "assigned";
};

export const GET = async (request: Request): Promise<NextResponse> => {
  if (!isAllowedRequestOrigin(request)) {
    return toErrorResponse(forbiddenOriginMessage, 403);
  }

  const contextResult = await getAmApiContext(request);
  if (!contextResult.ok) {
    return toErrorResponse(contextResult.error, contextResult.status);
  }
  const { context } = contextResult;
  if (!context.permissions.canAccess) {
    return toErrorResponse("Tai khoan chua duoc them vao phan he AM.", 403);
  }

  const [peopleResult, tasksResult] = await Promise.all([
    listAmPeople(context.supabase),
    context.supabase
      .from("am_tasks")
      .select(
        [
          "id",
          "request_content",
          "location_tag",
          "scheduled_date",
          "status",
          "performer_note",
          "supervisor_note",
          "created_by",
          "submitted_by",
          "submitted_at",
          "reviewed_by",
          "reviewed_at",
          "created_at",
          "updated_at",
          "am_task_assignees(profile_id)",
          "am_task_photos(id, kind, storage_path, uploaded_by, created_at)"
        ].join(", ")
      )
      .order("scheduled_date", { ascending: false })
      .order("created_at", { ascending: false })
  ]);

  if (peopleResult.error) return toErrorResponse(peopleResult.error, 500);
  if (tasksResult.error) return toErrorResponse(tasksResult.error.message, 500);

  const allTasks = (tasksResult.data ?? []) as unknown as DbTask[];
  const visibleTasks = context.permissions.canViewAll
    ? allTasks
    : allTasks.filter((task) =>
        task.am_task_assignees.some(
          (assignee) => assignee.profile_id === context.profile.id
        )
      );

  const visibleTaskIds = visibleTasks.map((task) => task.id);
  const eventsResult = visibleTaskIds.length > 0
    ? await context.supabase
        .from("am_task_events")
        .select("id, task_id, event_type, actor_id, details, created_at")
        .in("task_id", visibleTaskIds)
        .order("created_at", { ascending: false })
    : { data: [], error: null };
  if (eventsResult.error) return toErrorResponse(eventsResult.error.message, 500);

  const personNameById = new Map(
    peopleResult.people.map((person) => [person.id, person.fullName])
  );
  const eventsByTaskId = new Map<string, AmEvent[]>();
  ((eventsResult.data ?? []) as DbEvent[]).forEach((event) => {
    const item: AmEvent = {
      id: event.id,
      taskId: event.task_id,
      eventType: event.event_type,
      actorId: event.actor_id,
      actorName: personNameById.get(event.actor_id) ?? "Tài khoản nội bộ",
      details: event.details ?? {},
      createdAt: event.created_at
    };
    eventsByTaskId.set(event.task_id, [...(eventsByTaskId.get(event.task_id) ?? []), item]);
  });

  const signedUrlByPath = new Map<string, string>();
  await Promise.all(
    visibleTasks.flatMap((task) =>
      task.am_task_photos.map(async (photo) => {
        const { data } = await context.supabase.storage
          .from(AM_PHOTO_BUCKET)
          .createSignedUrl(photo.storage_path, AM_SIGNED_URL_TTL_SECONDS);
        if (data?.signedUrl) signedUrlByPath.set(photo.storage_path, data.signedUrl);
      })
    )
  );

  const toPhoto = (photo: DbPhoto): AmPhoto | null => {
    const url = signedUrlByPath.get(photo.storage_path);
    return url
      ? {
          id: photo.id,
          url,
          uploadedBy: photo.uploaded_by,
          createdAt: photo.created_at
        }
      : null;
  };

  const activities: AmActivity[] = visibleTasks.map((task) => ({
    id: task.id,
    requestContent: task.request_content,
    locationTag: task.location_tag,
    assigneeIds: task.am_task_assignees.map((assignee) => assignee.profile_id),
    scheduledDate: task.scheduled_date,
    status: toStatus(task.status),
    beforePhotos: task.am_task_photos
      .filter((photo) => photo.kind === "before")
      .map(toPhoto)
      .filter((photo): photo is AmPhoto => Boolean(photo)),
    afterPhotos: task.am_task_photos
      .filter((photo) => photo.kind === "after")
      .map(toPhoto)
      .filter((photo): photo is AmPhoto => Boolean(photo)),
    performerNote: task.performer_note,
    supervisorNote: task.supervisor_note,
    createdBy: task.created_by,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
    submittedAt: task.submitted_at ?? undefined,
    approvedAt: task.reviewed_at ?? undefined,
    submittedBy: task.submitted_by ?? undefined,
    approvedBy: task.reviewed_by ?? undefined,
    events: eventsByTaskId.get(task.id) ?? []
  }));

  return NextResponse.json({
    ok: true,
    actorProfileId: context.profile.id,
    permissions: context.permissions,
    people: peopleResult.people,
    activities
  });
};
