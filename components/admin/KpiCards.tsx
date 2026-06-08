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
      label: "Worker chưa báo cáo",
      value: String(metrics.unsubmittedWorkers),
      helper: "Cần nhắc cập nhật",
      emphasis: metrics.unsubmittedWorkers > 0 ? "danger" : "success"
    },
    {
      label: "P1 chưa xong",
      value: String(metrics.priorityOpen),
      helper: "Ưu tiên cao",
      emphasis: metrics.priorityOpen > 0 ? "danger" : "success"
    },
    {
      label: "Hạng mục Cancel",
      value: String(metrics.cancelled),
      helper: "Worker đã báo cancel",
      emphasis: metrics.cancelled > 0 ? "danger" : "neutral"
    },
    {
      label: "Quá hạn",
      value: String(metrics.overdue),
      helper: "Finish date đã qua",
      emphasis: metrics.overdue > 0 ? "danger" : "success"
    },
    {
      label: "Đang thực hiện",
      value: String(metrics.inProgress),
      helper: "0 < % < 100",
      emphasis: "warning"
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {cards.map((card) => (
        <div
          className={`rounded-3xl border p-5 shadow-[var(--shadow-soft-sm)] ${toneClass(card.emphasis)}`}
          key={card.label}
        >
          <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{card.label}</p>
          <p className="mt-3 text-4xl font-semibold tabular-nums tracking-tight">{card.value}</p>
          <p className="mt-2 text-xs font-medium leading-5 opacity-75">{card.helper}</p>
        </div>
      ))}
    </section>
  );
};

const toneClass = (emphasis: string): string => {
  if (emphasis === "primary") {
    return "border-[var(--foreground)] bg-[var(--foreground)] text-white";
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
  return "border-white/70 bg-white/80 text-slate-900 backdrop-blur-xl";
};
