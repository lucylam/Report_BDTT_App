import type { ReactNode } from "react";
import { cn } from "@/lib/ui";

interface WidgetProps {
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * Section card phẳng (clone "finance-card" của family-budget, tùy biến cho BDTT).
 * Dùng làm khối widget trên dashboard/worker: nền trắng, viền mảnh, bóng nhẹ, bo 16px.
 */
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
  readonly className?: string;
}

/** Header của Widget: tiêu đề + phụ đề, kèm nút hành động bên phải. */
export const WidgetHeader = ({
  title,
  subtitle,
  action,
  className
}: WidgetHeaderProps): React.ReactElement => {
  return (
    <div className={cn("mb-3 flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="truncate text-[15px] font-semibold leading-5 text-[var(--foreground)]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 truncate text-[11px] leading-4 text-[var(--text-muted)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
};
