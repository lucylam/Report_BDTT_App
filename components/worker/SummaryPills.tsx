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
      <div className="rounded-2xl bg-white/75 px-2 py-3 text-center shadow-[var(--shadow-soft-sm)] ring-1 ring-[var(--border)]">
        <p className="text-2xl font-semibold tabular-nums text-[var(--success)]">{done}</p>
        <p className="text-xs font-semibold text-[var(--text-muted)]">Hoàn thành</p>
      </div>
      <div className="rounded-2xl bg-white/75 px-2 py-3 text-center shadow-[var(--shadow-soft-sm)] ring-1 ring-[var(--border)]">
        <p className="text-2xl font-semibold tabular-nums text-[var(--warning)]">{progress}</p>
        <p className="text-xs font-semibold text-[var(--text-muted)]">Đang thực hiện</p>
      </div>
      <div className="rounded-2xl bg-white/75 px-2 py-3 text-center shadow-[var(--shadow-soft-sm)] ring-1 ring-[var(--border)]">
        <p className="text-2xl font-semibold tabular-nums text-slate-500">{todo}</p>
        <p className="text-xs font-semibold text-[var(--text-muted)]">Chưa thực hiện</p>
      </div>
    </div>
  );
};
