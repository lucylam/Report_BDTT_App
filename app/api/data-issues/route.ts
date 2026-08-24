import { NextResponse } from "next/server";
import { getAuthenticatedAccount, findReportableTask } from "@/lib/api/session";
import { forbiddenOriginMessage, isAllowedRequestOrigin } from "@/lib/api/security";
import { loadBdttSnapshot } from "@/lib/api/bdttSnapshot";
import { getScopedBdttManagerIds } from "@/lib/api/bdttRecipients";
import { getActiveBdttTrialRun } from "@/lib/api/demoMode";
import { canManageBdttTasks, canViewTask } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  canTransitionDataIssue,
  getDataIssueStatusForAction,
  type DataIssueAction
} from "@/lib/dataIssueWorkflow";
import type { DataIssueStatus, DataIssueType, Task } from "@/types/domain";

export const runtime = "nodejs";

interface DataIssueBody {
  readonly action?: DataIssueAction;
  readonly issueId?: string;
  readonly task?: Task;
  readonly issueType?: DataIssueType;
  readonly currentValue?: string;
  readonly suggestedValue?: string;
  readonly suggestedTag?: string;
  readonly note?: string;
  readonly resolutionNote?: string;
}

const text = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const errorResponse = (error: string, status: number): NextResponse =>
  NextResponse.json({ ok: false, error }, { status });

const issueTypes: readonly DataIssueType[] = [
  "wrong_tag",
  "wrong_wo",
  "wrong_assignment",
  "other"
];

export const GET = async (request: Request): Promise<NextResponse> => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return errorResponse("Chưa cấu hình Supabase cho báo sai dữ liệu.", 503);
  const auth = await getAuthenticatedAccount(request, supabase);
  if (!auth.ok) return errorResponse(auth.error, auth.status);
  if (!canManageBdttTasks(auth.account)) {
    return errorResponse("Bạn không có quyền xem hàng chờ xử lý dữ liệu.", 403);
  }

  try {
    const trialRun = await getActiveBdttTrialRun(supabase);
    let issueQuery = supabase
      .from("data_issue_reports")
      .select(
        "id, task_id, reported_by, issue_type, current_value, suggested_value, note, status, resolved_by, resolution_note, review_started_at, resolved_at, created_at, updated_at, trial_run_id"
      )
      .order("created_at", { ascending: false });
    issueQuery = trialRun
      ? issueQuery.eq("trial_run_id", trialRun.id)
      : issueQuery.is("trial_run_id", null);
    const [snapshot, issueResult] = await Promise.all([
      loadBdttSnapshot(supabase),
      issueQuery
    ]);
    if (issueResult.error) throw new Error(issueResult.error.message);
    const taskById = new Map(snapshot.tasks.map((task) => [task.id, task]));
    const items = (issueResult.data ?? []).filter((item) => {
      const task = taskById.get(item.task_id as string);
      return task ? canViewTask(auth.account, task, snapshot.profiles) : false;
    });
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Không tải được báo sai dữ liệu.", 500);
  }
};

export const POST = async (request: Request): Promise<NextResponse> => {
  if (!isAllowedRequestOrigin(request)) return errorResponse(forbiddenOriginMessage, 403);
  const supabase = await createServerSupabaseClient();
  if (!supabase) return errorResponse("Chưa cấu hình Supabase cho báo sai dữ liệu.", 503);
  const auth = await getAuthenticatedAccount(request, supabase);
  if (!auth.ok) return errorResponse(auth.error, auth.status);
  const trialRun = await getActiveBdttTrialRun(supabase);

  const body = (await request.json()) as DataIssueBody;
  const task = body.task;
  const issueType = issueTypes.includes(body.issueType ?? "wrong_tag")
    ? (body.issueType ?? "wrong_tag")
    : "other";
  const suggestedValue = text(body.suggestedValue) || text(body.suggestedTag);
  const note = text(body.note);
  if (!task || (!suggestedValue && !note)) {
    return errorResponse("Hãy nhập giá trị đề xuất hoặc mô tả điểm sai.", 400);
  }
  if (suggestedValue.length > 300 || note.length > 1500) {
    return errorResponse("Nội dung báo sai dữ liệu quá dài.", 400);
  }

  const ownedTask = await findReportableTask(supabase, auth.profile.id, task);
  if (!ownedTask.ok) return errorResponse(ownedTask.error, ownedTask.status);
  const currentValue =
    text(body.currentValue) ||
    (issueType === "wrong_wo"
      ? task.wo
      : issueType === "wrong_assignment"
        ? task.resourceName
        : task.tagname);
  const { data: issue, error } = await supabase
    .from("data_issue_reports")
    .insert({
      module: "bdtt",
      task_id: ownedTask.task.id,
      reported_by: auth.profile.id,
      issue_type: issueType,
      current_value: currentValue,
      suggested_value: suggestedValue,
      note,
      trial_run_id: trialRun?.id ?? null
    })
    .select("id")
    .single();
  if (error) {
    return errorResponse(
      error.code === "23505"
        ? "Hạng mục này đã có báo sai cùng loại đang chờ xử lý."
        : error.message,
      error.code === "23505" ? 409 : 500
    );
  }

  const recipients = await getScopedBdttManagerIds(supabase, {
    taskId: ownedTask.task.id,
    excludeId: auth.profile.id
  });
  if (recipients.length > 0) {
    await supabase.from("app_notifications").insert(
      recipients.map((recipientId) => ({
        recipient_id: recipientId,
        module: "bdtt",
        event_type: "data_issue_reported",
        entity_id: ownedTask.task.id,
        href: "/admin/tasks?tab=issues",
        title: `Báo sai dữ liệu: ${task.tagname}`,
        message: `${auth.account.fullName}: ${suggestedValue || note}`,
        trial_run_id: trialRun?.id ?? null
      }))
    );
  }
  return NextResponse.json({ ok: true, issueId: issue.id });
};

