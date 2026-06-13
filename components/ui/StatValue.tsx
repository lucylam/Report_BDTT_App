import type { ReactNode } from "react";
import { cn } from "@/lib/ui";

export type StatTone = "positive" | "negative" | "neutral";

interface StatValueProps {
  readonly label: string;
  /** Giá trị KPI: %, số việc, số đơn vị… (không phải tiền). */
  readonly value: ReactNode;
  readonly trend?: string;
  readonly tone?: StatTone;
  readonly className?: string;
}

const trendClass: Record<StatTone, string> = {
  positive: "text-[var(--success-strong)]",
  negative: "text-[var(--danger)]",
  neutral: "text-[var(--text-muted)]"
};

/**
 * KPI số lớn (bản BDTT của "AmountKpi" family-budget) — dùng cho %, số việc, số đơn vị.
 */
export const StatValue = ({
  label,
  value,
  trend,
  tone = "neutral",
  className
}: StatValueProps): React.ReactElement => {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[12px] font-medium text-[var(--text-muted)]">{label}</p>
      <span className="mt-1 block text-[26px] font-semibold leading-none tabular-nums text-[var(--foreground)]">
        {value}
      </span>
      {trend ? (
        <p className={cn("mt-1 flex items-center gap-1 text-[11px] font-medium", trendClass[tone])}>
          {trend}
        </p>
      ) : null}
    </div>
  );
};
