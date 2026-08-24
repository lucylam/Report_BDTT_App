import type { ReactNode } from "react";
import { cn } from "@/lib/ui";

export type BadgeTone =
  | "success"
  | "warning"
  | "accent"
  | "danger"
  | "info"
  | "neutral"
  | "primary";

const solidClass: Record<BadgeTone, string> = {
  success: "bg-[var(--success)] text-[var(--on-success)] shadow-sm",
  warning: "bg-[var(--warning)] text-[var(--on-warning)] shadow-sm",
  accent: "bg-[var(--accent)] text-[var(--on-accent)] shadow-sm",
  danger: "bg-[var(--danger)] text-[var(--on-danger)] shadow-sm",
  info: "bg-[var(--info)] text-[var(--on-info)] shadow-sm",
  neutral: "bg-[var(--surface)] text-[var(--foreground)] shadow-sm ring-1 ring-[var(--border-strong)]",
  primary: "bg-[var(--primary-strong)] text-[var(--primary-contrast)] shadow-sm"
};

const softClass: Record<BadgeTone, string> = {
  success: "bg-[var(--success-soft)] text-[var(--success)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning-strong)]",
  accent: "bg-[var(--surface-warm)] text-[var(--accent-strong)]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
  info: "bg-[var(--info-soft)] text-[var(--info-strong)]",
  neutral: "bg-[var(--line-soft)] text-[var(--text-muted)]",
  primary: "bg-[var(--primary-soft)] text-[var(--primary-strong)]"
};

interface BadgeProps {
  readonly tone?: BadgeTone;
  readonly solid?: boolean;
  readonly className?: string;
  readonly children: ReactNode;
}

export const Badge = ({
  tone = "neutral",
  solid = false,
  className,
  children
}: BadgeProps): React.ReactElement => {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 max-w-full min-w-0 items-center justify-center rounded-full px-2.5 py-1 text-center text-xs font-semibold leading-tight tabular-nums [overflow-wrap:anywhere]",
        solid ? solidClass[tone] : softClass[tone],
        className
      )}
    >
      {children}
    </span>
  );
};
