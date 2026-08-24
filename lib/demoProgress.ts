export const DEMO_PROGRESS_NOTE = "[DEMO] Tiến độ minh họa";
export const DEMO_PROGRESS_BATCH_SIZE = 36;

export interface DemoProgressTaskCandidate {
  readonly id: string;
  readonly assignedTo: string | null;
  readonly reporterId: string | null;
  readonly donVi: string;
  readonly nhomTruong: string;
  readonly priority: number;
  readonly startDate: string;
  readonly finishDate: string;
  readonly tagname: string;
  readonly progressMode: "binary" | "continuous";
  readonly isCancelled: boolean;
}

export interface DemoProgressInsertRow {
  readonly task_id: string;
  readonly user_id: string;
  readonly report_date: string;
  readonly percent: number;
  readonly note: string;
  readonly photo_path: null;
  readonly submitted_by: string;
  readonly submitted_at: string;
  readonly updated_at: string;
  readonly trial_run_id: string;
}

const continuousPercents = [25, 50, 75, 100] as const;
const binaryPercents = [0, 100] as const;

const compareCandidates = (
  left: DemoProgressTaskCandidate,
  right: DemoProgressTaskCandidate
): number => {
  if (left.priority !== right.priority) return left.priority - right.priority;
  if (left.finishDate !== right.finishDate) {
    return left.finishDate.localeCompare(right.finishDate);
  }
  return left.tagname.localeCompare(right.tagname, "vi");
};

const isScheduledOn = (
  task: DemoProgressTaskCandidate,
  reportDate: string
): boolean => {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(task.startDate) &&
    /^\d{4}-\d{2}-\d{2}$/.test(task.finishDate) &&
    task.startDate <= reportDate &&
    task.finishDate >= reportDate
  );
};

export const pickDemoProgressTasks = (
  tasks: readonly DemoProgressTaskCandidate[],
  excludedTaskIds: ReadonlySet<string>,
  reportDate: string,
  maxRecords = DEMO_PROGRESS_BATCH_SIZE
): DemoProgressTaskCandidate[] => {
  const groups = new Map<string, DemoProgressTaskCandidate[]>();
  tasks
    .filter((task) => !task.isCancelled)
    .filter((task) => Boolean(task.reporterId || task.assignedTo))
    .filter((task) => !excludedTaskIds.has(task.id))
    .filter((task) => isScheduledOn(task, reportDate))
    .sort(compareCandidates)
    .forEach((task) => {
      const key = `${task.donVi.trim() || "N/A"}::${task.nhomTruong.trim() || "N/A"}`;
      groups.set(key, [...(groups.get(key) ?? []), task]);
    });

  const result: DemoProgressTaskCandidate[] = [];
  const groupKeys = Array.from(groups.keys()).sort((left, right) =>
    left.localeCompare(right, "vi")
  );
  const safeMaximum = Math.max(1, Math.floor(maxRecords));

  while (result.length < safeMaximum) {
    const previousLength = result.length;
    groupKeys.forEach((key) => {
      if (result.length >= safeMaximum) return;
      const task = groups.get(key)?.shift();
      if (task) result.push(task);
    });
    if (result.length === previousLength) break;
  }

  return result;
};

export const createDemoProgressRows = (
  tasks: readonly DemoProgressTaskCandidate[],
  options: {
    readonly reportDate: string;
    readonly trialRunId: string;
    readonly submittedBy: string;
    readonly submittedAt: string;
    readonly sequenceOffset?: number;
  }
): DemoProgressInsertRow[] => {
  const offset = Math.max(0, options.sequenceOffset ?? 0);
  return tasks.flatMap((task, index) => {
    const userId = task.reporterId || task.assignedTo;
    if (!userId) return [];
    const sequence = offset + index;
    const percent = task.progressMode === "binary"
      ? binaryPercents[sequence % binaryPercents.length]
      : continuousPercents[sequence % continuousPercents.length];

    return [{
      task_id: task.id,
      user_id: userId,
      report_date: options.reportDate,
      percent,
      note: DEMO_PROGRESS_NOTE,
      photo_path: null,
      submitted_by: options.submittedBy,
      submitted_at: options.submittedAt,
      updated_at: options.submittedAt,
      trial_run_id: options.trialRunId
    }];
  });
};
