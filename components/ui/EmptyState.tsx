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
        "glass-card rounded-[var(--radius-card)] border-dashed p-4 text-center sm:p-6 lg:p-8",
        className
      )}
    >
      {icon ? <div className="mb-3 flex justify-center text-[var(--text-soft)]">{icon}</div> : null}
      <h2 className="text-base font-semibold text-[var(--foreground)] lg:text-lg">{title}</h2>
      <p className="mt-1.5 text-sm font-medium leading-5 text-[var(--text-muted)] lg:mt-2 lg:font-semibold lg:leading-6">
        {description}
      </p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
};
