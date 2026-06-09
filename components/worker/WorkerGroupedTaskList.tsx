import { useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { TaskCard } from "@/components/worker/TaskCard";
import type { SaveState, WorkerProgressUpdate } from "@/components/worker/types";
import { DEFAULT_REPORT_DATE } from "@/lib/date";
import { getTaskProgress } from "@/lib/progress";
import type { ProgressRecord, Task } from "@/types/domain";
import type { WorkerTaskGroup } from "@/components/worker/taskView";

interface WorkerGroupedTaskListProps {
  readonly taskGroups: readonly WorkerTaskGroup[];
  readonly progress: readonly ProgressRecord[];
  readonly saveStates: Readonly<Record<string, SaveState>>;
  readonly onChange: (taskId: string, update: WorkerProgressUpdate) => void;
  readonly onCancel: (taskId: string) => void;
}

export const WorkerGroupedTaskList = ({
  taskGroups,
  progress,
  saveStates,
  onChange,
  onCancel
}: WorkerGroupedTaskListProps): React.ReactElement => {
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
        description="Không có hạng mục phù hợp với bộ lọc hiện tại."
        title="Không có hạng mục"
      />
    );
  }

  return (
    <>
      {taskGroups.map((group) => {
        const isCollapsed = collapsedGroups.has(group.key);
        return (
          <div className="space-y-2" key={group.key}>
            <button
              aria-expanded={!isCollapsed}
              className={`focus-ring pressable flex min-h-12 w-full items-center justify-between gap-3 rounded-[1.5rem] border px-4 text-left shadow-[var(--shadow-soft-sm)] ${
                isCollapsed
                  ? "border-[var(--border-strong)] bg-[var(--primary-pale)] text-[var(--primary-strong)]"
                  : "border-[var(--primary)] bg-[var(--primary-strong)] text-white"
              }`}
              onClick={() => toggleGroup(group.key)}
              type="button"
            >
              <span className="min-w-0">
                <span className="block truncate font-bold">{group.label}</span>
                <span className={`mt-0.5 block text-xs font-semibold ${isCollapsed ? "text-[var(--text-muted)]" : "text-white/75"}`}>
                  {group.tasks.length} hạng mục
                </span>
              </span>
              <span className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ${
                isCollapsed
                  ? "bg-white/86 text-[var(--primary-strong)] ring-1 ring-[var(--border)]"
                  : "bg-white/16 text-white"
              }`}>
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
              <TaskGroupItems
                onCancel={onCancel}
                onChange={onChange}
                progress={progress}
                saveStates={saveStates}
                tasks={group.tasks}
              />
            )}
          </div>
        );
      })}
    </>
  );
};

const TaskGroupItems = ({
  tasks,
  progress,
  saveStates,
  onChange,
  onCancel
}: {
  readonly tasks: readonly Task[];
  readonly progress: readonly ProgressRecord[];
  readonly saveStates: Readonly<Record<string, SaveState>>;
  readonly onChange: (taskId: string, update: WorkerProgressUpdate) => void;
  readonly onCancel: (taskId: string) => void;
}): React.ReactElement => {
  return (
    <>
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          onCancel={() => onCancel(task.id)}
          onChange={(update) => onChange(task.id, update)}
          progress={getTaskProgress(progress, task.id, DEFAULT_REPORT_DATE)}
          saveState={saveStates[task.id] ?? "idle"}
          task={task}
        />
      ))}
    </>
  );
};
