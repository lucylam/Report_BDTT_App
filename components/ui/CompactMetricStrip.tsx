import { Icon, type IconName } from "./Icon";
import { cn } from "@/lib/ui";

export type CompactMetricTone =
  | "accent"
  | "danger"
  | "info"
  | "neutral"
  | "primary"
  | "success"
  | "warning";

export interface CompactMetricItem {
  readonly icon: IconName;
  readonly key: string;
  readonly label: string;
  readonly shortLabel?: string;
  readonly tone?: CompactMetricTone;
  readonly value: number | string;
}

interface CompactMetricStripProps {
  readonly ariaLabel: string;
  readonly className?: string;
  readonly columns?: 3 | 4;
  readonly items: readonly CompactMetricItem[];
  readonly onSelect?: (key: string) => void;
}

const toneClass = (tone: CompactMetricTone = "neutral"): string => {
  if (tone === "primary") return "text-[var(--primary-strong)]";
  if (tone === "danger") return "text-[var(--danger-strong)]";
  if (tone === "warning") return "text-[var(--warning-strong)]";
  if (tone === "accent") return "text-[var(--accent-strong)]";
  if (tone === "success") return "text-[var(--success-strong)]";
  if (tone === "info") return "text-[var(--info-strong)]";
  return "text-[var(--foreground)]";
};

const MetricContent = ({ item }: { readonly item: CompactMetricItem }): React.ReactElement => (
  <>
    <span className="flex min-w-0 items-center justify-center gap-1.5">
      <Icon className="h-4 w-4 shrink-0" name={item.icon} />
      <span className="text-lg font-semibold leading-5 tabular-nums">{item.value}</span>
    </span>
    <span className="mt-1 block min-w-0 break-words text-center text-xs font-semibold leading-4 text-current opacity-80">
      {item.shortLabel ?? item.label}
    </span>
  </>
);

export const CompactMetricStrip = ({
  ariaLabel,
  className,
  columns = 3,
  items,
  onSelect
}: CompactMetricStripProps): React.ReactElement => {
  const columnsClass =
    columns === 4
      ? "compact-metric-strip-4 grid-cols-4"
      : "compact-metric-strip-3 grid-cols-3";
  const itemClass =
    "min-h-14 min-w-0 rounded-[var(--radius-field)] border border-[var(--line)] bg-[var(--surface)] px-1.5 py-2 shadow-[var(--shadow-soft-sm)]";

  return (
    <section
      aria-label={ariaLabel}
      className={cn("compact-metric-strip grid gap-1.5", columnsClass, className)}
    >
      {items.map((item) =>
        onSelect ? (
          <button
            aria-label={`${item.label}: ${item.value}`}
            className={cn(
              itemClass,
              "focus-ring pressable transition-colors hover:border-[var(--primary)]",
              toneClass(item.tone)
            )}
            key={item.key}
            onClick={() => onSelect(item.key)}
            type="button"
          >
            <MetricContent item={item} />
          </button>
        ) : (
          <article className={cn(itemClass, toneClass(item.tone))} key={item.key}>
            <MetricContent item={item} />
          </article>
        )
      )}
    </section>
  );
};
