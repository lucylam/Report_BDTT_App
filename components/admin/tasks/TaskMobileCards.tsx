import { Badge } from "@/components/ui";
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
          <article className="rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft-sm)]" key={task.id}>
            <div className="flex items-center gap-3">
              <ProgressRing percent={task.isCancelled ? 0 : percent} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-base font-semibold leading-tight">{task.tagname}</p>
                <p className="mt-1 truncate text-xs font-semibold uppercase text-[var(--primary-strong)]">
                  WO {task.wo || "N/A"} · P{task.priority}
                </p>
                <p className="mt-1 truncate text-xs font-semibold text-[var(--text-muted)]">
                  Sec {task.section || "N/A"} · {task.donVi || "N/A"}
                </p>
              </div>
              <Badge className="shrink-0" solid tone={task.isCancelled ? "danger" : getStatusTone(status)}>
                {getProgressLabel(task, percent)}
              </Badge>
            </div>

            <p className="mt-3 line-clamp-2 text-sm font-semibold leading-5 text-[var(--foreground)]">
              {task.taskName || "N/A"}
            </p>

            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <Chip label={task.nhom || "N/A"} />
              <Chip label={task.resourceName || "N/A"} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <Info label="Finish" value={task.finishDate || "N/A"} />
              <Info label="Trạng thái" value={getStatusLabel(status)} />
            </div>

            {task.isCancelled ? (
              <p className="mt-3 rounded-[var(--radius-field)] bg-[var(--danger-soft)] p-3 text-sm font-semibold text-[var(--danger)]">
                {task.cancelReason || "Chưa nhập lý do cancel"}
              </p>
            ) : null}

            {progress?.note ? (
              <p className="mt-3 rounded-[var(--radius-field)] bg-[var(--surface-muted)] p-3 text-sm font-medium leading-6 text-[var(--foreground)] ring-1 ring-[var(--border)]">
                {progress.note}
              </p>
            ) : null}
          </article>
        );
      })}
    </section>
  );
};

const ProgressRing = ({ percent }: { readonly percent: number }): React.ReactElement => {
  const color =
    percent === 100 ? "var(--success)" : percent > 0 ? "var(--accent)" : "var(--text-soft)";
  const dash = Math.max(percent, 2);

  return (
    <div className="relative h-12 w-12 shrink-0">
      <svg className="h-12 w-12 -rotate-90" viewBox="0 0 42 42">
        <circle cx="21" cy="21" fill="none" r="15.9" stroke="var(--line)" strokeWidth="5" />
        <circle
          cx="21"
          cy="21"
          fill="none"
          r="15.9"
          stroke={color}
          strokeDasharray={`${dash} ${100 - dash}`}
          strokeLinecap="round"
          strokeWidth="5"
        />
      </svg>
      <span
        className="absolute inset-0 grid place-items-center text-[11px] font-semibold"
        style={{ color }}
      >
        {percent}%
      </span>
    </div>
  );
};

const Chip = ({ label }: { readonly label: string }): React.ReactElement => (
  <span className="inline-block max-w-full min-w-0 truncate rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-[var(--foreground)] ring-1 ring-[var(--border)]">
    {label}
  </span>
);

const Info = ({
  label,
  value
}: {
  readonly label: string;
  readonly value: string;
}): React.ReactElement => (
  <div className="rounded-[var(--radius-field)] bg-[var(--surface-muted)] p-3 ring-1 ring-[var(--border)]">
    <p className="mobile-compact-label font-semibold uppercase text-[var(--text-soft)]">{label}</p>
    <p className="mt-1 truncate font-semibold text-[var(--foreground)]">{value}</p>
  </div>
);
