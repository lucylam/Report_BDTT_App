import { useState } from "react";
import { EmptyState, Icon } from "@/components/ui";
import { TaskCard } from "@/components/worker/TaskCard";
import type { SaveState, WorkerProgressUpdate } from "@/components/worker/types";
import { getTaskProgress } from "@/lib/progress";
import type { ProgressRecord, Task } from "@/types/domain";
import type { WorkerTaskGroup } from "@/components/worker/taskView";

interface WorkerGroupedTaskListProps {
  readonly taskGroups: readonly WorkerTaskGroup[];
  readonly progress: readonly ProgressRecord[];
  readonly reportDate: string;
  readonly saveStates: Readonly<Record<string, SaveState>>;
  readonly onChange: (taskId: string, update: WorkerProgressUpdate) => void;
  readonly onCancel: (taskId: string) => void;
}

export const WorkerGroupedTaskList = ({
  taskGroups,
  progress,
  reportDate,
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
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  if (taskGroups.length === 0) {
    return (
      <EmptyState
        description="Thử chọn bộ lọc “Tất cả” hoặc xóa từ khóa tìm kiếm. Nếu vẫn trống, có thể bạn chưa được giao hạng mục nào. Hãy liên hệ nhóm trưởng."
        title="Không có hạng mục"
      />
    );
  }

  return (
    <>
      {taskGroups.map((group) => {
        const isCollapsed = collapsedGroups.has(group.key);
        return (
          <div className="space-y-1.5" key={group.key}>
            <button
              aria-expanded={!isCollapsed}
              className={`focus-ring pressable flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-[var(--radius-field)] border px-3 py-1.5 text-left shadow-[var(--shadow-soft-sm)] ${
                isCollapsed
                  ? "border-[var(--line)] bg-[var(--surface)] text-[var(--primary-strong)]"
                  : "border-[var(--primary)] bg-[var(--primary-strong)] text-[var(--primary-contrast)]"
              }`}
              onClick={() => toggleGroup(group.key)}
              type="button"
            >
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <span className="mobile-single-line min-w-0 flex-1 font-semibold">{group.label}</span>
                <span className={`shrink-0 text-xs font-medium ${isCollapsed ? "text-[var(--text-muted)]" : "text-[var(--primary-contrast)] opacity-80"}`}>
                  {group.tasks.length}
                </span>
              </span>
              <Icon
                className={`h-4 w-4 transition-transform duration-200 ${isCollapsed ? "" : "rotate-180"}`}
                name="chevronDown"
              />
            </button>
            {isCollapsed ? null : (
              <TaskGroupItems
                onCancel={onCancel}
                onChange={onChange}
                progress={progress}
                reportDate={reportDate}
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
  reportDate,
  saveStates,
  onChange,
  onCancel
}: {
  readonly tasks: readonly Task[];
  readonly progress: readonly ProgressRecord[];
  readonly reportDate: string;
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
          progress={getTaskProgress(progress, task.id, reportDate)}
          saveState={saveStates[task.id] ?? "idle"}
          task={task}
        />
      ))}
    </>
  );
};
