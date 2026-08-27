import { NextResponse } from "next/server";
import { createSeedAccounts, getLoginUsername } from "@/lib/accounts";
import { getActiveBdttTrialRun } from "@/lib/api/demoMode";
import { getAuthenticatedAccount, isUuid } from "@/lib/api/session";
import { forbiddenOriginMessage, isAllowedRequestOrigin } from "@/lib/api/security";
import { getOrgScopeKey } from "@/lib/org2026";
import { hasFullOrgScope } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { deduplicateTaskReportHistory } from "@/lib/taskReportHistory";
import type {
  AuthAccount,
  ProgressPercent
} from "@/types/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DbTaskScope {
  readonly assigned_to: string | null;
  readonly reporter_id: string | null;
  readonly nhom_truong: string | null;
}

interface DbProfileSummary {
  readonly id: string;
  readonly username: string | null;
  readonly resource_name: string | null;
  readonly org_group: string | null;
  readonly subgroup: string | null;
}

interface DbTaskEvent {
  readonly id: string;
  readonly actor_id: string;
  readonly details: unknown;
  readonly created_at: string;
}

interface DbProgressSnapshot {
  readonly id: string;
  readonly user_id: string;
  readonly submitted_by: string | null;
  readonly report_date: string;
  readonly percent: number;
  readonly note: string | null;
  readonly photo_path: string | null;
  readonly photo_paths: string[] | null;
  readonly submitted_at: string;
}

interface MutableHistoryItem {
  id: string;
  taskId: string;
  reportDate: string;
  percent: ProgressPercent;
  note: string;
  photoPaths: string[];
  actorId: string;
  actorName: string;
  actorUsername?: string;
  createdAt: string;
}

const normalizeText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const seededAccountsByUsername = new Map(
  createSeedAccounts().map((account) => [getLoginUsername(account.username), account])
);

const normalizeComparable = (value: unknown): string =>
  normalizeText(value).replace(/\s+/g, " ").toLocaleLowerCase("vi");

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asProgressPercent = (value: unknown): ProgressPercent | null =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100
    ? (value as ProgressPercent)
    : null;

const asPhotoPaths = (...values: unknown[]): string[] =>
  Array.from(
    new Set(
      values
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .map(normalizeText)
        .filter(Boolean)
    )
  ).slice(0, 5);

const isValidDateTime = (value: string): boolean =>
  Boolean(value) && !Number.isNaN(Date.parse(value));

const toErrorResponse = (error: string, status: number): NextResponse =>
  NextResponse.json({ ok: false, error }, { status });

const canViewHistory = (
  task: DbTaskScope,
  profileId: string,
  account: AuthAccount,
  responsibleProfiles: readonly DbProfileSummary[]
): boolean => {
  if (task.assigned_to === profileId || task.reporter_id === profileId) return true;
  if (hasFullOrgScope(account)) return true;
  if (account.role !== "admin") return false;

  if (
    [account.fullName, account.resourceName].some(
      (name) =>
        normalizeComparable(name) &&
        normalizeComparable(name) === normalizeComparable(task.nhom_truong)
    )
  ) {
    return true;
  }

  return responsibleProfiles.some((profile) => {
    if (profile.org_group && account.managedGroups.includes(profile.org_group)) {
      return true;
    }
    return account.managedSubgroups.includes(
      getOrgScopeKey(profile.org_group ?? "", profile.subgroup ?? "")
    );
  });
};

const getProfileDisplay = (
  profileId: string,
  profilesById: ReadonlyMap<string, DbProfileSummary>
): { readonly name: string; readonly username?: string } => {
  const profile = profilesById.get(profileId);
  const username = getLoginUsername(profile?.username ?? "");
  const seededAccount = seededAccountsByUsername.get(username);
  return {
    name:
      seededAccount?.fullName ||
      normalizeText(profile?.resource_name) ||
      username ||
      "Người báo cáo",
    username: username || undefined
  };
};

const getPreviousReports = (
  details: Record<string, unknown>
): readonly Record<string, unknown>[] => {
  const previousReports = details.previous_reports;
  if (Array.isArray(previousReports)) {
    return previousReports.map(asRecord).filter((item) => Object.keys(item).length > 0);
  }
  const previousReport = asRecord(details.previous_report);
  return Object.keys(previousReport).length > 0 ? [previousReport] : [];
};

