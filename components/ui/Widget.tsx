import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/ui";

interface WidgetProps {
  readonly children: ReactNode;
  readonly className?: string;
}

/** Khối nội dung dùng chung của giao diện BDTT cũ. */
export const Widget = ({ children, className }: WidgetProps): React.ReactElement => {
  return (
    <section
      className={cn(
        "glass-card overflow-hidden rounded-[var(--radius-card)] p-4 text-[var(--foreground)]",
        className
      )}
    >
      {children}
    </section>
  );
};

interface WidgetHeaderProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly action?: ReactNode;
  readonly icon?: IconName;
  readonly tone?: "primary" | "success" | "accent" | "warning" | "danger" | "info" | "neutral";
  readonly className?: string;
  readonly mobileCompact?: boolean;
}

const headerToneClass = {
  primary: "bg-[var(--primary-soft)] text-[var(--primary-strong)]",
  success: "bg-[var(--success-soft)] text-[var(--success-strong)]",
  accent: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning-strong)]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger-strong)]",
  info: "bg-[var(--info-soft)] text-[var(--info-strong)]",
  neutral: "bg-[var(--surface-muted)] text-[var(--text-muted)]"
} as const;

/** Header của Widget: tiêu đề + phụ đề, kèm nút hành động bên phải. */
export const WidgetHeader = ({
  title,
  subtitle,
  action,
  icon,
  tone = "primary",
  className,
  mobileCompact = true
}: WidgetHeaderProps): React.ReactElement => {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between",
        mobileCompact ? "mb-2 gap-2 lg:mb-3 lg:gap-3" : "mb-3 gap-3",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {icon ? (
          <span
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded-[var(--radius-field)]",
              mobileCompact ? "h-9 w-9 lg:h-10 lg:w-10" : "h-10 w-10",
              headerToneClass[tone]
            )}
          >
            <Icon name={icon} />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-[15px] font-semibold leading-5 text-[var(--foreground)]">
            {title}
          </h2>
          {subtitle ? (
            <p
              className={cn(
                "mt-0.5 break-words text-[11px] leading-4 text-[var(--text-muted)]",
                mobileCompact && "hidden lg:block"
              )}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
};
