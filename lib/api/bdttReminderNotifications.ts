import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getLoginUsername } from "@/lib/accounts";
import type { ActiveBdttTrialRun } from "@/lib/api/demoMode";
import { getReportClock } from "@/lib/date";
import { DATA_ADMIN_USERNAME } from "@/lib/permissions";
import type { AuthenticatedProfile } from "@/lib/api/session";

const REPORTER_REMINDER_MINUTES = 13 * 60 + 30;
const REPORT_CUTOFF_MINUTES = 14 * 60;
const PAGE_SIZE = 1000;

export type BdttReminderPhase = "none" | "reporter" | "summary";

interface ReporterProfileRow {
  readonly id: string;
  readonly username: string | null;
  readonly full_name: string | null;
  readonly org_group: string | null;
  readonly is_active: boolean | null;
}

interface ReporterSummary {
  readonly id: string;
  readonly fullName: string;
  readonly orgGroup: string;
}

export const getBdttReminderPhase = (now: Date = new Date()): BdttReminderPhase => {
  const clock = getReportClock(now);
  const minutes = clock.hour * 60 + clock.minute;
  if (minutes >= REPORT_CUTOFF_MINUTES) return "summary";
  if (minutes >= REPORTER_REMINDER_MINUTES) return "reporter";
  return "none";
};

