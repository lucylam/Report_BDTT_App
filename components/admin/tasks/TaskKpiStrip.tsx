import type { TaskKpis } from "@/components/admin/tasks/taskTableModel";
import { Icon, type IconName } from "@/components/ui";

interface TaskKpiStripProps {
  readonly kpis: TaskKpis;
  readonly onSelect?: (key: keyof TaskKpis) => void;
}

const kpiItems: ReadonlyArray<{
  readonly key: keyof TaskKpis;
  readonly icon: IconName;
  readonly label: string;
  readonly className: string;
}> = [
  { key: "total", icon: "workorder", label: "Tổng hạng mục", className: "text-[var(--foreground)]" },
  { key: "p1Open", icon: "bell", label: "P1 chưa xong", className: "text-[var(--danger-strong)]" },
  { key: "notStarted", icon: "list", label: "Chưa thực hiện", className: "text-[var(--warning-strong)]" },
  { key: "inProgress", icon: "chart", label: "Đang thực hiện", className: "text-[var(--info-strong)]" },
  { key: "cancelled", icon: "logout", label: "Cancel", className: "text-[var(--danger-strong)]" },
  { key: "completed", icon: "check", label: "Hoàn thành", className: "text-[var(--success-strong)]" }
];

export const TaskKpiStrip = ({ kpis, onSelect }: TaskKpiStripProps): React.ReactElement => {
  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {kpiItems.map((item) => (
        <button
          aria-label={`Lọc theo ${item.label}: ${kpis[item.key]}`}
          className={`metric-card focus-ring pressable min-h-11 rounded-[var(--radius-card)] p-4 text-left transition-colors hover:border-[var(--primary)] ${item.className}`}
          key={item.key}
          onClick={() => onSelect?.(item.key)}
          type="button"
        >
          <div className="flex items-center gap-2">
            <Icon name={item.icon} />
            <p className="text-xs font-semibold uppercase text-current opacity-80">
              {item.label}
            </p>
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {kpis[item.key]}
          </p>
        </button>
      ))}
    </section>
  );
};
