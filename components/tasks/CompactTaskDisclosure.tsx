"use client";

import { useId, type ReactNode } from "react";
import { Badge, Icon, type BadgeTone } from "@/components/ui";
import { cn } from "@/lib/ui";

interface CompactTaskDisclosureProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly expanded: boolean;
  readonly onToggle: () => void;
  readonly status: string;
  readonly statusTone?: BadgeTone;
  readonly subtitle?: string;
  readonly title: string;
}

export const CompactTaskDisclosure = ({
  children,
  className,
  expanded,
  onToggle,
  status,
  statusTone = "neutral",
  subtitle,
  title
}: CompactTaskDisclosureProps): React.ReactElement => {
  const detailId = useId();

  return (
    <article
      className={cn(
        "overflow-hidden rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-soft-sm)]",
        className
      )}
    >
      <button
        aria-controls={detailId}
        aria-expanded={expanded}
        className="focus-ring pressable flex min-h-14 w-full min-w-0 items-center gap-2 px-3 py-2 text-left"
        onClick={onToggle}
        type="button"
      >
        <span className="mobile-single-line min-w-0 flex-1">
          <span className="font-mono text-sm font-semibold text-[var(--info-strong)]">
            {title}
          </span>
          {subtitle ? (
            <span className="ml-2 text-xs font-medium text-[var(--text-muted)]">
              {subtitle}
            </span>
          ) : null}
        </span>
        <Badge className="shrink-0 whitespace-nowrap px-2" solid tone={statusTone}>
          {status}
        </Badge>
        <Icon
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform duration-200",
            expanded && "rotate-180"
          )}
          name="chevronDown"
        />
      </button>

      {expanded ? (
        <div className="border-t border-[var(--line)] p-3" id={detailId}>
          {children}
        </div>
      ) : null}
    </article>
  );
};
