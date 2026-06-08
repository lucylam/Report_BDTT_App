import { DEFAULT_REPORT_DATE } from "@/lib/date";
import { getTaskPercent } from "@/lib/progress";
import type { ProgressPercent, ProgressRecord, Task } from "@/types/domain";

export type WorkerGroupMode = "unit" | "section";

export interface WorkerTaskGroup {
  readonly key: string;
  readonly label: string;
  readonly tasks: readonly Task[];
}

export const normalizeSearchText = (value: string): string => {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
};

export const matchesWorkerTaskQuery = (
  task: Task,
  query: string
): boolean => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const haystack = normalizeSearchText(
    [
      task.tagname,
      task.wo,
      task.taskName,
      task.donVi,
      task.section,
      task.nhom,
      task.duration,
      `p${task.priority}`
    ].join(" ")
  );
  return haystack.includes(normalizedQuery);
};

export const getWorkerTaskStatusWeight = (
  task: Task,
  percent: ProgressPercent
): number => {
  if (task.isCancelled) return 5;
  if (task.priority === 1 && percent < 100) return 0;
  if (percent > 0 && percent < 100) return 1;
  if (percent === 0) return 2;
  if (percent === 100) return 3;
  return 4;
};

export const sortWorkerTasks = (
  tasks: readonly Task[],
  progress: readonly ProgressRecord[],
  reportDate = DEFAULT_REPORT_DATE
): readonly Task[] => {
  return [...tasks].sort((first, second) => {
    const firstPercent = getTaskPercent(progress, first.id, reportDate);
    const secondPercent = getTaskPercent(progress, second.id, reportDate);
    const statusDelta =
      getWorkerTaskStatusWeight(first, firstPercent) -
      getWorkerTaskStatusWeight(second, secondPercent);
    if (statusDelta !== 0) return statusDelta;

    const priorityDelta = first.priority - second.priority;
    if (priorityDelta !== 0) return priorityDelta;

    const finishDelta = first.finishDate.localeCompare(second.finishDate);
    if (finishDelta !== 0) return finishDelta;

    return first.tagname.localeCompare(second.tagname, "vi", {
      numeric: true,
      sensitivity: "base"
    });
  });
};

export const groupWorkerTasks = (
  tasks: readonly Task[],
  groupMode: WorkerGroupMode
): readonly WorkerTaskGroup[] => {
  const groups = new Map<string, Task[]>();
  tasks.forEach((task) => {
    const value = groupMode === "unit" ? task.donVi : task.section;
    const label = value || "Chưa phân nhóm";
    const current = groups.get(label) ?? [];
    groups.set(label, [...current, task]);
  });

  return Array.from(groups.entries())
    .map(([label, items]) => ({
      key: normalizeSearchText(label) || "unknown",
      label,
      tasks: items
    }))
    .sort((first, second) =>
      first.label.localeCompare(second.label, "vi", {
        numeric: true,
        sensitivity: "base"
      })
    );
};

export const getTaskUnitChips = (
  tasks: readonly Task[],
  limit = 6
): readonly string[] => {
  return Array.from(new Set(tasks.map((task) => task.donVi).filter(Boolean)))
    .sort((first, second) =>
      first.localeCompare(second, "vi", { numeric: true, sensitivity: "base" })
    )
    .slice(0, limit);
};
