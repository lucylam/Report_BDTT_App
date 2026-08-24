import type { ReactNode } from "react";
import { cn } from "@/lib/ui";

interface PageHeaderProps {
  readonly eyebrow?: string;
  readonly title: string;
  readonly description?: string;
  readonly actions?: ReactNode;
  readonly className?: string;
  readonly mobileCompact?: boolean;
}

export const PageHeader = ({
  eyebrow,
  title,
  description,
  actions,
  className,
  mobileCompact = true
}: PageHeaderProps): React.ReactElement => {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center",
        mobileCompact ? "gap-2 lg:gap-3" : "gap-3",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <p
            className={cn(
              "text-xs font-semibold uppercase text-[var(--primary-strong)]",
              mobileCompact && "hidden lg:block"
            )}
          >
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={cn(
            "max-w-full text-balance break-words font-semibold leading-tight tracking-normal text-[var(--foreground)]",
            mobileCompact ? "text-xl lg:mt-1 lg:text-3xl" : "mt-1 text-2xl lg:text-3xl"
          )}
        >
          {title}
        </h1>
        {description ? (
          <p
            className={cn(
              "mt-1 break-words text-sm font-semibold leading-5 text-[var(--text-muted)]",
              mobileCompact && "hidden lg:block"
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
};
