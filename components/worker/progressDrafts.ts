import type {
  WorkerProgressDraftMap,
  WorkerProgressUpdate
} from "@/components/worker/types";
import type { ProgressRecord } from "@/types/domain";

const normalizePhotoPath = (value: string | undefined): string => value ?? "";

export const isSameWorkerProgressUpdate = (
  left: WorkerProgressUpdate,
  right: WorkerProgressUpdate
): boolean => {
  return (
    left.percent === right.percent &&
    left.note === right.note &&
    normalizePhotoPath(left.photoPath) === normalizePhotoPath(right.photoPath)
  );
};

export const isSameProgressUpdate = (
  current: Pick<ProgressRecord, "percent" | "note" | "photoPath"> | null,
  update: WorkerProgressUpdate
): boolean => {
  return (
    (current?.percent ?? 0) === update.percent &&
    (current?.note ?? "") === update.note &&
    normalizePhotoPath(current?.photoPath) === normalizePhotoPath(update.photoPath)
  );
};

export const mergeProgressWithDrafts = (
  progress: readonly ProgressRecord[],
  drafts: WorkerProgressDraftMap,
  userId: string,
  reportDate: string
): ProgressRecord[] => {
  const draftEntries = Object.entries(drafts);
  if (draftEntries.length === 0) return [...progress];

  const draftTaskIds = new Set(draftEntries.map(([taskId]) => taskId));
  const committedRecords = progress.filter(
    (record) => !(record.reportDate === reportDate && draftTaskIds.has(record.taskId))
  );

  return [
    ...committedRecords,
    ...draftEntries.map(([taskId, draft]) => ({
      taskId,
      userId,
      reportDate,
      percent: draft.percent,
      note: draft.note,
      photoPath: draft.photoPath
    }))
  ];
};
