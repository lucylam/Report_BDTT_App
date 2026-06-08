import { StatusBadge } from "@/components/StatusBadge";
import { TaskDetailPanel } from "@/components/admin/tasks/TaskDetailPanel";
import {
  getProgressLabel,
  getStatusLabel,
  getStatusTone,
  type TaskRow
} from "@/components/admin/tasks/taskTableModel";

interface TaskDesktopWorkspaceProps {
  readonly rows: readonly TaskRow[];
  readonly selectedTaskId: string | null;
  readonly onSelectTask: (taskId: string) => void;
}

export const TaskDesktopWorkspace = ({
  rows,
  selectedTaskId,
  onSelectTask
}: TaskDesktopWorkspaceProps): React.ReactElement => {
  const selectedRow =
    rows.find((row) => row.task.id === selectedTaskId) ?? rows[0] ?? null;

  return (
    <section className="hidden gap-4 lg:grid xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="max-h-[680px] overflow-auto rounded-[2rem] border border-[var(--border-strong)] bg-white/90 shadow-[var(--shadow-soft-sm)]">
        <table className="min-w-[1320px] text-left text-sm">
          <thead className="sticky top-0 z-20 border-b border-[var(--border-strong)] bg-white/95 font-bold text-slate-800 backdrop-blur">
            <tr>
              <th className="sticky left-0 z-30 bg-white py-3 pl-4 pr-4">Tagname</th>
              <th className="py-3 pr-4">WO</th>
              <th className="min-w-[280px] py-3 pr-4">Hạng mục</th>
              <th className="py-3 pr-4">Section</th>
              <th className="py-3 pr-4">Nhóm</th>
              <th className="py-3 pr-4">Đơn vị</th>
              <th className="py-3 pr-4">P</th>
              <th className="min-w-[160px] py-3 pr-4">Resource</th>
              <th className="py-3 pr-4">Tiến độ</th>
              <th className="py-3 pr-4">Trạng thái</th>
              <th className="py-3 pr-4">Finish</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const { task, percent, status } = row;
              const selected = selectedRow?.task.id === task.id;
              return (
                <tr
                  aria-pressed={selected}
                  className={`cursor-pointer border-b border-[var(--border)] ${
                    selected ? "bg-[var(--primary-soft)]" : "hover:bg-white"
                  }`}
                  key={task.id}
                  onClick={() => onSelectTask(task.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectTask(task.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <td
                    className={`sticky left-0 z-10 py-3 pl-4 pr-4 font-mono font-bold backdrop-blur ${
                      selected ? "bg-[var(--primary-soft)]" : "bg-white/95"
                    }`}
                  >
                    {task.tagname}
                  </td>
                  <td className="py-3 pr-4 font-semibold">{task.wo || "N/A"}</td>
                  <td className="py-3 pr-4">
                    <p className="line-clamp-2 font-semibold leading-5 text-slate-800">
                      {task.taskName || "N/A"}
                    </p>
                  </td>
                  <td className="py-3 pr-4">{task.section || "N/A"}</td>
                  <td className="py-3 pr-4">{task.nhom || "N/A"}</td>
                  <td className="py-3 pr-4">{task.donVi || "N/A"}</td>
                  <td className="py-3 pr-4 font-bold text-[var(--danger)]">P{task.priority}</td>
                  <td className="py-3 pr-4">{task.resourceName || "N/A"}</td>
                  <td className="py-3 pr-4">
                    <StatusBadge
                      label={getProgressLabel(task, percent)}
                      tone={task.isCancelled ? "danger" : getStatusTone(status)}
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge label={getStatusLabel(status)} tone={getStatusTone(status)} />
                  </td>
                  <td className="py-3 pr-4">{task.finishDate || "N/A"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <TaskDetailPanel row={selectedRow} />
    </section>
  );
};
