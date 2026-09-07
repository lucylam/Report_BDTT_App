import type { Profile, ProgressRecord, Task } from "@/types/domain";

export const isReportablePersonnel = (profile: Profile): boolean =>
  profile.canLogin && !profile.isPlaceholder;

export const getReportablePersonnel = (
  profiles: readonly Profile[],
  tasks: readonly Task[]
): Profile[] => {
  const reporterIds = new Set(getActiveTasksByReporter(tasks).keys());
  return profiles.filter((profile) => isReportablePersonnel(profile) && reporterIds.has(profile.id));
};

export const getTaskReporterId = (task: Task): string | null =>
  task.reporterId ?? task.assignedTo;

export const getActiveTasksByReporter = (
  tasks: readonly Task[]
): Map<string, Task[]> => {
  const result = new Map<string, Task[]>();
  tasks
    .filter((task) => !task.isCancelled)
    .forEach((task) => {
      const reporterId = getTaskReporterId(task);
      if (!reporterId) return;
      const current = result.get(reporterId) ?? [];
      result.set(reporterId, [...current, task]);
    });
  return result;
};

export const hasSubmittedReportForDate = ({
  activeTasks,
  progress,
  profileId,
  reportDate
}: {
  readonly activeTasks: readonly Task[];
  readonly progress: readonly ProgressRecord[];
  readonly profileId: string;
  readonly reportDate: string;
}): boolean => {
  const taskIds = new Set(activeTasks.map((task) => task.id));
  return progress.some(
    (record) => record.userId === profileId && record.reportDate === reportDate && taskIds.has(record.taskId)
  );
};

export const hasSubmittedAnyReport = ({
  activeTasks,
  progress,
  profileId
}: {
  readonly activeTasks: readonly Task[];
  readonly progress: readonly ProgressRecord[];
  readonly profileId: string;
}): boolean => {
  const taskIds = new Set(activeTasks.map((task) => task.id));
  return progress.some((record) => record.userId === profileId && taskIds.has(record.taskId));
};
