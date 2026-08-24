"use client";

import { useState } from "react";
import { Alert, Badge, Icon, ProgressBar } from "@/components/ui";
import type { ProgressTone } from "@/components/ui";
import { ProgressEditor } from "@/components/worker/ProgressEditor";
import type { SaveState, WorkerProgressUpdate } from "@/components/worker/types";
import { getProgressPhotoPaths } from "@/lib/photo";
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

const progressTone = (percent: number): ProgressTone => {
  if (percent >= 100) return "success";
  if (percent > 0) return "accent";
  return "primary";
};

export const TaskCard = ({
  task,
  progress,
  saveState,
  onChange,
  onCancel
}: TaskCardProps): React.ReactElement => {
  const [isExpanded, setIsExpanded] = useState<boolean>(
    Boolean(progress?.note || getProgressPhotoPaths(progress).length)
  );
  const percent = progress?.percent ?? 0;
  const hasDetail = Boolean(progress?.note || getProgressPhotoPaths(progress).length);

  return (
    <article className="glass-card overflow-hidden rounded-[var(--radius-card)]">
      <div className="mobile-reflow-row flex items-start gap-3 p-3">
        <ProgressRing cancelled={task.isCancelled} percent={percent} />
        <div className="min-w-0 flex-1">
          <div className="mobile-card-heading flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="break-words font-mono text-base font-semibold leading-tight text-[var(--info-strong)]">
                {task.tagname}
              </h2>
              <p className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-[var(--text-muted)]">
                {task.taskName}
              </p>
            </div>
            <span className="shrink-0 rounded-[var(--radius-field)] bg-[var(--surface-muted)] px-2.5 py-1.5 text-sm font-semibold tabular-nums ring-1 ring-[var(--border)]">
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
          <dl className="mobile-reflow-grid mt-2 grid grid-cols-2 gap-2 text-xs font-medium leading-5 tabular-nums text-[var(--text-muted)]">
            <div className="min-w-0"><dt className="font-semibold">Start Time</dt><dd className="break-words">{task.startDate || "N/A"}</dd></div>
            <div className="min-w-0"><dt className="font-semibold">Finish</dt><dd className="break-words">{task.finishDate || "N/A"}</dd></div>
          </dl>
        </div>
      </div>

      <ProgressBar
        className="mx-3"
        striped
        tone={progressTone(percent)}
        value={task.isCancelled ? 0 : percent}
      />

      <div className="p-3">
        {task.isCancelled ? (
          <Alert tone="danger">
            Hạng mục này đã được hủy và đã báo cho admin.
            {task.cancelReason ? (
              <span className="mt-2 block font-medium text-[var(--text-muted)]">
                Lý do: {task.cancelReason}
              </span>
            ) : null}
          </Alert>
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
              className="focus-ring pressable mt-3 min-h-12 w-full rounded-[var(--radius-field)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--primary-strong)] hover:bg-[var(--surface-muted)]"
              onClick={() => setIsExpanded((current) => !current)}
              type="button"
            >
              {isExpanded ? "Thu gọn ghi chú / ảnh" : "Mở ghi chú / ảnh"}
            </button>
            {isExpanded ? (
              <button
                className="focus-ring pressable mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-field)] border border-[var(--danger)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                onClick={onCancel}
                type="button"
              >
                <Icon name="close" />
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
        : "var(--accent)";
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
        className="absolute inset-0 grid place-items-center text-[10px] font-semibold"
        style={{ color }}
      >
        {cancelled ? "NA" : `${safePercent}%`}
      </span>
    </div>
  );
};
