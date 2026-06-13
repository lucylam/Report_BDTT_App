import type { ReactNode } from "react";
import { cn } from "@/lib/ui";

interface EmptyStateProps {
  readonly title: string;
  readonly description: string;
  readonly icon?: ReactNode;
  readonly action?: ReactNode;
  readonly className?: string;
}

export const EmptyState = ({
  title,
  description,
  icon,
  action,
  className
}: EmptyStateProps): React.ReactElement => {
  return (
    <div
      className={cn(
        "glass-card rounded-[var(--radius-card)] border-dashed p-8 text-center",
        className
      )}
    >
      {icon ? <div className="mb-3 flex justify-center text-[var(--text-soft)]">{icon}</div> : null}
      <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--text-muted)]">
        {description}
      </p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
};
