"use client";

import { useState } from "react";
import { CompactTaskDisclosure } from "@/components/tasks/CompactTaskDisclosure";
import { TaskReportTimeline } from "@/components/tasks/TaskReportTimeline";
import { Alert, Badge, Icon, ProgressBar, type BadgeTone } from "@/components/ui";
import type { ProgressTone } from "@/components/ui";
import { ProgressEditor } from "@/components/worker/ProgressEditor";
import type { SaveState, WorkerProgressUpdate } from "@/components/worker/types";
import { getProgressPhotoPaths } from "@/lib/photo";
import type { ProgressRecord, Task } from "@/types/domain";

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

const progressBadgeTone = (cancelled: boolean, percent: number): BadgeTone => {
  if (cancelled) return "danger";
  if (percent >= 100) return "success";
  if (percent > 0) return "accent";
  return "neutral";
};

export const TaskCard = ({
  task,
  progress,
  saveState,
  onChange,
  onCancel
}: TaskCardProps): React.ReactElement => {
  const [isExpanded, setIsExpanded] = useState(false);
  const percent = progress?.percent ?? 0;
  const hasDetail = Boolean(progress?.note || getProgressPhotoPaths(progress).length);

  return (
    <CompactTaskDisclosure
      expanded={isExpanded}
      onToggle={() => setIsExpanded((current) => !current)}
      status={task.isCancelled ? "NA" : `${percent}%`}
      statusTone={progressBadgeTone(task.isCancelled, percent)}
      subtitle={`WO ${task.wo || "N/A"} · ${task.taskName || "N/A"}`}
      title={task.tagname || "N/A"}
    >
      <div className="space-y-3">
        <div>
          <p className="break-words text-sm font-semibold leading-5 text-[var(--foreground)]">
            {task.taskName || "N/A"}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {task.isCancelled ? <Badge solid tone="danger">Cancel</Badge> : null}
            <Badge solid tone={priorityTone(task.priority)}>P{task.priority}</Badge>
            <Badge solid tone="info">{task.donVi || "N/A"}</Badge>
            <Badge solid tone="neutral">{task.duration || "N/A"}</Badge>
            {hasDetail ? <Badge tone="success">Có ghi nhận</Badge> : null}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-sm font-medium leading-5 tabular-nums text-[var(--text-muted)]">
          <div className="min-w-0 rounded-[var(--radius-field)] bg-[var(--surface-muted)] p-2.5">
            <dt className="text-xs font-semibold">Start</dt>
            <dd className="break-words text-[var(--foreground)]">{task.startDate || "N/A"}</dd>
          </div>
          <div className="min-w-0 rounded-[var(--radius-field)] bg-[var(--surface-muted)] p-2.5">
            <dt className="text-xs font-semibold">Finish</dt>
            <dd className="break-words text-[var(--foreground)]">{task.finishDate || "N/A"}</dd>
          </div>
        </dl>

        <ProgressBar
          striped
          tone={progressTone(percent)}
          value={task.isCancelled ? 0 : percent}
        />

        {task.isCancelled ? (
          <Alert tone="danger">
            Hạng mục đã hủy.
            {task.cancelReason ? (
              <span className="mt-2 block font-medium text-[var(--text-muted)]">
                Lý do: {task.cancelReason}
              </span>
            ) : null}
          </Alert>
        ) : (
          <>
            <TaskReportTimeline
              refreshKey={progress?.submittedAt}
              taskId={task.id}
            />
            <ProgressEditor
              density="compact"
              onChange={onChange}
              progress={progress}
              saveState={saveState}
              showDetails
              task={task}
            />
            <button
              className="focus-ring pressable inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-field)] border border-[var(--danger)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)]"
              onClick={onCancel}
              type="button"
            >
              <Icon name="close" />
              Hủy hạng mục
            </button>
          </>
        )}
      </div>
    </CompactTaskDisclosure>
  );
};
