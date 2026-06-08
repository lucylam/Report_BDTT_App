"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressEditor } from "@/components/worker/ProgressEditor";
import type { SaveState, WorkerProgressUpdate } from "@/components/worker/types";
import type { ProgressPercent, ProgressRecord, Task } from "@/types/domain";

interface TaskCardProps {
  readonly task: Task;
  readonly progress: ProgressRecord | null;
  readonly saveState: SaveState;
  readonly onChange: (update: WorkerProgressUpdate) => void;
  readonly onCancel: () => void;
}

const percentTone = (percent: ProgressPercent): string => {
  if (percent === 100) return "bg-[var(--success)]";
  if (percent === 75) return "bg-[var(--info)]";
  if (percent > 0) return "bg-[var(--warning)]";
  return "bg-slate-400";
};

const priorityTone = (priority: 1 | 2 | 3): "danger" | "warning" | "neutral" => {
  if (priority === 1) return "danger";
  if (priority === 2) return "warning";
  return "neutral";
};

export const TaskCard = ({
  task,
  progress,
  saveState,
  onChange,
  onCancel
}: TaskCardProps): React.ReactElement => {
  const [isExpanded, setIsExpanded] = useState<boolean>(
    Boolean(progress?.note || progress?.photoPath)
  );
  const percent = progress?.percent ?? 0;
  const hasDetail = Boolean(progress?.note || progress?.photoPath);
  const borderClass =
    task.isCancelled
      ? "border-l-[var(--danger)]"
      : percent === 100
        ? "border-l-[var(--success)]"
        : task.priority === 1
          ? "border-l-[var(--danger)]"
          : task.priority === 2
            ? "border-l-[var(--warning)]"
            : "border-l-slate-400";

  return (
    <article className={`soft-card overflow-hidden rounded-3xl border-l-4 ${borderClass}`}>
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <h2 className="font-mono text-lg font-semibold text-[var(--foreground)]">
            {task.tagname}
          </h2>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-700">
            {task.taskName}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {task.isCancelled ? <StatusBadge label="Cancel" tone="danger" /> : null}
            <StatusBadge label={`P${task.priority}`} tone={priorityTone(task.priority)} />
            <StatusBadge label={task.donVi || "N/A"} tone="info" />
            <StatusBadge label={task.duration || "N/A"} tone="neutral" />
            {hasDetail ? <StatusBadge label="Có ghi nhận" tone="success" /> : null}
          </div>
        </div>
        <span className="rounded-2xl bg-white/90 px-3 py-2 text-base font-semibold tabular-nums shadow-sm ring-1 ring-[var(--border)]">
          {task.isCancelled ? "NA" : `${percent}%`}
        </span>
      </div>

      <div className="mx-4 h-2 overflow-hidden rounded-full bg-white/70 ring-1 ring-[var(--border)]">
        <div
          className={`h-full rounded-full ${percentTone(percent)}`}
          style={{ width: `${task.isCancelled ? 0 : percent}%` }}
        />
      </div>

      <div className="p-4">
        {task.isCancelled ? (
          <div className="rounded-2xl bg-[var(--danger-soft)] p-4 text-sm font-semibold text-[var(--danger)]">
            Hạng mục này đã được hủy và đã báo cho admin.
            {task.cancelReason ? (
              <span className="mt-2 block font-medium text-slate-700">
                Lý do: {task.cancelReason}
              </span>
            ) : null}
          </div>
        ) : (
          <>
            <ProgressEditor
              density="compact"
              onChange={onChange}
              progress={progress}
              saveState={saveState}
              showDetails={isExpanded}
              task={task}
            />
            <button
              className="focus-ring pressable mt-3 min-h-11 w-full rounded-2xl border border-[var(--border)] bg-white/80 px-3 text-sm font-semibold text-[var(--primary)] shadow-sm"
              onClick={() => setIsExpanded((current) => !current)}
              type="button"
            >
              {isExpanded ? "Thu gọn ghi chú / ảnh" : "Mở ghi chú / ảnh"}
            </button>
            {isExpanded ? (
              <button
                className="focus-ring pressable mt-2 min-h-11 w-full rounded-2xl border border-[var(--danger)] bg-white/75 px-3 text-sm font-semibold text-[var(--danger)]"
                onClick={onCancel}
                type="button"
              >
                Hủy hạng mục
              </button>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
};
