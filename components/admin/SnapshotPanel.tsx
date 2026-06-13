import type { DailySnapshot } from "@/types/domain";

interface SnapshotPanelProps {
  readonly snapshots: readonly DailySnapshot[];
}

export const SnapshotPanel = ({
  snapshots
}: SnapshotPanelProps): React.ReactElement => {
  const latest = [...snapshots].sort((left, right) =>
    right.capturedAt.localeCompare(left.capturedAt)
  )[0];

  if (!latest) {
    return (
      <section className="glass-card border-dashed p-5">
        <h2 className="text-lg font-semibold">Snapshot ngày</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Chưa có snapshot. Worker hoặc admin có thể ghi nhận snapshot báo cáo ngày.
        </p>
      </section>
    );
  }

  return (
    <section className="glass-card p-5">
      <h2 className="text-lg font-semibold">Snapshot gần nhất</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <SnapshotMetric label="Ngày" value={latest.snapshotDate} />
        <SnapshotMetric label="Tổng" value={String(latest.totalTasks)} />
        <SnapshotMetric label="Hoàn thành" value={String(latest.completed)} />
        <SnapshotMetric label="Overall" value={`${latest.overallPercent}%`} />
      </div>
    </section>
  );
};

const SnapshotMetric = ({
  label,
  value
}: {
  readonly label: string;
  readonly value: string;
}): React.ReactElement => {
  return (
    <div className="rounded-[var(--radius-field)] bg-[var(--surface-muted)] p-3 ring-1 ring-[var(--border)]">
      <p className="text-xs font-semibold uppercase text-[var(--text-soft)]">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
};
