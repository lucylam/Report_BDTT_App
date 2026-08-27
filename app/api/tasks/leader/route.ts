import { NextResponse } from "next/server";
import {
  applyAccountProfileOverrides,
  createProfilesFromAccounts,
  createSeedAccounts,
  getLoginUsername
} from "@/lib/accounts";
import { getAuthenticatedAccount, isUuid } from "@/lib/api/session";
import { forbiddenOriginMessage, isAllowedRequestOrigin } from "@/lib/api/security";
import {
  getActiveBdttTrialRun,
  saveBdttTrialTaskBackup
} from "@/lib/api/demoMode";
import { writeBdttTaskEvent } from "@/lib/api/taskEvents";
import { getMissingLeaderTaskCreateFields } from "@/lib/leaderTaskCreate";
import {
  canManageBdttTasks,
  canViewProfile,
  hasFullOrgScope
} from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isPercentAllowedForMode } from "@/lib/progressMode";
import { resolveReportDateAtSubmission } from "@/lib/date";
import { resolveTaskReporterId } from "@/lib/taskReporter";
import type { AuthAccount, Profile } from "@/types/domain";

export const runtime = "nodejs";

type LeaderAction = "create" | "reassign" | "cancel" | "updateReport";

interface LeaderTaskBody {
  readonly action?: LeaderAction;
  readonly taskId?: string;
  readonly assigneeUsername?: string;
  readonly reporterUsername?: string;
  readonly cancelReason?: string;
  readonly reportDate?: string;
  readonly percent?: number;
  readonly note?: string;
  readonly task?: {
    readonly taskName?: string;
    readonly wo?: string;
    readonly tagname?: string;
    readonly nhom?: string;
    readonly donVi?: string;
    readonly section?: string;
    readonly duration?: string;
    readonly priority?: number;
    readonly startDate?: string;
    readonly finishDate?: string;
    readonly progressMode?: "continuous" | "binary";
  };
}

interface DbProfile {
  readonly id: string;
  readonly username: string | null;
  readonly resource_name: string | null;
  readonly role: string | null;
  readonly org_group: string | null;
  readonly subgroup: string | null;
  readonly org_role: string | null;
}

interface DbTask {
  readonly id: string;
  readonly assigned_to: string | null;
  readonly reporter_id: string | null;
  readonly resource_name: string | null;
  readonly nhom_truong: string | null;
  readonly is_cancelled: boolean | null;
  readonly progress_mode?: "continuous" | "binary" | null;
}

interface TeamMember {
  readonly account: AuthAccount;
  readonly profile: Profile;
  readonly db: DbProfile;
}

const normalizeText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const normalizeComparable = (value: unknown): string =>
  normalizeText(value).replace(/\s+/g, " ").toLocaleLowerCase("vi");

const toErrorResponse = (error: string, status: number): NextResponse =>
  NextResponse.json({ ok: false, error }, { status });

const isDateText = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

const isPriority = (value: unknown): value is 1 | 2 | 3 =>
  value === 1 || value === 2 || value === 3;

const buildTeamMembers = (
  dbProfiles: readonly DbProfile[]
): TeamMember[] => {
  const accounts = applyAccountProfileOverrides(
    createSeedAccounts(),
    dbProfiles.map((profile) => ({
      ...profile,
      role:
        profile.role === "admin" || profile.role === "worker"
          ? profile.role
          : null
    }))
  );
  const profiles = createProfilesFromAccounts(accounts);
  const profileByUsername = new Map(
    profiles.map((profile) => [getLoginUsername(profile.username), profile])
  );
  const accountByUsername = new Map(
    accounts.map((account) => [getLoginUsername(account.username), account])
  );

  return dbProfiles.flatMap((dbProfile) => {
    const username = getLoginUsername(dbProfile.username ?? "");
    const account = accountByUsername.get(username);
    const profile = profileByUsername.get(username);
    return account && profile ? [{ account, profile, db: dbProfile }] : [];
  });
};

