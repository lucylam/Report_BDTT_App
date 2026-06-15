import type { ProgressPercent } from "@/types/domain";

export type WorkerFilter = "all" | "todo" | "progress" | "done" | "p1" | "cancelled";

export type SaveState = "idle" | "draft" | "saving" | "saved" | "offline" | "error";

export interface WorkerProgressUpdate {
  readonly percent: ProgressPercent;
  readonly note: string;
  readonly photoPath?: string;
}

export type WorkerProgressDraftMap = Readonly<Record<string, WorkerProgressUpdate>>;
