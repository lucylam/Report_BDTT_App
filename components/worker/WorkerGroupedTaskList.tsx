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
    () => new Set()
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
          <div className="space-y-3" key={group.key}>
            <button
              className="focus-ring pressable flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-[var(--border-strong)] border-l-4 border-l-[var(--primary)] bg-white/95 px-4 text-left shadow-[var(--shadow-soft-sm)]"
              onClick={() => toggleGroup(group.key)}
              type="button"
            >
              <span className="font-bold text-[var(--foreground)]">{group.label}</span>
              <span className="shrink-0 rounded-full bg-[var(--primary-soft)] px-2.5 py-1 text-sm font-bold text-[var(--primary-strong)]">
                {group.tasks.length} hạng mục · {isCollapsed ? "Mở nhóm" : "Thu gọn"}
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
