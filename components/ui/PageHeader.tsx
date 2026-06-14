import type { ReactNode } from "react";
import { cn } from "@/lib/ui";

interface PageHeaderProps {
  readonly eyebrow?: string;
  readonly title: string;
  readonly description?: string;
  readonly actions?: ReactNode;
  readonly className?: string;
}

export const PageHeader = ({
  eyebrow,
  title,
  description,
  actions,
  className
}: PageHeaderProps): React.ReactElement => {
  return (
    <div className={cn("flex min-w-0 flex-wrap items-center gap-3", className)}>
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase text-[var(--primary-strong)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 max-w-full text-balance break-words text-2xl font-semibold leading-tight tracking-normal text-[var(--foreground)] lg:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-[var(--text-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
};
