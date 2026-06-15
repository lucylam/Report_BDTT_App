import { TaskDetailPanel } from "@/components/admin/tasks/TaskDetailPanel";
import { Badge } from "@/components/ui";
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
    <section className="hidden gap-5 lg:grid xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="max-h-[680px] overflow-x-hidden overflow-y-auto rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)]">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--surface)] font-semibold uppercase text-[11px] text-[var(--text-soft)]">
            <tr>
              <th className="sticky left-0 z-30 w-[18%] bg-[var(--surface)] py-3 pl-4 pr-3">
                Tagname
              </th>
              <th className="w-[8%] py-3 pr-3">Section</th>
              <th className="w-[10%] py-3 pr-3">Nhóm</th>
              <th className="w-[8%] py-3 pr-3">Đơn vị</th>
              <th className="w-[4%] py-3 pr-3">P</th>
              <th className="w-[17%] py-3 pr-3">Resource</th>
              <th className="w-[8%] py-3 pr-3">Tiến độ</th>
              <th className="w-[13%] py-3 pr-3">Trạng thái</th>
              <th className="w-[14%] py-3 pr-3">Finish</th>
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
                    selected ? "bg-[var(--primary-soft)]" : "hover:bg-[var(--line-soft)]"
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
                    className={`sticky left-0 z-10 py-3 pl-4 pr-3 ${
                      selected ? "bg-[var(--primary-soft)]" : "bg-[var(--surface)]"
                    }`}
                    title={`${task.tagname || "N/A"} · WO ${task.wo || "N/A"}`}
                  >
                    <p className="truncate font-mono font-semibold">{task.tagname || "N/A"}</p>
                    <p className="mt-1 truncate text-xs font-medium text-[var(--text-muted)]">
                      WO {task.wo || "N/A"}
                    </p>
                  </td>
                  <td className="py-3 pr-3" title={task.section || "N/A"}>
                    <span className="block truncate">{task.section || "N/A"}</span>
                  </td>
                  <td className="py-3 pr-3" title={task.nhom || "N/A"}>
                    <span className="block truncate">{task.nhom || "N/A"}</span>
                  </td>
                  <td className="py-3 pr-3" title={task.donVi || "N/A"}>
                    <span className="block truncate">{task.donVi || "N/A"}</span>
                  </td>
                  <td className="py-3 pr-3 font-semibold text-[var(--danger)]">
                    P{task.priority}
                  </td>
                  <td className="py-3 pr-3" title={task.resourceName || "N/A"}>
                    <span className="block truncate">{task.resourceName || "N/A"}</span>
                  </td>
                  <td className="py-3 pr-3">
                    <Badge
                      className="min-h-9 w-[58px] justify-center px-2 text-center leading-4"
                      solid
                      tone={task.isCancelled ? "danger" : getStatusTone(status)}
                    >
                      {getProgressLabel(task, percent)}
                    </Badge>
                  </td>
                  <td className="py-3 pr-3">
                    <Badge
                      className="min-h-10 w-[94px] justify-center whitespace-normal px-3 py-1 text-center leading-4"
                      solid
                      tone={getStatusTone(status)}
                    >
                      {getStatusLabel(status)}
                    </Badge>
                  </td>
                  <td className="py-3 pr-3" title={task.finishDate || "N/A"}>
                    <span className="block whitespace-nowrap text-xs font-medium tabular-nums">
                      {task.finishDate || "N/A"}
                    </span>
                  </td>
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
