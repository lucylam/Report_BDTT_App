import type { ProgressPercent } from "@/types/domain";

interface SummaryPillsProps {
  readonly percents: readonly ProgressPercent[];
}

export const SummaryPills = ({
  percents
}: SummaryPillsProps): React.ReactElement => {
  const done = percents.filter((percent) => percent === 100).length;
  const progress = percents.filter(
    (percent) => percent > 0 && percent < 100
  ).length;
  const todo = percents.filter((percent) => percent === 0).length;

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="rounded-[1.35rem] bg-white/82 px-2 py-2 text-center shadow-[var(--shadow-soft-sm)] ring-1 ring-[var(--border)] md:py-3">
        <p className="text-xl font-semibold tabular-nums text-[var(--success)] md:text-2xl">{done}</p>
        <p className="text-xs font-semibold text-[var(--text-muted)]">Hoàn thành</p>
      </div>
      <div className="rounded-[1.35rem] bg-white/82 px-2 py-2 text-center shadow-[var(--shadow-soft-sm)] ring-1 ring-[var(--border)] md:py-3">
        <p className="text-xl font-semibold tabular-nums text-[var(--warning)] md:text-2xl">{progress}</p>
        <p className="text-xs font-semibold text-[var(--text-muted)]">Đang thực hiện</p>
      </div>
      <div className="rounded-[1.35rem] bg-white/82 px-2 py-2 text-center shadow-[var(--shadow-soft-sm)] ring-1 ring-[var(--border)] md:py-3">
        <p className="text-xl font-semibold tabular-nums text-slate-500 md:text-2xl">{todo}</p>
        <p className="text-xs font-semibold text-[var(--text-muted)]">Chưa thực hiện</p>
      </div>
    </div>
  );
};
