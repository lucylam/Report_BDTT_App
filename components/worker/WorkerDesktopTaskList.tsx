import { useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { DEFAULT_REPORT_DATE } from "@/lib/date";
import { getTaskPercent } from "@/lib/progress";
import type { ProgressRecord, Task } from "@/types/domain";
import type { WorkerTaskGroup } from "@/components/worker/taskView";

interface WorkerDesktopTaskListProps {
  readonly taskGroups: readonly WorkerTaskGroup[];
  readonly progress: readonly ProgressRecord[];
  readonly selectedTask: Task | null;
  readonly onSelectTask: (taskId: string) => void;
}

const percentTone = (percent: number): string => {
  if (percent === 100) return "bg-[var(--success)]";
  if (percent >= 75) return "bg-[var(--info)]";
  if (percent > 0) return "bg-[var(--warning)]";
  return "bg-slate-300";
};

export const WorkerDesktopTaskList = ({
  taskGroups,
  progress,
  selectedTask,
  onSelectTask
}: WorkerDesktopTaskListProps): React.ReactElement => {
  const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<string>>(
    () => new Set(taskGroups.slice(1).map((group) => group.key))
  );

  const toggleGroup = (groupKey: string): void => {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  if (taskGroups.length === 0) {
    return (
      <EmptyState
        description="Thử chọn bộ lọc “Tất cả” hoặc xóa từ khóa tìm kiếm. Nếu vẫn trống, có thể bạn chưa được giao hạng mục nào — hãy liên hệ nhóm trưởng."
        title="Không có hạng mục"
      />
    );
  }

  return (
    <div className="space-y-4">
      {taskGroups.map((group) => {
        const isCollapsed = collapsedGroups.has(group.key);
        return (
          <section key={group.key}>
            <button
              aria-expanded={!isCollapsed}
              className={`focus-ring pressable sticky top-0 z-10 mb-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-[var(--radius-card)] border px-4 text-left text-sm font-bold shadow-[var(--shadow-soft-sm)] backdrop-blur-xl ${
                isCollapsed
                  ? "border-[var(--line)] bg-white/82 text-[var(--primary-strong)]"
                  : "border-[var(--primary)] bg-[var(--primary-strong)] text-white"
              }`}
              onClick={() => toggleGroup(group.key)}
              type="button"
            >
              <span className="min-w-0">
                <span className="block truncate">{group.label}</span>
                <span
                  className={`mt-0.5 block text-xs font-semibold ${
                    isCollapsed ? "text-[var(--text-muted)]" : "text-white/75"
                  }`}
                >
                  {group.tasks.length} hạng mục
                </span>
              </span>
              <span
                className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ${
                  isCollapsed
                    ? "bg-[var(--primary-pale)] text-[var(--primary-strong)] ring-1 ring-[var(--line)]"
                    : "bg-white/16 text-white"
                }`}
              >
                {isCollapsed ? "Mở" : "Đóng"}
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 border-b-2 border-r-2 transition-transform ${
                    isCollapsed
                      ? "translate-y-[-1px] rotate-45 border-[var(--primary-strong)]"
                      : "translate-y-[1px] rotate-[225deg] border-white"
                  }`}
                />
              </span>
            </button>
            {isCollapsed ? null : (
              <div className="space-y-2">
                {group.tasks.map((task) => {
                  const percent = getTaskPercent(progress, task.id, DEFAULT_REPORT_DATE);
                  const selected = selectedTask?.id === task.id;
                  return (
                    <button
                      aria-pressed={selected}
                      className={`focus-ring pressable w-full rounded-[var(--radius-card)] border bg-white/88 p-3 text-left shadow-sm transition ${
                        selected
                          ? "border-[var(--primary)] bg-white ring-4 ring-[var(--primary-soft)]"
                          : "border-[var(--border-strong)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
                      }`}
                      key={task.id}
                      onClick={() => onSelectTask(task.id)}
                      type="button"
                    >
                      <div className="grid grid-cols-[minmax(110px,0.9fr)_minmax(0,1.7fr)_72px] items-center gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-base font-semibold">
                            {task.tagname}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">
                            WO {task.wo || "N/A"}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-700">
                            {task.taskName}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold">
                            <Badge label={`P${task.priority}`} tone="danger" />
                            <Badge label={task.donVi || "N/A"} tone="info" />
                            <Badge label={task.section || "N/A"} tone="neutral" />
                            {task.isCancelled ? <Badge label="Cancel" tone="danger" /> : null}
                          </div>
                        </div>
                        <div>
                          <p className="text-right text-base font-semibold tabular-nums">
                            {task.isCancelled ? "NA" : `${percent}%`}
                          </p>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white ring-1 ring-[var(--border)]">
                            <div
                              className={`h-full rounded-full ${percentTone(percent)}`}
                              style={{ width: `${task.isCancelled ? 0 : percent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};

const Badge = ({
  label,
  tone
}: {
  readonly label: string;
  readonly tone: "danger" | "info" | "neutral";
}): React.ReactElement => {
  const className =
    tone === "danger"
      ? "bg-[var(--danger)] text-white"
      : tone === "info"
        ? "bg-[var(--info)] text-white"
        : "bg-white text-slate-800 ring-1 ring-[var(--border-strong)]";
  return <span className={`rounded px-2 py-1 font-bold ${className}`}>{label}</span>;
};
