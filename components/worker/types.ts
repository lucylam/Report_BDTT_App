import type { ProgressPercent } from "@/types/domain";

export type WorkerFilter = "all" | "todo" | "progress" | "done" | "p1" | "cancelled";

export type SaveState = "idle" | "saving" | "saved" | "offline" | "error";

export interface WorkerProgressUpdate {
  readonly percent: ProgressPercent;
  readonly note: string;
  readonly photoPath?: string;
}