const findMember = (
  members: readonly TeamMember[],
  username: unknown
): TeamMember | null => {
  const normalizedUsername = getLoginUsername(normalizeText(username));
  return (
    members.find(
      (member) => getLoginUsername(member.account.username) === normalizedUsername
    ) ?? null
  );
};

const resolveTeamReporter = (
  assignee: TeamMember | null,
  members: readonly TeamMember[]
): TeamMember | null => {
  if (!assignee) return null;
  const reporterId = resolveTaskReporterId(
    assignee.db.id,
    members.map((member) => ({
      id: member.db.id,
      orgGroup: member.profile.orgGroup,
      subgroup: member.profile.subgroup,
      orgRole: member.profile.orgRole
    }))
  );
  return members.find((member) => member.db.id === reporterId) ?? assignee;
};

const canManageMember = (manager: AuthAccount, member: TeamMember): boolean =>
  canViewProfile(manager, member.profile);

const canManageTask = (
  manager: AuthAccount,
  task: DbTask,
  members: readonly TeamMember[]
): boolean => {
  if (hasFullOrgScope(manager)) return true;
  const responsibleIds = [task.assigned_to, task.reporter_id].filter(Boolean);
  if (
    responsibleIds.some((profileId) => {
      const member = members.find((item) => item.db.id === profileId);
      return member ? canManageMember(manager, member) : false;
    })
  ) {
    return true;
  }

  return [manager.fullName, manager.resourceName].some(
    (name) =>
      normalizeComparable(name) &&
      normalizeComparable(name) === normalizeComparable(task.nhom_truong)
  );
};

const getTask = async (
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  taskId: string
): Promise<{ readonly task: DbTask | null; readonly error: string | null }> => {
  if (!isUuid(taskId)) return { task: null, error: "Mã task không hợp lệ." };
  const { data, error } = await supabase
    .from("tasks")
    .select("id, assigned_to, reporter_id, resource_name, nhom_truong, is_cancelled, progress_mode")
    .eq("id", taskId)
    .maybeSingle();
  return {
    task: (data as DbTask | null) ?? null,
    error: error?.message ?? null
  };
};

const writeEvent = async (
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  taskId: string,
  eventType: "created_ad_hoc" | "reassigned" | "cancelled" | "report_updated",
  actorId: string,
  details: Record<string, unknown>,
  trialRunId: string | null
): Promise<void> => {
  const error = await writeBdttTaskEvent(supabase, {
    taskId,
    eventType,
    actorId,
    details,
    trialRunId
  });
  if (error) console.error("[api/tasks/leader.writeEvent]", error);
};

const notifyProfiles = async (
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  recipientIds: readonly (string | null | undefined)[],
  actorId: string,
  taskId: string,
  eventType: string,
  title: string,
  message: string,
  trialRunId: string | null
): Promise<void> => {
  const recipients = Array.from(
    new Set(recipientIds.filter((id): id is string => Boolean(id) && id !== actorId))
  );
  if (recipients.length === 0) return;
  const { error } = await supabase.from("app_notifications").insert(
    recipients.map((recipientId) => ({
      recipient_id: recipientId,
      module: "bdtt",
      event_type: eventType,
      entity_id: taskId,
      href: `/worker?task=${taskId}`,
      title,
      message,
      trial_run_id: trialRunId
    }))
  );
  if (error) console.error("[api/tasks/leader.notifyProfiles]", error.message);
};