export const PATCH = async (request: Request): Promise<NextResponse> => {
  if (!isAllowedRequestOrigin(request)) return errorResponse(forbiddenOriginMessage, 403);
  const supabase = await createServerSupabaseClient();
  if (!supabase) return errorResponse("Chưa cấu hình Supabase cho báo sai dữ liệu.", 503);
  const auth = await getAuthenticatedAccount(request, supabase);
  if (!auth.ok) return errorResponse(auth.error, auth.status);
  if (!canManageBdttTasks(auth.account)) return errorResponse("Bạn không có quyền xử lý dữ liệu.", 403);
  const trialRun = await getActiveBdttTrialRun(supabase);

  const body = (await request.json()) as DataIssueBody;
  const issueId = text(body.issueId);
  const nextStatus = getDataIssueStatusForAction(body.action);
  const resolutionNote = text(body.resolutionNote);
  if (!issueId || !nextStatus) return errorResponse("Yêu cầu xử lý không hợp lệ.", 400);
  if ((nextStatus === "resolved" || nextStatus === "rejected") && resolutionNote.length < 3) {
    return errorResponse("Cần nhập kết luận xử lý ít nhất 3 ký tự.", 400);
  }

  try {
    const [{ data: issue, error: issueError }, snapshot] = await Promise.all([
      supabase
        .from("data_issue_reports")
        .select("id, task_id, reported_by, status, trial_run_id")
        .eq("id", issueId)
        .maybeSingle(),
      loadBdttSnapshot(supabase)
    ]);
    if (issueError) throw new Error(issueError.message);
    if (!issue) return errorResponse("Không tìm thấy báo sai dữ liệu.", 404);
    if ((issue.trial_run_id ?? null) !== (trialRun?.id ?? null)) {
      return errorResponse("Báo sai không thuộc chế độ dữ liệu hiện tại.", 409);
    }
    if (!canTransitionDataIssue(issue.status as DataIssueStatus, nextStatus)) {
      return errorResponse("Báo sai đã kết thúc hoặc không thể chuyển sang trạng thái này.", 409);
    }
    const task = snapshot.tasks.find((item) => item.id === issue.task_id);
    if (!task || !canViewTask(auth.account, task, snapshot.profiles)) {
      return errorResponse("Báo sai không thuộc phạm vi phụ trách.", 403);
    }

    const now = new Date().toISOString();
    const terminal = nextStatus === "resolved" || nextStatus === "rejected";
    const { error } = await supabase
      .from("data_issue_reports")
      .update({
        status: nextStatus,
        resolved_by: auth.profile.id,
        review_started_at: nextStatus === "reviewing" ? now : undefined,
        resolution_note: resolutionNote,
        resolved_at: terminal ? now : null,
        updated_at: now
      })
      .eq("id", issueId);
    if (error) throw new Error(error.message);

    await supabase.from("app_notifications").insert({
      recipient_id: issue.reported_by,
      module: "bdtt",
      event_type: `data_issue_${nextStatus}`,
      entity_id: issue.task_id,
      href: `/worker?task=${issue.task_id}`,
      title: nextStatus === "reviewing" ? "Báo sai đang được xử lý" : "Báo sai đã có kết quả",
      message: resolutionNote || `${auth.account.fullName} đã tiếp nhận xử lý.`,
      trial_run_id: trialRun?.id ?? null
    });
    return NextResponse.json({ ok: true, issueId, status: nextStatus });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Không cập nhật được báo sai.", 500);
  }
};
