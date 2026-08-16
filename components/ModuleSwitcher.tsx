"use client";

import Link from "next/link";
import { Icon } from "@/components/ui";
import { usePortalModules } from "@/hooks/usePortalModules";
import {
  getPortalModule,
  type AccessiblePortalModule,
  type PortalModuleKey
} from "@/lib/portalModules";
import { cn } from "@/lib/ui";

interface ModuleSwitcherProps {
  readonly activeModule: PortalModuleKey;
  readonly bdttHref: string;
  readonly className?: string;
  readonly compact?: boolean;
}

export const ModuleSwitcher = ({
  activeModule,
  bdttHref,
  className,
  compact = false
}: ModuleSwitcherProps): React.ReactElement => {
  const { modules, loading } = usePortalModules();
  const activeDefinition = getPortalModule(activeModule);
  const fallbackModules: AccessiblePortalModule[] = activeDefinition
    ? [
        {
          ...activeDefinition,
          href: activeModule === "bdtt" ? bdttHref : "/am"
        }
      ]
    : [];
  const visibleModules = modules.length > 0 ? modules : fallbackModules;
  const active =
    visibleModules.find((module) => module.key === activeModule) ??
    fallbackModules[0];

  return (
    <details className={cn("group relative min-w-0", className)}>
      <summary
        aria-label="Đổi công tác"
        className={cn(
          "focus-ring pressable flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-[var(--radius-field)] border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 text-[var(--foreground)] hover:bg-[var(--surface-muted)] [&::-webkit-details-marker]:hidden",
          compact ? "text-xs" : "text-sm"
        )}
      >
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-field)] bg-[var(--primary-soft)] text-[var(--primary-strong)]">
          <Icon className="h-4 w-4" name={active?.icon ?? "workorder"} />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-soft)]">
            Công tác
          </span>
          <span className="block break-words font-medium leading-5">
            {active?.label ?? "Chọn công tác"}
          </span>
        </span>
        <Icon
          className="h-4 w-4 text-[var(--text-muted)] transition-transform group-open:rotate-180"
          name="chevronDown"
        />
      </summary>

      <div className="absolute left-0 top-[calc(100%+0.375rem)] z-50 w-[min(22rem,calc(100vw-2rem))] rounded-[var(--radius-card)] border border-[var(--border-strong)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-floating)]">
        <Link
          className="focus-ring pressable flex min-h-10 items-center gap-3 rounded-[var(--radius-field)] px-2.5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
          href="/"
        >
          <Icon name="dashboard" />
          <span className="min-w-0 flex-1">Tất cả công tác</span>
        </Link>
        <div className="my-1.5 border-t border-[var(--line)]" />
        <div aria-label="Danh sách công tác" className="divide-y divide-[var(--line-soft)]">
          {visibleModules.map((module) => {
            const isActive = module.key === activeModule;
            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "focus-ring pressable flex min-h-12 items-center gap-3 rounded-[var(--radius-field)] px-2.5 text-sm",
                  isActive
                    ? "bg-[var(--primary-soft)] text-[var(--primary-strong)]"
                    : "text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                )}
                href={module.href}
                key={module.key}
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-[var(--primary-strong)]">
                  <Icon className="h-4 w-4" name={module.icon} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words font-medium leading-5">{module.label}</span>
                  <span className="mt-0.5 block break-words text-xs font-normal leading-5 text-[var(--text-muted)]">
                    {module.shortLabel}
                  </span>
                </span>
                {isActive ? <Icon className="h-4 w-4" name="check" /> : null}
              </Link>
            );
          })}
          {loading && visibleModules.length === 0 ? (
            <p className="px-3 py-4 text-sm font-normal text-[var(--text-muted)]">
              Đang tải công tác...
            </p>
          ) : null}
        </div>
      </div>
    </details>
  );
};