export const POST = async (request: Request): Promise<NextResponse> => {
  if (!isAllowedRequestOrigin(request)) {
    return toErrorResponse(forbiddenOriginMessage, 403);
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return toErrorResponse("Chưa cấu hình Supabase server cho quản lý task.", 503);
  }

  const auth = await getAuthenticatedAccount(request, supabase);
  if (!auth.ok) return toErrorResponse(auth.error, auth.status);
  if (!canManageBdttTasks(auth.account)) {
    return toErrorResponse("Chỉ nhóm trưởng hoặc cấp quản lý cao hơn được quản lý task.", 403);
  }

  const trialRun = await getActiveBdttTrialRun(supabase);
  const trialRunId = trialRun?.id ?? null;

  const body = (await request.json()) as LeaderTaskBody;
  const action = body.action;
  if (!action || !["create", "reassign", "cancel", "updateReport"].includes(action)) {
    return toErrorResponse("Thiếu hoặc sai thao tác quản lý task.", 400);
  }

  const { data: dbProfileRows, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, resource_name, role, org_group, subgroup, org_role")
    .eq("is_active", true);
  if (profileError) return toErrorResponse(profileError.message, 500);

  const members = buildTeamMembers((dbProfileRows ?? []) as DbProfile[]);
  const assignee = findMember(members, body.assigneeUsername);
  const reporter = resolveTeamReporter(assignee, members);

  if (action === "create") {
    const taskInput = body.task;
    const taskName = normalizeText(taskInput?.taskName);
    const tagname = normalizeText(taskInput?.tagname);
    const wo = normalizeText(taskInput?.wo);
    const donVi = normalizeText(taskInput?.donVi);
    const section = normalizeText(taskInput?.section);
    const startDate = normalizeText(taskInput?.startDate);
    const finishDate = normalizeText(taskInput?.finishDate);
    const missingFields = getMissingLeaderTaskCreateFields({
      taskName,
      tagname,
      wo,
      donVi,
      section,
      startDate,
      finishDate,
      priority: taskInput?.priority,
      progressMode: taskInput?.progressMode,
      assigneeUsername: body.assigneeUsername,
      reporterUsername: reporter?.account.username
    });
    if (missingFields.length > 0) {
      return toErrorResponse(
        `Cần nhập hoặc chọn đầy đủ: ${missingFields.join(", ")}.`,
        400
      );
    }
    if (taskName.length < 3 || tagname.length < 2) {
      return toErrorResponse("Task phát sinh cần có tên công việc và tagname.", 400);
    }
    if (!assignee || !reporter) {
      return toErrorResponse("Cần chọn người thực hiện và người báo cáo hợp lệ.", 400);
    }
    if (!canManageMember(auth.account, assignee)) {
      return toErrorResponse("Không thể giao task cho người ngoài phạm vi phụ trách.", 403);
    }
    if (!isDateText(startDate) || !isDateText(finishDate)) {
      return toErrorResponse("Ngày bắt đầu hoặc ngày kết thúc không hợp lệ.", 400);
    }
    if (finishDate < startDate) {
      return toErrorResponse("Ngày kết thúc phải từ ngày bắt đầu trở đi.", 400);
    }

    const { data: latestTask } = await supabase
      .from("tasks")
      .select("stt")
      .order("stt", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextStt = Number((latestTask as { stt?: number | null } | null)?.stt ?? 0) + 1;
    const priority = taskInput?.priority;
    const progressMode = taskInput?.progressMode;
    if (!isPriority(priority) || (progressMode !== "continuous" && progressMode !== "binary")) {
      return toErrorResponse("Mức ưu tiên hoặc chế độ tiến độ không hợp lệ.", 400);
    }
    const now = new Date().toISOString();
    const { data: insertedTask, error } = await supabase
      .from("tasks")
      .insert({
        stt: nextStt,
        wo,
        tagname,
        task_name: taskName,
        nhom: normalizeText(taskInput?.nhom) || assignee.profile.subgroup || assignee.profile.orgGroup,
        don_vi: donVi,
        section,
        duration: normalizeText(taskInput?.duration),
        priority,
        start_date: startDate,
        finish_date: finishDate,
        resource_name: assignee.db.resource_name || assignee.account.resourceName,
        nhom_truong: auth.account.fullName,
        assigned_to: assignee.db.id,
        reporter_id: reporter.db.id,
        task_source: "ad_hoc",
        progress_mode: progressMode,
        created_by: auth.profile.id,
        updated_by: auth.profile.id,
        is_cancelled: false,
        cancel_reason: "",
        created_at: now,
        updated_at: now,
        trial_run_id: trialRunId
      })
      .select("id")
      .single();
    if (error) return toErrorResponse(error.message, 500);
    const taskId = (insertedTask as { id: string }).id;
    await writeEvent(supabase, taskId, "created_ad_hoc", auth.profile.id, {
      assignee_id: assignee.db.id,
      reporter_id: reporter.db.id
    }, trialRunId);
    await notifyProfiles(
      supabase,
      [assignee.db.id, reporter.db.id],
      auth.profile.id,
      taskId,
      "task_created",
      `Task phát sinh: ${tagname}`,
      `${auth.account.fullName} đã giao task “${taskName}”.`,
      trialRunId
    );
    return NextResponse.json({ ok: true, taskId });
  }

  const taskId = normalizeText(body.taskId);
  const taskResult = await getTask(supabase, taskId);
  if (taskResult.error) return toErrorResponse(taskResult.error, 400);
  if (!taskResult.task) return toErrorResponse("Không tìm thấy task.", 404);
  if (!canManageTask(auth.account, taskResult.task, members)) {
    return toErrorResponse("Task không thuộc phạm vi nhóm phụ trách.", 403);
  }

  if (action === "reassign") {
    if (!assignee || !reporter) {
      return toErrorResponse("Cần chọn người thực hiện và người báo cáo hợp lệ.", 400);
    }
    if (!canManageMember(auth.account, assignee)) {
      return toErrorResponse("Không thể phân công người ngoài phạm vi phụ trách.", 403);
    }
    if (taskResult.task.is_cancelled) {
      return toErrorResponse("Task đã hủy, không thể phân công lại.", 409);
    }

    await saveBdttTrialTaskBackup(supabase, trialRunId, taskId);
    const { error } = await supabase
      .from("tasks")
      .update({
        assigned_to: assignee.db.id,
        reporter_id: reporter.db.id,
        resource_name: assignee.db.resource_name || assignee.account.resourceName,
        updated_by: auth.profile.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", taskId);
    if (error) return toErrorResponse(error.message, 500);
    await writeEvent(supabase, taskId, "reassigned", auth.profile.id, {
      previous_assignee_id: taskResult.task.assigned_to,
      previous_reporter_id: taskResult.task.reporter_id,
      assignee_id: assignee.db.id,
      reporter_id: reporter.db.id
    }, trialRunId);
    await notifyProfiles(
      supabase,
      [
        taskResult.task.assigned_to,
        taskResult.task.reporter_id,
        assignee.db.id,
        reporter.db.id
      ],
      auth.profile.id,
      taskId,
      "task_reassigned",
      "Thay đổi phân công WorkOrder",
      `${auth.account.fullName} đã cập nhật người thực hiện hoặc người báo cáo.`,
      trialRunId
    );
    return NextResponse.json({ ok: true, taskId });
  }

  if (action === "cancel") {
    const cancelReason = normalizeText(body.cancelReason);
    if (cancelReason.length < 3) {
      return toErrorResponse("Lý do hủy phải có ít nhất 3 ký tự.", 400);
    }
    if (taskResult.task.is_cancelled) {
      return toErrorResponse("Task đã được hủy trước đó.", 409);
    }
    await saveBdttTrialTaskBackup(supabase, trialRunId, taskId);
    const { error } = await supabase
      .from("tasks")
      .update({
        is_cancelled: true,
        cancel_reason: cancelReason,
        updated_by: auth.profile.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", taskId);
    if (error) return toErrorResponse(error.message, 500);
    await writeEvent(supabase, taskId, "cancelled", auth.profile.id, {
      reason: cancelReason
    }, trialRunId);
    await notifyProfiles(
      supabase,
      [taskResult.task.assigned_to, taskResult.task.reporter_id],
      auth.profile.id,
      taskId,
      "task_cancelled",
      "Task đã được hủy",
      `${auth.account.fullName}: ${cancelReason}`,
      trialRunId
    );
    return NextResponse.json({ ok: true, taskId });
  }

  const currentAssignee =
    members.find((member) => member.db.id === taskResult.task?.assigned_to) ?? null;
  const taskReporter = resolveTeamReporter(currentAssignee, members);
  if (!taskReporter) {
    return toErrorResponse("Người báo cáo không hợp lệ hoặc ngoài phạm vi phụ trách.", 403);
  }
  if (taskResult.task.is_cancelled) {
    return toErrorResponse("Task đã hủy, không thể cập nhật báo cáo.", 409);
  }
  const requestedReportDate = normalizeText(body.reportDate);
  if (
    !isDateText(requestedReportDate) ||
    !isPercentAllowedForMode(
      body.percent,
      taskResult.task.progress_mode === "binary" ? "binary" : "continuous"
    )
  ) {
    return toErrorResponse("Ngày báo cáo hoặc phần trăm tiến độ không hợp lệ.", 400);
  }
  const reportDate = resolveReportDateAtSubmission(requestedReportDate);

  const now = new Date().toISOString();
  await saveBdttTrialTaskBackup(supabase, trialRunId, taskId);
  const { data: previousRows, error: previousError } = await supabase
    .from("progress")
    .select(
      "user_id, submitted_by, report_date, percent, note, photo_path, photo_paths, submitted_at"
    )
    .eq("task_id", taskId)
    .eq("report_date", reportDate)
    .order("updated_at", { ascending: false });
  if (previousError) return toErrorResponse(previousError.message, 500);
  const previous = (previousRows?.[0] ?? null) as {
    user_id?: string;
    photo_path?: string | null;
    photo_paths?: string[] | null;
  } | null;
  const photoPaths = Array.from(
    new Set([...(previous?.photo_paths ?? []), previous?.photo_path ?? ""].filter(Boolean))
  ).slice(0, 5);
  const { error: progressError } = await supabase.from("progress").upsert(
    {
      task_id: taskId,
      user_id: taskReporter.db.id,
      report_date: reportDate,
      percent: body.percent,
      note: normalizeText(body.note),
      photo_path: photoPaths[0] || null,
      photo_paths: photoPaths,
      submitted_by: auth.profile.id,
      submitted_at: now,
      updated_at: now,
      trial_run_id: trialRunId
    },
    { onConflict: "task_id,user_id,report_date,trial_run_id" }
  );
  if (progressError) return toErrorResponse(progressError.message, 500);

  const { error: taskUpdateError } = await supabase
    .from("tasks")
    .update({
      reporter_id: taskReporter.db.id,
      updated_by: auth.profile.id,
      updated_at: now
    })
    .eq("id", taskId);
  if (taskUpdateError) return toErrorResponse(taskUpdateError.message, 500);

  await writeEvent(supabase, taskId, "report_updated", auth.profile.id, {
    previous_reports: previousRows ?? [],
    reporter_id: taskReporter.db.id,
    submitted_by: auth.profile.id,
    report_date: reportDate,
    percent: body.percent,
    note: normalizeText(body.note),
    photo_paths: photoPaths
  }, trialRunId);
  await notifyProfiles(
    supabase,
    [taskResult.task.assigned_to, taskReporter.db.id],
    auth.profile.id,
    taskId,
    "task_report_updated",
    "Báo cáo WorkOrder đã được cập nhật",
    `${auth.account.fullName} đã cập nhật báo cáo ngày ${reportDate} ở mức ${body.percent}%.`,
    trialRunId
  );
  return NextResponse.json({ ok: true, taskId, reportDate });
};
