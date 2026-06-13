import { cn } from "@/lib/ui";

export type ProgressTone =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent"
  | "yellow";

const toneClass: Record<ProgressTone, string> = {
  primary: "bg-[var(--primary)]",
  success: "bg-[var(--success)]",
  warning: "bg-[var(--warning)]",
  danger: "bg-[var(--danger)]",
  info: "bg-[var(--info)]",
  accent: "bg-[var(--accent)]",
  yellow: "bg-[var(--yellow)]"
};

const stripeClass: Record<ProgressTone, string> = {
  primary: "progress-stripe-primary",
  success: "progress-stripe-success",
  warning: "progress-stripe-warning",
  danger: "progress-stripe-danger",
  info: "progress-stripe-info",
  accent: "progress-stripe-accent",
  yellow: "progress-stripe-yellow"
};

interface ProgressBarProps {
  readonly value: number;
  readonly tone?: ProgressTone;
  /** Bật để hiển thị sọc chéo 45° (clone family-budget) trên track phẳng. */
  readonly striped?: boolean;
  readonly className?: string;
}

export const ProgressBar = ({
  value,
  tone = "primary",
  striped = false,
  className
}: ProgressBarProps): React.ReactElement => {
  const clamped = Math.max(0, Math.min(100, value));

  if (striped) {
    return (
      <div
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={clamped}
        className={cn("h-4 overflow-hidden rounded-sm bg-[var(--line)]", className)}
        role="progressbar"
      >
        <div
          className={cn("h-full rounded-sm", stripeClass[tone])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    );
  }

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
