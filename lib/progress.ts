import type {
  AppData,
  DashboardMetrics,
  ProgressPercent,
  ProgressRecord,
  Task
} from "@/types/domain";

export const percentOptions: readonly ProgressPercent[] = [0, 25, 50, 75, 100];

export const normalizePercent = (value: unknown): ProgressPercent => {
  const numberValue = Number(value);
  if (numberValue >= 88) return 100;
  if (numberValue >= 63) return 75;
  if (numberValue >= 38) return 50;
  if (numberValue >= 13) return 25;
  return 0;
};

export const getTaskProgress = (
  progress: readonly ProgressRecord[],
  taskId: string,
  reportDate: string
): ProgressRecord | null => {
  return (
    progress.find(
      (record) => record.taskId === taskId && record.reportDate === reportDate
    ) ?? null
  );
};

export const getTaskPercent = (
  progress: readonly ProgressRecord[],
  taskId: string,
  reportDate: string
): ProgressPercent => {
  return getTaskProgress(progress, taskId, reportDate)?.percent ?? 0;
};

export const calculateMetrics = (
  data: AppData,
  reportDate: string
): DashboardMetrics => {
  const activeTasks = data.tasks.filter((task) => !task.isCancelled);
  const cancelled = data.tasks.filter((task) => task.isCancelled).length;
  const percents = activeTasks.map((task) =>
    getTaskPercent(data.progress, task.id, reportDate)
  );
  const completed = percents.filter((percent) => percent === 100).length;
  const inProgress = percents.filter(
    (percent) => percent > 0 && percent < 100
  ).length;
  const notStarted = percents.filter((percent) => percent === 0).length;
  const submittedWorkerIds = new Set(
    data.progress
      .filter((record) => record.reportDate === reportDate)
      .map((record) => record.userId)
  );
  const workerIds = data.profiles
    .filter((profile) => profile.role === "worker" && !profile.isPlaceholder)
    .map((profile) => profile.id);
  const priorityOpen = activeTasks.filter((task) => {
    return (
      task.priority === 1 &&
      getTaskPercent(data.progress, task.id, reportDate) < 100
    );
  }).length;
  const overdue = activeTasks.filter((task) => {
    const percent = getTaskPercent(data.progress, task.id, reportDate);
    return task.finishDate < reportDate && percent < 100;
  }).length;
  const totalPercent = percents.reduce<number>((sum, percent) => sum + percent, 0);

  return {
    totalTasks: activeTasks.length,
    completed,
    inProgress,
    notStarted,
    cancelled,
    unsubmittedWorkers: workerIds.filter((id) => !submittedWorkerIds.has(id))
      .length,
    priorityOpen,
    overdue,
    overallPercent:
      activeTasks.length === 0 ? 0 : Math.round(totalPercent / activeTasks.length)
  };
};

export const groupCompletion = (
  tasks: readonly Task[],
  progress: readonly ProgressRecord[],
  reportDate: string,
  key: "nhom" | "donVi"
): Array<{ name: string; percent: number; total: number }> => {
  const groups = new Map<string, { total: number; percentSum: number }>();
  tasks
    .filter((task) => !task.isCancelled)
    .forEach((task) => {
      const name = task[key] || "Chưa phân loại";
      const current = groups.get(name) ?? { total: 0, percentSum: 0 };
      groups.set(name, {
        total: current.total + 1,
        percentSum:
          current.percentSum + getTaskPercent(progress, task.id, reportDate)
      });
    });

  return Array.from(groups.entries())
    .map(([name, value]) => ({
      name,
      total: value.total,
      percent: value.total === 0 ? 0 : Math.round(value.percentSum / value.total)
    }))
    .sort((left, right) => right.total - left.total);
};
