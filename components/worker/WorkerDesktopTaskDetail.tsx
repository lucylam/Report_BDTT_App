import { Alert, EmptyState, Icon } from "@/components/ui";
import { TaskReportTimeline } from "@/components/tasks/TaskReportTimeline";
import { ProgressEditor } from "@/components/worker/ProgressEditor";
import type {
  SaveState,
  WorkerProgressUpdate
} from "@/components/worker/types";
import { getTaskProgress } from "@/lib/progress";
import type { ProgressRecord, Task } from "@/types/domain";

interface WorkerDesktopTaskDetailProps {
  readonly task: Task | null;
  readonly progress: readonly ProgressRecord[];
  readonly reportDate: string;
  readonly saveStates: Readonly<Record<string, SaveState>>;
  readonly onChange: (taskId: string, update: WorkerProgressUpdate) => void;
  readonly onCancel: (taskId: string) => void;
}

export const WorkerDesktopTaskDetail = ({
  task,
  progress,
  reportDate,
  saveStates,
  onChange,
  onCancel
}: WorkerDesktopTaskDetailProps): React.ReactElement => {
  if (!task) {
    return (
      <EmptyState
        description="Chọn một hạng mục trong danh sách để cập nhật tiến độ."
        title="Chưa chọn hạng mục"
      />
    );
  }

  const currentProgress = getTaskProgress(progress, task.id, reportDate);

  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--primary)]">
        Hạng mục đang chọn
      </p>
      <h2 className="mt-1 font-mono text-xl font-semibold">{task.tagname}</h2>
      <p className="mt-1 text-sm leading-5 text-[var(--text-muted)]">{task.taskName}</p>
      <div className="mt-3 grid grid-cols-2 overflow-hidden border border-[var(--line)] text-sm">
        <Info label="Đơn vị" value={task.donVi} />
        <Info label="Section" value={task.section} />
        <Info label="Priority" value={`P${task.priority}`} />
        <Info label="Thời lượng" value={task.duration || "N/A"} />
        <Info label="Start Time" value={task.startDate || "N/A"} />
        <Info label="Finish Time" value={task.finishDate || "N/A"} />
      </div>
      <div className="mt-3 border-t border-[var(--line)] pt-3">
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
            <TaskReportTimeline
              className="mb-3"
              refreshKey={currentProgress?.submittedAt}
              taskId={task.id}
            />
            <ProgressEditor
              key={task.id}
              onChange={(update) => onChange(task.id, update)}
              progress={currentProgress}
              saveState={saveStates[task.id] ?? "idle"}
              task={task}
            />
            <button
              className="focus-ring pressable mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-field)] border border-[var(--danger)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)]"
              onClick={() => onCancel(task.id)}
              type="button"
            >
              <Icon name="close" />
              Hủy hạng mục
            </button>
          </>
        )}
      </div>
    </>
  );
};

const Info = ({
  label,
  value
}: {
  readonly label: string;
  readonly value: string;
}): React.ReactElement => {
  return (
    <div className="border-b border-r border-[var(--line)] bg-[var(--surface-muted)] px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-0.5 font-semibold">{value || "N/A"}</p>
    </div>
  );
};
