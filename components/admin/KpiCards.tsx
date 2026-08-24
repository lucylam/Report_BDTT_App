import { Icon, type IconName } from "@/components/ui";
import type { DashboardMetrics } from "@/types/domain";

interface KpiCardsProps {
  readonly metrics: DashboardMetrics;
}

const formatPercent = (value: number): string => `${value}%`;

export const KpiCards = ({ metrics }: KpiCardsProps): React.ReactElement => {
  const cards = [
    {
      label: "Tổng tiến độ",
      value: formatPercent(metrics.overallPercent),
      helper: `${metrics.completed}/${metrics.totalTasks} hoàn thành`,
      icon: "chart" as IconName,
      emphasis: "primary"
    },
    {
      label: "Chưa báo cáo",
      value: String(metrics.unsubmittedWorkers),
      helper: "Thành viên cần nhắc",
      icon: "people" as IconName,
      emphasis: metrics.unsubmittedWorkers > 0 ? "danger" : "success"
    },
    {
      label: "P1 chưa xong",
      value: String(metrics.priorityOpen),
      helper: "Ưu tiên cao",
      icon: "bell" as IconName,
      emphasis: metrics.priorityOpen > 0 ? "danger" : "success"
    },
    {
      label: "Cancel",
      value: String(metrics.cancelled),
      helper: "WorkOrder đã báo hủy",
      icon: "logout" as IconName,
      emphasis: metrics.cancelled > 0 ? "danger" : "neutral"
    },
    {
      label: "Quá hạn",
      value: String(metrics.overdue),
      helper: "Finish date đã qua",
      icon: "calendar" as IconName,
      emphasis: metrics.overdue > 0 ? "danger" : "success"
    },
    {
      label: "Đang làm",
      value: String(metrics.inProgress),
      helper: "0 < % < 100",
      icon: "list" as IconName,
      emphasis: "accent"
    }
  ];

  return (
    <section className="mobile-adaptive-grid grid grid-cols-2 gap-3 xl:grid-cols-6">
      {cards.map((card) => (
        <div
          className={`metric-card min-h-28 rounded-[var(--radius-card)] p-4 sm:min-h-32 ${toneClass(card.emphasis)}`}
          key={card.label}
        >
          <div className="flex min-w-0 items-center gap-2 pr-6">
            <Icon name={card.icon} />
            <p className="min-w-0 text-xs font-semibold uppercase leading-5 opacity-80 [overflow-wrap:anywhere]">{card.label}</p>
          </div>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{card.value}</p>
          <p className="mt-2 hidden text-xs font-semibold leading-5 text-[var(--text-muted)] lg:block">{card.helper}</p>
        </div>
      ))}
    </section>
  );
};

const toneClass = (emphasis: string): string => {
  if (emphasis === "primary") {
    return "text-[var(--primary-strong)]";
  }
  if (emphasis === "danger") {
    return "text-[var(--danger-strong)]";
  }
  if (emphasis === "warning") {
    return "text-[var(--warning-strong)]";
  }
  if (emphasis === "accent") {
    return "text-[var(--accent-strong)]";
  }
  if (emphasis === "success") {
    return "text-[var(--success-strong)]";
  }
  return "text-[var(--foreground)]";
};
