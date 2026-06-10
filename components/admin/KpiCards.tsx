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
      emphasis: "primary"
    },
    {
      label: "Chưa báo cáo",
      value: String(metrics.unsubmittedWorkers),
      helper: "Thành viên cần nhắc",
      emphasis: metrics.unsubmittedWorkers > 0 ? "danger" : "success"
    },
    {
      label: "P1 chưa xong",
      value: String(metrics.priorityOpen),
      helper: "Ưu tiên cao",
      emphasis: metrics.priorityOpen > 0 ? "danger" : "success"
    },
    {
      label: "Cancel",
      value: String(metrics.cancelled),
      helper: "WorkOrder đã báo hủy",
      emphasis: metrics.cancelled > 0 ? "danger" : "neutral"
    },
    {
      label: "Quá hạn",
      value: String(metrics.overdue),
      helper: "Finish date đã qua",
      emphasis: metrics.overdue > 0 ? "danger" : "success"
    },
    {
      label: "Đang làm",
      value: String(metrics.inProgress),
      helper: "0 < % < 100",
      emphasis: "warning"
    }
  ];

  return (
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-6">
      {cards.map((card) => (
        <div
          className={`min-h-28 rounded-[1.5rem] border p-4 shadow-[var(--shadow-soft-sm)] backdrop-blur-xl sm:min-h-32 ${toneClass(card.emphasis)}`}
          key={card.label}
        >
          <p className="text-xs font-bold uppercase opacity-70">{card.label}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{card.value}</p>
          <p className="mt-2 text-xs font-semibold leading-5 opacity-70">{card.helper}</p>
        </div>
      ))}
    </section>
  );
};

const toneClass = (emphasis: string): string => {
  if (emphasis === "primary") {
    return "border-[var(--primary-strong)] bg-[var(--primary-strong)] text-white";
  }
  if (emphasis === "danger") {
    return "border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]";
  }
  if (emphasis === "warning") {
    return "border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--warning)]";
  }
  if (emphasis === "success") {
    return "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]";
  }
  return "border-white/80 bg-white/82 text-slate-900";
};
