import type { TaskKpis } from "@/components/admin/tasks/taskTableModel";

interface TaskKpiStripProps {
  readonly kpis: TaskKpis;
}

const kpiItems = [
  { key: "total", label: "Tổng hạng mục", tone: "text-[var(--foreground)]" },
  { key: "p1Open", label: "P1 chưa xong", tone: "text-[var(--danger)]" },
  { key: "notStarted", label: "Chưa thực hiện", tone: "text-[var(--text-muted)]" },
  { key: "inProgress", label: "Đang thực hiện", tone: "text-[var(--accent-strong)]" },
  { key: "cancelled", label: "Cancel", tone: "text-[var(--danger)]" },
  { key: "completed", label: "Hoàn thành", tone: "text-[var(--success)]" }
] as const;

export const TaskKpiStrip = ({ kpis }: TaskKpiStripProps): React.ReactElement => {
  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {kpiItems.map((item) => (
        <div
          className={`metric-card rounded-[var(--radius-card)] p-4 ${item.tone}`}
          key={item.key}
        >
          <p className="text-[11px] font-semibold uppercase text-[var(--text-soft)]">
            {item.label}
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {kpis[item.key]}
          </p>
        </div>
      ))}
    </section>
  );
};
