import { EmptyState } from "@/components/ui";
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
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--primary)]">
        Hạng mục đang chọn
      </p>
      <h2 className="mt-1 font-mono text-xl font-semibold">{task.tagname}</h2>
      <p className="mt-1 text-sm leading-5 text-[var(--text-muted)]">{task.taskName}</p>
      <div className="mt-3 grid grid-cols-2 overflow-hidden border border-[var(--line)] text-sm">
        <Info label="Đơn vị" value={task.donVi} />
        <Info label="Section" value={task.section} />
        <Info label="Priority" value={`P${task.priority}`} />
        <Info label="Finish" value={task.finishDate || "N/A"} />
      </div>
      <div className="mt-3 border-t border-[var(--line)] pt-3">
        {task.isCancelled ? (
          <div className="border-l-2 border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2.5 text-sm font-semibold text-[var(--danger)]">
            Hạng mục này đã được hủy và đã báo cho admin.
            {task.cancelReason ? (
              <span className="mt-2 block font-medium text-[var(--text-muted)]">
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
              className="focus-ring pressable mt-3 min-h-10 rounded-[var(--radius-field)] border border-[var(--danger)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)]"
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
    <div className="border-b border-r border-[var(--line)] bg-[var(--surface-muted)] px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-0.5 font-semibold">{value || "N/A"}</p>
    </div>
  );
};
