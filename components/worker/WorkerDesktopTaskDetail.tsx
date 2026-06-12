import { EmptyState } from "@/components/EmptyState";
import { ProgressEditor } from "@/components/worker/ProgressEditor";
import type {
  SaveState,
  WorkerProgressUpdate
} from "@/components/worker/types";
import { DEFAULT_REPORT_DATE } from "@/lib/date";
import { getTaskProgress } from "@/lib/progress";
import type { ProgressRecord, Task } from "@/types/domain";

interface WorkerDesktopTaskDetailProps {
  readonly task: Task | null;
  readonly progress: readonly ProgressRecord[];
  readonly saveStates: Readonly<Record<string, SaveState>>;
  readonly onChange: (taskId: string, update: WorkerProgressUpdate) => void;
  readonly onCancel: (taskId: string) => void;
}

export const WorkerDesktopTaskDetail = ({
  task,
  progress,
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

  return (
    <>
      <p className="text-sm font-semibold uppercase tracking-wide text-[var(--primary)]">
        Hạng mục đang chọn
      </p>
      <h2 className="mt-2 font-mono text-2xl font-semibold">{task.tagname}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-700">{task.taskName}</p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <Info label="Đơn vị" value={task.donVi} />
        <Info label="Section" value={task.section} />
        <Info label="Priority" value={`P${task.priority}`} />
        <Info label="Finish" value={task.finishDate || "N/A"} />
      </div>
      <div className="mt-5">
        {task.isCancelled ? (
          <div className="rounded-[var(--radius-card)] border border-[var(--danger)] bg-[var(--danger-soft)] p-4 text-sm font-semibold text-[var(--danger)]">
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
              key={task.id}
              onChange={(update) => onChange(task.id, update)}
              progress={getTaskProgress(progress, task.id, DEFAULT_REPORT_DATE)}
              saveState={saveStates[task.id] ?? "idle"}
              task={task}
            />
            <button
              className="focus-ring pressable mt-4 min-h-12 w-full rounded-full border border-[var(--danger)] bg-white/80 px-4 text-sm font-semibold text-[var(--danger)]"
              onClick={() => onCancel(task.id)}
              type="button"
            >
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
    <div className="rounded-[var(--radius-field)] bg-white/82 p-3 shadow-sm ring-1 ring-[var(--border)]">
      <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 font-semibold">{value || "N/A"}</p>
    </div>
  );
};
