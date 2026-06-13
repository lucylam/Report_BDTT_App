import { DEFAULT_REPORT_DATE } from "@/lib/date";
import { getTaskPercent, getTaskProgress } from "@/lib/progress";
import type { AppData, ProgressPercent, ProgressRecord, Task } from "@/types/domain";

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

export const getStatus = (task: Task, percent: ProgressPercent): StatusFilter => {
  if (task.isCancelled) return "cancelled";
  if (percent === 100) return "completed";
  if (percent > 0) return "inProgress";
  return "notStarted";
};

export const getStatusLabel = (status: StatusFilter): string => {
  if (status === "completed") return "Hoàn thành";
  if (status === "inProgress") return "Đang thực hiện";
  if (status === "notStarted") return "Chưa thực hiện";
  if (status === "cancelled") return "Cancel";
  return "Tất cả trạng thái";
};

export const getStatusTone = (status: StatusFilter): BadgeTone => {
  if (status === "completed") return "success";
  if (status === "inProgress") return "accent";
  if (status === "cancelled") return "danger";
  return "neutral";
};

export const getProgressLabel = (task: Task, percent: ProgressPercent): string => {
  return task.isCancelled ? "NA" : `${percent}%`;
};

export const buildTaskRows = (data: AppData): TaskRow[] => {
  return data.tasks.map((task) => {
    const percent = getTaskPercent(data.progress, task.id, DEFAULT_REPORT_DATE);
    return {
      task,
      percent,
      status: getStatus(task, percent),
      progress: getTaskProgress(data.progress, task.id, DEFAULT_REPORT_DATE)
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