export const createBdttReminderNotificationId = (key: string): string => {
  const hash = createHash("sha256").update(key).digest("hex");
  const variant = ((Number.parseInt(hash[16] ?? "0", 16) & 0x3) | 0x8).toString(16);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-${variant}${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
};

export const getMissingBdttReporters = ({
  profiles,
  reportingRoleIds,
  submittedReporterIds,
  orgGroup
}: {
  readonly profiles: readonly ReporterSummary[];
  readonly reportingRoleIds: ReadonlySet<string>;
  readonly submittedReporterIds: ReadonlySet<string>;
  readonly orgGroup?: string;
}): ReporterSummary[] =>
  profiles
    .filter(
      (profile) =>
        reportingRoleIds.has(profile.id) &&
        !submittedReporterIds.has(profile.id) &&
        (!orgGroup || profile.orgGroup === orgGroup)
    )
    .sort((left, right) => left.fullName.localeCompare(right.fullName, "vi"));

export const getBdttReportActionWindow = (
  calendarDate: string
): { readonly start: string; readonly end: string } => {
  const start = new Date(`${calendarDate}T00:00:00+07:00`);
  const end = new Date(start.getTime() + 86_400_000);
  return { start: start.toISOString(), end: end.toISOString() };
};

const hasNotification = async (
  supabase: SupabaseClient,
  notificationId: string
): Promise<boolean> => {
  const { count, error } = await supabase
    .from("app_notifications")
    .select("id", { count: "exact", head: true })
    .eq("id", notificationId);
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
};

const hasReportedDuringDay = async (
  supabase: SupabaseClient,
  profileId: string,
  calendarDate: string,
  trialRunId: string | null
): Promise<boolean> => {
  const actionWindow = getBdttReportActionWindow(calendarDate);
  let query = supabase
    .from("progress")
    .select("task_id", { count: "exact", head: true })
    .eq("user_id", profileId)
    .gte("submitted_at", actionWindow.start)
    .lt("submitted_at", actionWindow.end);
  query = trialRunId
    ? query.eq("trial_run_id", trialRunId)
    : query.is("trial_run_id", null);
  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
};

const hasReportingRole = async (
  supabase: SupabaseClient,
  profileId: string,
  trialRunId: string | null
): Promise<boolean> => {
  let query = supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("reporter_id", profileId)
    .eq("is_cancelled", false);
  query = trialRunId
    ? query.or(`trial_run_id.is.null,trial_run_id.eq.${trialRunId}`)
    : query.is("trial_run_id", null);
  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
};

const listReportingRoleIds = async (
  supabase: SupabaseClient,
  trialRunId: string | null
): Promise<Set<string>> => {
  const reporterIds = new Set<string>();
  let page = 0;
  while (true) {
    let query = supabase
      .from("tasks")
      .select("id, reporter_id")
      .eq("is_cancelled", false)
      .not("reporter_id", "is", null)
      .order("id", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    query = trialRunId
      ? query.or(`trial_run_id.is.null,trial_run_id.eq.${trialRunId}`)
      : query.is("trial_run_id", null);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    (data ?? []).forEach((row) => {
      if (row.reporter_id) reporterIds.add(String(row.reporter_id));
    });
    if (!data || data.length < PAGE_SIZE) break;
    page += 1;
  }
  return reporterIds;
};

const listSubmittedReporterIds = async (
  supabase: SupabaseClient,
  reporterIds: readonly string[],
  calendarDate: string,
  trialRunId: string | null
): Promise<Set<string>> => {
  if (reporterIds.length === 0) return new Set();
  const actionWindow = getBdttReportActionWindow(calendarDate);
  const submittedIds = new Set<string>();
  let page = 0;
  while (true) {
    let query = supabase
      .from("progress")
      .select("task_id, user_id")
      .in("user_id", reporterIds)
      .gte("submitted_at", actionWindow.start)
      .lt("submitted_at", actionWindow.end)
      .order("task_id", { ascending: true })
      .order("user_id", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    query = trialRunId
      ? query.eq("trial_run_id", trialRunId)
      : query.is("trial_run_id", null);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    (data ?? []).forEach((row) => {
      if (row.user_id) submittedIds.add(String(row.user_id));
    });
    if (!data || data.length < PAGE_SIZE) break;
    page += 1;
  }
  return submittedIds;
};

const listReporterProfiles = async (
  supabase: SupabaseClient
): Promise<ReporterSummary[]> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, org_group, is_active")
    .eq("is_active", true);
  if (error) throw new Error(error.message);
  return ((data ?? []) as ReporterProfileRow[]).map((profile) => ({
    id: profile.id,
    fullName: profile.full_name?.trim() || profile.username?.trim() || profile.id,
    orgGroup: profile.org_group?.trim() || "Chưa xác định"
  }));
};

const insertNotification = async (
  supabase: SupabaseClient,
  input: {
    readonly id: string;
    readonly recipientId: string;
    readonly eventType: string;
    readonly href: string;
    readonly title: string;
    readonly message: string;
    readonly trialRunId: string | null;
  }
): Promise<void> => {
  const { error } = await supabase.from("app_notifications").upsert(
    {
      id: input.id,
      recipient_id: input.recipientId,
      module: "bdtt",
      event_type: input.eventType,
      entity_id: null,
      href: input.href,
      title: input.title,
      message: input.message,
      trial_run_id: input.trialRunId
    },
    { onConflict: "id", ignoreDuplicates: true }
  );
  if (error) throw new Error(error.message);
};

const formatReportDate = (date: string): string => {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
};

const createReporterReminder = async (
  supabase: SupabaseClient,
  profile: AuthenticatedProfile,
  reportDate: string,
  trialRunId: string | null
): Promise<void> => {
  const contextKey = trialRunId ?? "live";
  const notificationId = createBdttReminderNotificationId(
    `bdtt:reporter-reminder:${contextKey}:${reportDate}:${profile.id}`
  );
  if (await hasNotification(supabase, notificationId)) return;
  if (await hasReportedDuringDay(supabase, profile.id, reportDate, trialRunId)) return;
  if (!(await hasReportingRole(supabase, profile.id, trialRunId))) return;

  await insertNotification(supabase, {
    id: notificationId,
    recipientId: profile.id,
    eventType: "bdtt_reporter_reminder",
    href: "/worker",
    title: "Nhắc báo cáo BDTT trước 14:00",
    message: `Bạn chưa gửi báo cáo ngày ${formatReportDate(reportDate)}. Vui lòng cập nhật trước 14:00.`,
    trialRunId
  });
};

const createMissingReportSummary = async (
  supabase: SupabaseClient,
  profile: AuthenticatedProfile,
  reportDate: string,
  trialRunId: string | null
): Promise<void> => {
  const username = getLoginUsername(profile.username);
  const isDataAdmin = username === DATA_ADMIN_USERNAME;
  const orgGroup = profile.org_group?.trim() || "";
  const isGroupLeader = profile.org_role === "nhomTruong" && Boolean(orgGroup);
  if (!isDataAdmin && !isGroupLeader) return;

  const eventType = isDataAdmin
    ? "bdtt_admin_missing_report_summary"
    : "bdtt_group_missing_report_summary";
  const contextKey = trialRunId ?? "live";
  const notificationId = createBdttReminderNotificationId(
    `bdtt:${eventType}:${contextKey}:${reportDate}:${profile.id}`
  );
  if (await hasNotification(supabase, notificationId)) return;

  const reportingRoleIds = await listReportingRoleIds(supabase, trialRunId);
  if (reportingRoleIds.size === 0) return;
  const profiles = await listReporterProfiles(supabase);
  const scopedProfiles = profiles.filter(
    (reporter) => reportingRoleIds.has(reporter.id) && (isDataAdmin || reporter.orgGroup === orgGroup)
  );
  if (scopedProfiles.length === 0) return;
  const scopedReporterIds = scopedProfiles.map((reporter) => reporter.id);
  const submittedReporterIds = await listSubmittedReporterIds(
    supabase,
    scopedReporterIds,
    reportDate,
    trialRunId
  );
  const missing = getMissingBdttReporters({
    profiles: scopedProfiles,
    reportingRoleIds,
    submittedReporterIds,
    orgGroup: isDataAdmin ? undefined : orgGroup
  });
  const names = missing.map((reporter) =>
    isDataAdmin ? `${reporter.fullName} (${reporter.orgGroup})` : reporter.fullName
  );
  const scopeLabel = isDataAdmin ? "Toàn tổ" : orgGroup;
  const countLabel = `${missing.length}/${scopedProfiles.length} người chưa báo cáo`;

  await insertNotification(supabase, {
    id: notificationId,
    recipientId: profile.id,
    eventType,
    href: "/admin/tasks?tab=personnel",
    title: `14:00 · ${scopeLabel}: ${countLabel}`,
    message:
      missing.length > 0
        ? `${formatReportDate(reportDate)} · ${names.join(", ")}`
        : `${formatReportDate(reportDate)} · Tất cả người có vai trò báo cáo đã gửi báo cáo.`,
    trialRunId
  });
};

export const createDueBdttReminderNotifications = async (
  supabase: SupabaseClient,
  profile: AuthenticatedProfile,
  trialRun: ActiveBdttTrialRun | null,
  now: Date = new Date()
): Promise<void> => {
  const phase = getBdttReminderPhase(now);
  if (phase === "none") return;
  const reportDate = getReportClock(now).calendarDate;
  const trialRunId = trialRun?.id ?? null;
  if (phase === "reporter") {
    await createReporterReminder(supabase, profile, reportDate, trialRunId);
    return;
  }
  await createMissingReportSummary(supabase, profile, reportDate, trialRunId);
};
