import type { ReactNode } from "react";
import { cn } from "@/lib/ui";

export type BubbleTone =
  | "primary"
  | "success"
  | "accent"
  | "warning"
  | "danger"
  | "info"
  | "yellow"
  | "neutral";

const softClass: Record<BubbleTone, string> = {
  primary: "bg-[var(--primary-soft)] text-[var(--primary-strong)]",
  success: "bg-[var(--success-soft)] text-[var(--success-strong)]",
  accent: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning-strong)]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger-strong)]",
  info: "bg-[var(--info-soft)] text-[var(--info-strong)]",
  yellow: "bg-[var(--yellow-soft)] text-[var(--warning-strong)]",
  neutral: "bg-[var(--line-soft)] text-[var(--text-muted)]"
};

const solidClass: Record<BubbleTone, string> = {
  primary: "bg-[var(--primary-strong)] text-[var(--primary-contrast)]",
  success: "bg-[var(--success)] text-white",
  accent: "bg-[var(--accent-strong)] text-white",
  warning: "bg-[var(--warning)] text-white",
  danger: "bg-[var(--danger)] text-white",
  info: "bg-[var(--info)] text-white",
  yellow: "bg-[var(--yellow-strong)] text-white",
  neutral: "bg-[var(--text-soft)] text-white"
};

interface BubbleIconProps {
  /** Icon hoặc chữ cái viết tắt hiển thị trong bong bóng. */
  readonly children: ReactNode;
  readonly tone?: BubbleTone;
  /** Số đếm hiển thị ở badge góc trên phải. */
  readonly count?: number;
  readonly badgeTone?: BubbleTone;
  readonly label?: string;
  readonly value?: string;
  readonly className?: string;
}

/**
 * Icon "bong bóng" tròn + badge đếm (clone family-budget, tùy biến cho BDTT).
 * Dùng cho nhóm đơn vị / nhân sự / trạng thái: chữ cái hoặc icon, kèm số việc đang chờ.
 */
export const BubbleIcon = ({
  children,
  tone = "primary",
  count,
  badgeTone = "danger",
  label,
  value,
  className
}: BubbleIconProps): React.ReactElement => {
  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      <div className="relative">
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold",
            softClass[tone]
          )}
        >
          {children}
        </div>
        {typeof count === "number" ? (
          <span
            className={cn(
              "absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold tabular-nums ring-2 ring-[var(--surface)]",
              solidClass[badgeTone]
            )}
          >
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </div>
      {label ? (
        <span className="max-w-[5.5rem] truncate text-center text-xs font-semibold text-[var(--text-muted)]">
          {label}
        </span>
      ) : null}
      {value ? (
        <span className="text-sm font-semibold tabular-nums text-[var(--foreground)]">{value}</span>
      ) : null}
    </div>
  );
};
