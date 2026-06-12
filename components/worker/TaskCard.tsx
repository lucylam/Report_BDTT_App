"use client";

import { useState } from "react";
import { Badge } from "@/components/ui";
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

  return (
    <article className="glass-card overflow-hidden rounded-[var(--radius-field)]">
      <div className="flex items-start gap-3 p-4">
        <ProgressRing cancelled={task.isCancelled} percent={percent} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-mono text-base font-extrabold leading-tight text-[var(--foreground)]">
                {task.tagname}
              </h2>
              <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-slate-700">
                {task.taskName}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-white/92 px-3 py-2 text-sm font-extrabold tabular-nums shadow-sm ring-1 ring-[var(--border)]">
              {task.isCancelled ? "NA" : `${percent}%`}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {task.isCancelled ? <Badge solid tone="danger">Cancel</Badge> : null}
            <Badge solid tone={priorityTone(task.priority)}>P{task.priority}</Badge>
            <Badge solid tone="info">{task.donVi || "N/A"}</Badge>
            <Badge solid tone="neutral">{task.duration || "N/A"}</Badge>
            {hasDetail ? <Badge solid tone="success">Có ghi nhận</Badge> : null}
          </div>
        </div>
      </div>

      <div className="mx-4 progress-track">
        <div
          className="progress-fill"
          style={{
            background:
              percent === 100
                ? "var(--success)"
                : percent > 0
                  ? "var(--warning)"
                  : "var(--text-soft)",
            width: `${task.isCancelled ? 0 : percent}%`
          }}
        />
      </div>

      <div className="p-4">
        {task.isCancelled ? (
          <div className="rounded-[var(--radius-field)] bg-[var(--danger-soft)] p-4 text-sm font-bold text-[var(--danger)]">
            Hạng mục này đã được hủy và đã báo cho admin.
            {task.cancelReason ? (
              <span className="mt-2 block font-semibold text-slate-700">
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
              className="focus-ring pressable mt-3 min-h-12 w-full rounded-full border border-[var(--border)] bg-white/86 px-3 text-sm font-extrabold text-[var(--primary-strong)] shadow-sm"
              onClick={() => setIsExpanded((current) => !current)}
              type="button"
            >
              {isExpanded ? "Thu gọn ghi chú / ảnh" : "Mở ghi chú / ảnh"}
            </button>
            {isExpanded ? (
              <button
                className="focus-ring pressable mt-2 min-h-12 w-full rounded-full border border-[var(--danger)] bg-white/78 px-3 text-sm font-extrabold text-[var(--danger)]"
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

const ProgressRing = ({
  cancelled,
  percent
}: {
  readonly cancelled: boolean;
  readonly percent: ProgressPercent;
}): React.ReactElement => {
  const safePercent = cancelled ? 0 : percent;
  const color =
    cancelled || safePercent === 0
      ? "var(--text-soft)"
      : safePercent === 100
        ? "var(--success)"
        : "var(--warning)";
  const dash = Math.max(safePercent, 2);

  return (
    <div className="relative h-12 w-12 shrink-0">
      <svg className="h-12 w-12 -rotate-90" viewBox="0 0 42 42">
        <circle cx="21" cy="21" fill="none" r="15.9" stroke="var(--line)" strokeWidth="5" />
        <circle
          cx="21"
          cy="21"
          fill="none"
          r="15.9"
          stroke={color}
          strokeDasharray={`${dash} ${100 - dash}`}
          strokeLinecap="round"
          strokeWidth="5"
        />
      </svg>
      <span
        className="absolute inset-0 grid place-items-center text-[10px] font-extrabold"
        style={{ color }}
      >
        {cancelled ? "NA" : `${safePercent}%`}
      </span>
    </div>
  );
};
