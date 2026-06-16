import { DEFAULT_REPORT_DATE } from "@/lib/date";
import type { AppData, ProgressPercent, ProgressRecord, Task } from "@/types/domain";

export const OFFICIAL_DEMO_NOTE = "[DEMO] Tiến độ minh họa.";
export const OFFICIAL_DEMO_NOTE_PREFIX = "[DEMO]";

export interface DemoProgressMutationResult {
  readonly data: AppData;
  readonly created: number;
  readonly cleared: number;
  readonly skipped: number;
  readonly totalDemo: number;
}

const demoPercents: readonly ProgressPercent[] = [
  100,
  75,
  50,
  25,
  75,
  50,
  100,
  25
];

const defaultMaxDemoRecords = 36;

export const isOfficialDemoProgress = (record: ProgressRecord): boolean => {
  return record.note.trim().startsWith(OFFICIAL_DEMO_NOTE_PREFIX);
};

export const clearOfficialDemoProgress = (data: AppData): DemoProgressMutationResult => {
  const progress = data.progress.filter((record) => !isOfficialDemoProgress(record));
  const cleared = data.progress.length - progress.length;
  const nextData: AppData = {
    ...data,
    progress
  };

  return {
    data: nextData,
    created: 0,
    cleared,
    skipped: 0,
    totalDemo: 0
  };
};

export const applyOfficialDemoProgress = (
  data: AppData,
  reportDate = DEFAULT_REPORT_DATE,
  maxRecords = defaultMaxDemoRecords
): DemoProgressMutationResult => {
  const currentProgressTaskIds = new Set(
    data.progress
      .filter((record) => record.reportDate <= reportDate)
      .map((record) => record.taskId)
  );
  const candidates = pickDemoCandidateTasks(data.tasks, currentProgressTaskIds, maxRecords);
  const demoRecords = candidates.map((task, index): ProgressRecord => {
    return {
      taskId: task.id,
      userId: task.assignedTo ?? "",
      reportDate,
      percent: demoPercents[index % demoPercents.length],
      note: OFFICIAL_DEMO_NOTE,
      submittedAt: `${reportDate}T${String(8 + (index % 8)).padStart(2, "0")}:${String(
        (index * 7) % 60
      ).padStart(2, "0")}:00+07:00`
    };
  });
  const nextData: AppData = {
    ...data,
    progress: [...data.progress, ...demoRecords]
  };
  const totalDemo = nextData.progress.filter(isOfficialDemoProgress).length;

  return {
    data: nextData,
    created: demoRecords.length,
    cleared: 0,
    skipped: data.tasks.filter((task) => !task.isCancelled).length - candidates.length,
    totalDemo
  };
};

const pickDemoCandidateTasks = (
  tasks: readonly Task[],
  nonDemoProgressTaskIds: ReadonlySet<string>,
  maxRecords: number
): Task[] => {
  const groupedByUnit = new Map<string, Task[]>();
  tasks
    .filter((task) => !task.isCancelled && Boolean(task.assignedTo))
    .filter((task) => !nonDemoProgressTaskIds.has(task.id))
    .sort(compareDemoTaskPriority)
    .forEach((task) => {
      const key = task.donVi || "N/A";
      groupedByUnit.set(key, [...(groupedByUnit.get(key) ?? []), task]);
    });

  const result: Task[] = [];
  const unitNames = Array.from(groupedByUnit.keys()).sort((left, right) =>
    left.localeCompare(right, "vi")
  );

  while (result.length < maxRecords) {
    const beforeRound = result.length;
    unitNames.forEach((unitName) => {
      if (result.length >= maxRecords) return;
      const rows = groupedByUnit.get(unitName);
      const nextTask = rows?.shift();
      if (nextTask) result.push(nextTask);
    });
    if (result.length === beforeRound) break;
  }

  return result;
};

const compareDemoTaskPriority = (left: Task, right: Task): number => {
  if (left.priority !== right.priority) return left.priority - right.priority;
  if (left.finishDate !== right.finishDate) return left.finishDate.localeCompare(right.finishDate);
  return left.tagname.localeCompare(right.tagname, "vi");
};
