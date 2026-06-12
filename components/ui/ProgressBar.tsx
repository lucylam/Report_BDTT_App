import { cn } from "@/lib/ui";

export type ProgressTone = "primary" | "success" | "warning" | "danger" | "info";

const toneClass: Record<ProgressTone, string> = {
  primary: "bg-[var(--primary)]",
  success: "bg-[var(--success)]",
  warning: "bg-[var(--warning)]",
  danger: "bg-[var(--danger)]",
  info: "bg-[var(--info)]"
};

interface ProgressBarProps {
  readonly value: number;
  readonly tone?: ProgressTone;
  readonly className?: string;
}

export const ProgressBar = ({
  value,
  tone = "primary",
  className
}: ProgressBarProps): React.ReactElement => {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={clamped}
      className={cn("progress-track", className)}
      role="progressbar"
    >
      <div className={cn("progress-fill", toneClass[tone])} style={{ width: `${clamped}%` }} />
    </div>
  );
};
