import type { Profile, ProgressRecord, Task } from "@/types/domain";

export const isReportablePersonnel = (profile: Profile): boolean =>
  profile.canLogin && !profile.isPlaceholder;

export const getReportablePersonnel = (
  profiles: readonly Profile[]
): Profile[] => profiles.filter(isReportablePersonnel);

export const getActiveTasksByAssignee = (
  tasks: readonly Task[]
): Map<string, Task[]> => {
  const result = new Map<string, Task[]>();
  tasks
    .filter((task) => !task.isCancelled && task.assignedTo)
    .forEach((task) => {
      const assigneeId = task.assignedTo;
      if (!assigneeId) return;
      const current = result.get(assigneeId) ?? [];
      result.set(assigneeId, [...current, task]);
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
  if (activeTasks.length === 0) return true;
  return progress.some(
    (record) => record.userId === profileId && record.reportDate === reportDate
  );
};
