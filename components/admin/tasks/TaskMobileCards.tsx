import { StatusBadge } from "@/components/StatusBadge";
import {
  getProgressLabel,
  getStatusLabel,
  getStatusTone,
  type TaskRow
} from "@/components/admin/tasks/taskTableModel";

interface TaskMobileCardsProps {
  readonly rows: readonly TaskRow[];
}

export const TaskMobileCards = ({ rows }: TaskMobileCardsProps): React.ReactElement => {
  return (
    <section className="grid gap-3 lg:hidden">
      {rows.map((row) => {
        const { task, percent, status, progress } = row;
        return (
          <article className="soft-card rounded-3xl p-5" key={task.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-lg font-bold leading-tight">{task.tagname}</p>
                <p className="mt-1 text-xs font-bold uppercase text-[var(--primary-strong)]">
                  WO {task.wo || "N/A"} · P{task.priority}
                </p>
              </div>
              <StatusBadge
                label={getProgressLabel(task, percent)}
                tone={task.isCancelled ? "danger" : getStatusTone(status)}
              />
            </div>

            <p className="mt-3 text-sm font-semibold leading-5 text-slate-800">
              {task.taskName || "N/A"}
            </p>

            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
              <Chip label={task.nhom || "N/A"} />
              <Chip label={task.donVi || "N/A"} />
              <Chip label={task.section || "N/A"} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <Info label="Resource" value={task.resourceName || "N/A"} />
              <Info label="Finish" value={task.finishDate || "N/A"} />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge label={getStatusLabel(status)} tone={getStatusTone(status)} />
              {task.isCancelled ? (
                <span className="rounded-full bg-[var(--danger-soft)] px-3 py-1.5 text-xs font-bold text-[var(--danger)]">
                  {task.cancelReason || "Chưa nhập lý do"}
                </span>
              ) : null}
            </div>

            {progress?.note ? (
              <p className="mt-3 rounded-2xl bg-white p-3 text-sm font-medium leading-6 text-slate-800 ring-1 ring-[var(--border-strong)]">
                {progress.note}
              </p>
            ) : null}
          </article>
        );
      })}
    </section>
  );
};

const Chip = ({ label }: { readonly label: string }): React.ReactElement => {
  return (
    <span className="rounded-full bg-white px-2.5 py-1 text-slate-800 ring-1 ring-[var(--border-strong)]">
      {label}
    </span>
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
    <div className="rounded-2xl bg-white p-3 ring-1 ring-[var(--border-strong)]">
      <p className="text-xs font-bold uppercase text-slate-600">{label}</p>
      <p className="mt-1 truncate font-semibold text-slate-900">{value}</p>
    </div>
  );
};
