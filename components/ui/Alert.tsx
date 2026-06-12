import type { ReactNode } from "react";
import { cn } from "@/lib/ui";

export type AlertTone = "danger" | "warning" | "success" | "info";

const toneClass: Record<AlertTone, string> = {
  danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning-strong)]",
  success: "bg-[var(--success-soft)] text-[var(--success)]",
  info: "bg-[var(--info-soft)] text-[var(--info-strong)]"
};

interface AlertProps {
  readonly tone?: AlertTone;
  readonly className?: string;
  readonly children: ReactNode;
}

export const Alert = ({
  tone = "danger",
  className,
  children
}: AlertProps): React.ReactElement => {
  return (
    <p
      aria-live="polite"
      className={cn(
        "rounded-[var(--radius-field)] p-3 px-4 text-sm font-semibold",
        toneClass[tone],
        className
      )}
    >
      {children}
    </p>
  );
};
