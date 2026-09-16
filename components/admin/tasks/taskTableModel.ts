import { getPlanReportDate } from "@/lib/date";
import { getOrgTaskSubgroup } from "@/lib/org2026";
import { getTaskPercent, getTaskProgress } from "@/lib/progress";
import type { AppData, Profile, ProgressPercent, ProgressRecord, Task } from "@/types/domain";

export type StatusFilter = "all" | "completed" | "inProgress" | "notStarted" | "cancelled";
export type QuickFilter = "all" | "p1Open" | "cancelled" | "notStarted" | "inProgress";
export type BadgeTone = "success" | "warning" | "accent" | "danger" | "info" | "neutral";

export interface TaskRow {
  readonly task: Task;
  readonly percent: ProgressPercent;
  readonly status: StatusFilter;
  readonly progress: ProgressRecord | null;
}

export interface TaskKpis {
  readonly total: number;
  readonly completed: number;
  readonly inProgress: number;
  readonly notStarted: number;
  readonly cancelled: number;
  readonly p1Open: number;
}

export interface TaskOrgScope {
  readonly orgGroup: string;
  readonly subgroup: string;
}

const normalizeResourceName = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toLocaleUpperCase("vi");

export const buildTaskOrgScopes = (
  tasks: readonly Task[],
  profiles: readonly Profile[]
): ReadonlyMap<string, TaskOrgScope> => {
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const profileByResource = new Map(
    profiles.map((profile) => [normalizeResourceName(profile.resourceName), profile])
  );

  return new Map(tasks.map((task) => {
    const candidates = [task.assignedTo, task.reporterId]
      .filter((id): id is string => Boolean(id))
      .map((id) => profileById.get(id))
      .filter((profile): profile is Profile => Boolean(profile));
    const resourceProfile = profileByResource.get(normalizeResourceName(task.resourceName));
    if (resourceProfile) candidates.push(resourceProfile);
    const profile = candidates.find((person) =>
      Boolean(getOrgTaskSubgroup(person.username, person.subgroup))
    ) ?? candidates.find((person) => Boolean(person.orgGroup));

    return [task.id, {
      orgGroup: profile?.orgGroup ?? "",
      subgroup: profile ? getOrgTaskSubgroup(profile.username, profile.subgroup) : ""
    }];
  }));
};

export const matchesTaskOrgScope = (
  scope: TaskOrgScope | undefined,
  orgGroup: string,
  subgroup: string
): boolean =>
  (orgGroup === "all" || scope?.orgGroup === orgGroup) &&
  (subgroup === "all" || scope?.subgroup === subgroup);

export const getTaskOrgGroups = (scopes: ReadonlyMap<string, TaskOrgScope>): string[] =>
  [...new Set([...scopes.values()].map((scope) => scope.orgGroup).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "vi"));

export const getTaskSubgroups = (
  scopes: ReadonlyMap<string, TaskOrgScope>,
  orgGroup: string
): string[] => orgGroup === "all"
  ? []
  : [...new Set([...scopes.values()]
    .filter((scope) => scope.orgGroup === orgGroup)
    .map((scope) => scope.subgroup)
    .filter(Boolean))].sort((left, right) => left.localeCompare(right, "vi", { numeric: true }));

export const getStatus = (task: Task, percent: ProgressPercent): StatusFilter => {
  if (task.isCancelled) return "cancelled";
  if (percent === 100) return "completed";
  if (percent > 0) return "inProgress";
  return "notStarted";
};

export const getStatusLabel = (status: StatusFilter): string => {
  if (status === "completed") return "Hoàn thành";
  if (status === "inProgress") return "Đang làm";
  if (status === "notStarted") return "Chưa làm";
  if (status === "cancelled") return "Cancel";
  return "Tất cả trạng thái";
};

export const getStatusTone = (status: StatusFilter): BadgeTone => {
  if (status === "completed") return "success";
  if (status === "inProgress") return "info";
  if (status === "notStarted") return "warning";
  if (status === "cancelled") return "danger";
  return "neutral";
};

export const getProgressLabel = (task: Task, percent: ProgressPercent): string => {
  return task.isCancelled ? "NA" : `${percent}%`;
};

export const buildTaskRows = (data: AppData): TaskRow[] => {
  const reportDate = getPlanReportDate(data.tasks);
  return data.tasks.map((task) => {
    const percent = getTaskPercent(data.progress, task.id, reportDate);
    return {
      task,
      percent,
      status: getStatus(task, percent),
      progress: getTaskProgress(data.progress, task.id, reportDate)
    };
  });
};

export const buildTaskKpis = (rows: readonly TaskRow[]): TaskKpis => {
  return {
    total: rows.length,
    completed: rows.filter((row) => row.status === "completed").length,
    inProgress: rows.filter((row) => row.status === "inProgress").length,
    notStarted: rows.filter((row) => row.status === "notStarted").length,
    cancelled: rows.filter((row) => row.status === "cancelled").length,
    p1Open: rows.filter(
      (row) => row.task.priority === 1 && !row.task.isCancelled && row.percent < 100
    ).length
  };
};

export const uniqueValues = (tasks: readonly Task[], key: "nhom" | "donVi" | "section"): string[] => {
  return Array.from(new Set(tasks.map((task) => task[key]).filter(Boolean))).sort();
};

export const matchesTaskQuery = (task: Task, query: string): boolean => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const text = [
    task.tagname,
    task.wo,
    task.taskName,
    task.resourceName,
    task.section,
    task.nhom,
    task.donVi
  ]
    .join(" ")
    .toLowerCase();
  return text.includes(normalized);
};
