import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/ui";

export type AlertTone = "danger" | "warning" | "success" | "info";

const toneClass: Record<AlertTone, string> = {
  danger: "border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]",
  warning: "border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--warning-strong)]",
  success: "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]",
  info: "border-[var(--info)] bg-[var(--info-soft)] text-[var(--info-strong)]"
};

const toneIcon: Record<AlertTone, IconName> = {
  danger: "bell",
  warning: "bell",
  success: "check",
  info: "help"
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
    <div
      aria-live="polite"
      className={cn(
        "flex items-start gap-2 rounded-[var(--radius-field)] border p-3 text-sm font-semibold leading-5 shadow-[var(--shadow-soft-sm)]",
        toneClass[tone],
        className
      )}
    >
      <Icon className="mt-0.5" name={toneIcon[tone]} />
      <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">{children}</div>
    </div>
  );
};
