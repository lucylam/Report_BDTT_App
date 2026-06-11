import type { ProgressPercent } from "@/types/domain";

interface SummaryPillsProps {
  readonly percents: readonly ProgressPercent[];
}

export const SummaryPills = ({ percents }: SummaryPillsProps): React.ReactElement => {
  const done = percents.filter((percent) => percent === 100).length;
  const progress = percents.filter((percent) => percent > 0 && percent < 100).length;
  const todo = percents.filter((percent) => percent === 0).length;

  return (
    <div className="grid grid-cols-3 gap-2">
      <SummaryCard label="Hoàn thành" tone="success" value={done} />
      <SummaryCard label="Đang làm" tone="warning" value={progress} />
      <SummaryCard label="Chưa làm" tone="neutral" value={todo} />
    </div>
  );
};

const SummaryCard = ({
  label,
  tone,
  value
}: {
  readonly label: string;
  readonly tone: "success" | "warning" | "neutral";
  readonly value: number;
}): React.ReactElement => {
  const color =
    tone === "success"
      ? "text-[var(--success)]"
      : tone === "warning"
        ? "text-[var(--warning)]"
        : "text-[var(--text-muted)]";

  return (
    <div className={`metric-card rounded-[1.25rem] p-3 text-center ${color}`}>
      <p className="text-2xl font-extrabold tabular-nums md:text-3xl">{value}</p>
      <p className="mt-1 text-[11px] font-extrabold text-[var(--text-muted)]">{label}</p>
    </div>
  );
};