export const GET = async (
  request: Request,
  context: { readonly params: Promise<{ readonly taskId: string }> }
): Promise<NextResponse> => {
  if (!isAllowedRequestOrigin(request)) {
    return toErrorResponse(forbiddenOriginMessage, 403);
  }

  const { taskId } = await context.params;
  if (!isUuid(taskId)) return toErrorResponse("Mã task không hợp lệ.", 400);

  const supabase = await createServerSupabaseClient();
  if (!supabase) return toErrorResponse("Chưa cấu hình Supabase server.", 503);

  const auth = await getAuthenticatedAccount(request, supabase);
  if (!auth.ok) return toErrorResponse(auth.error, auth.status);

  const { data: taskData, error: taskError } = await supabase
    .from("tasks")
    .select("assigned_to, reporter_id, nhom_truong")
    .eq("id", taskId)
    .maybeSingle();
  if (taskError) return toErrorResponse(taskError.message, 500);
  if (!taskData) return toErrorResponse("Không tìm thấy task.", 404);
  const task = taskData as DbTaskScope;

  const responsibleIds = [task.assigned_to, task.reporter_id].filter(
    (value): value is string => Boolean(value)
  );
  const { data: responsibleData, error: responsibleError } = responsibleIds.length
    ? await supabase
        .from("profiles")
        .select("id, username, resource_name, org_group, subgroup")
        .in("id", responsibleIds)
    : { data: [], error: null };
  if (responsibleError) return toErrorResponse(responsibleError.message, 500);
  if (
    !canViewHistory(
      task,
      auth.profile.id,
      auth.account,
      (responsibleData ?? []) as DbProfileSummary[]
    )
  ) {
    return toErrorResponse("Bạn không có quyền xem lịch sử task này.", 403);
  }

  const trialRun = await getActiveBdttTrialRun(supabase);
  let eventQuery = supabase
    .from("bdtt_task_events")
    .select("id, actor_id, details, created_at")
    .eq("task_id", taskId)
    .eq("event_type", "report_updated")
    .order("created_at", { ascending: true })
    .limit(200);
  let progressQuery = supabase
    .from("progress")
    .select(
      "id, user_id, submitted_by, report_date, percent, note, photo_path, photo_paths, submitted_at"
    )
    .eq("task_id", taskId)
    .order("submitted_at", { ascending: true })
    .limit(200);
  eventQuery = trialRun?.id
    ? eventQuery.eq("trial_run_id", trialRun.id)
    : eventQuery.is("trial_run_id", null);
  progressQuery = trialRun?.id
    ? progressQuery.eq("trial_run_id", trialRun.id)
    : progressQuery.is("trial_run_id", null);

  const [eventResult, progressResult] = await Promise.all([eventQuery, progressQuery]);
  if (eventResult.error) return toErrorResponse(eventResult.error.message, 500);
  if (progressResult.error) return toErrorResponse(progressResult.error.message, 500);

  const events = (eventResult.data ?? []) as DbTaskEvent[];
  const snapshots = (progressResult.data ?? []) as DbProgressSnapshot[];
  const actorIds = Array.from(
    new Set([
      ...events.map((event) => event.actor_id),
      ...snapshots.flatMap((snapshot) => [snapshot.submitted_by, snapshot.user_id])
    ].filter((value): value is string => Boolean(value)))
  );
  const { data: actorData, error: actorError } = actorIds.length
    ? await supabase
        .from("profiles")
        .select("id, username, resource_name, org_group, subgroup")
        .in("id", actorIds)
    : { data: [], error: null };
  if (actorError) return toErrorResponse(actorError.message, 500);
  const profilesById = new Map(
    ((actorData ?? []) as DbProfileSummary[]).map((profile) => [profile.id, profile])
  );

  const history: MutableHistoryItem[] = [];
  const addItem = (item: Omit<MutableHistoryItem, "actorName" | "actorUsername">): void => {
    if (!isValidDateTime(item.createdAt)) return;
    const actor = getProfileDisplay(item.actorId, profilesById);
    history.push({ ...item, actorName: actor.name, actorUsername: actor.username });
  };

  events.forEach((event) => {
    const details = asRecord(event.details);
    const percent = asProgressPercent(details.percent);
    const reportDate = normalizeText(details.report_date);
    if (percent !== null && reportDate) {
      addItem({
        id: event.id,
        taskId,
        reportDate,
        percent,
        note: normalizeText(details.note),
        photoPaths: asPhotoPaths(details.photo_paths),
        actorId: event.actor_id,
        createdAt: event.created_at
      });
    }

    getPreviousReports(details).forEach((previous, index) => {
      const previousPercent = asProgressPercent(previous.percent);
      const previousDate = normalizeText(previous.report_date) || reportDate;
      const previousCreatedAt = normalizeText(previous.submitted_at);
      const previousActorId =
        normalizeText(previous.submitted_by) || normalizeText(previous.user_id);
      if (
        previousPercent === null ||
        !previousDate ||
        !previousActorId ||
        !isValidDateTime(previousCreatedAt)
      ) {
        return;
      }
      addItem({
        id: `${event.id}-previous-${index}`,
        taskId,
        reportDate: previousDate,
        percent: previousPercent,
        note: normalizeText(previous.note),
        photoPaths: asPhotoPaths(previous.photo_paths, previous.photo_path),
        actorId: previousActorId,
        createdAt: previousCreatedAt
      });
    });
  });

  snapshots.forEach((snapshot) => {
    const percent = asProgressPercent(snapshot.percent);
    if (percent === null || !isValidDateTime(snapshot.submitted_at)) return;
    addItem({
      id: `progress-${snapshot.id}`,
      taskId,
      reportDate: snapshot.report_date,
      percent,
      note: normalizeText(snapshot.note),
      photoPaths: asPhotoPaths(snapshot.photo_paths, snapshot.photo_path),
      actorId: snapshot.submitted_by || snapshot.user_id,
      createdAt: snapshot.submitted_at
    });
  });

  const deduplicated = deduplicateTaskReportHistory(history);

  return NextResponse.json({ ok: true, history: deduplicated });
};
