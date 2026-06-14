import type { TaskKpis } from "@/components/admin/tasks/taskTableModel";
import { Icon, type IconName } from "@/components/ui";

interface TaskKpiStripProps {
  readonly kpis: TaskKpis;
}

const kpiItems: ReadonlyArray<{
  readonly key: keyof TaskKpis;
  readonly icon: IconName;
  readonly label: string;
  readonly tone: string;
}> = [
  { key: "total", icon: "workorder", label: "Tổng hạng mục", tone: "text-[var(--foreground)]" },
  { key: "p1Open", icon: "bell", label: "P1 chưa xong", tone: "text-[var(--danger)]" },
  { key: "notStarted", icon: "list", label: "Chưa thực hiện", tone: "text-[var(--text-muted)]" },
  { key: "inProgress", icon: "chart", label: "Đang thực hiện", tone: "text-[var(--accent-strong)]" },
  { key: "cancelled", icon: "logout", label: "Cancel", tone: "text-[var(--danger)]" },
  { key: "completed", icon: "check", label: "Hoàn thành", tone: "text-[var(--success)]" }
];

export const TaskKpiStrip = ({ kpis }: TaskKpiStripProps): React.ReactElement => {
  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {kpiItems.map((item) => (
        <div
          className={`metric-card rounded-[var(--radius-card)] p-4 ${item.tone}`}
          key={item.key}
        >
          <Icon name={item.icon} />
          <p className="mt-3 text-[11px] font-semibold uppercase text-[var(--text-soft)]">
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
