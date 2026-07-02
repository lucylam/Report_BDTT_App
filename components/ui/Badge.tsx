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
  success: "bg-[var(--success)] text-white shadow-sm",
  warning: "bg-[var(--warning)] text-white shadow-sm",
  accent: "bg-[var(--accent)] text-white shadow-sm",
  danger: "bg-[var(--danger)] text-white shadow-sm",
  info: "bg-[var(--info)] text-white shadow-sm",
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
        "inline-flex min-h-7 max-w-full min-w-0 items-center overflow-hidden whitespace-nowrap rounded-full px-2.5 text-xs font-semibold tabular-nums",
        solid ? solidClass[tone] : softClass[tone],
        className
      )}
    >
      {children}
    </span>
  );
};
