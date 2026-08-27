"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AccountMenu } from "@/components/AccountMenu";
import { GlobalNotifications } from "@/components/GlobalNotifications";
import { ModuleSwitcher } from "@/components/ModuleSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Icon, type IconName } from "@/components/ui";
import type { PortalModuleKey } from "@/lib/portalModules";
import { cn } from "@/lib/ui";
import type { AuthAccount } from "@/types/domain";

interface MobileAppHeaderProps {
  readonly account: AuthAccount;
  readonly accountStatusLabel?: string;
  readonly accountStatusTone?: "success" | "warning";
  readonly activeModule: PortalModuleKey;
  readonly bdttHref: string;
  readonly className?: string;
  readonly contextAction?: ReactNode;
  readonly onLogout: () => void;
  readonly showInstallButton?: boolean;
  readonly title: string;
}

export const MobileAppHeader = ({
  account,
  accountStatusLabel,
  accountStatusTone = "success",
  activeModule,
  bdttHref,
  className,
  contextAction,
  onLogout,
  showInstallButton = false,
  title
}: MobileAppHeaderProps): React.ReactElement => (
  <header
    className={cn(
      "mobile-app-header mobile-topbar border-b border-[var(--line)] bg-[var(--surface)] px-3 py-3 lg:hidden",
      className
    )}
  >
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
      <div className="flex shrink-0 items-center gap-2">
        <GlobalNotifications />
        <ThemeToggle className="shrink-0" />
        <AccountMenu
          account={account}
          compact
          onLogout={onLogout}
          showInstallButton={showInstallButton}
          statusLabel={accountStatusLabel}
          statusTone={accountStatusTone}
        />
      </div>
      <ModuleSwitcher
        activeModule={activeModule}
        bdttHref={bdttHref}
        className="ml-auto"
        variant="toggle"
      />
    </div>

    <div className="mt-2 min-w-0">
      <h1 className="break-words px-1 text-base font-semibold leading-5 text-[var(--primary-strong)]">
        {title}
      </h1>
    </div>
    {contextAction ? <div className="mt-2 min-w-0 w-full">{contextAction}</div> : null}
  </header>
);

export interface MobileNavItem {
  readonly active: boolean;
  readonly href?: string;
  readonly icon: IconName;
  readonly key: string;
  readonly label: string;
  readonly onSelect?: () => void;
}

interface MobileBottomNavigationProps {
  readonly ariaLabel: string;
  readonly className?: string;
  readonly items: readonly MobileNavItem[];
}

const mobileNavItemClass = (active: boolean): string =>
  cn(
    "focus-ring pressable flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-field)] px-1 text-center text-[11px] font-semibold leading-tight no-underline",
    active
      ? "bg-[var(--primary-strong)] text-[var(--primary-contrast)] shadow-md"
      : "text-[var(--text-muted)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-strong)]"
  );

const MobileNavItemContent = ({ item }: { readonly item: MobileNavItem }): React.ReactElement => (
  <>
    <Icon className="h-5 w-5" name={item.icon} />
    <span className="mobile-button-label block max-w-full break-words">{item.label}</span>
  </>
);

export const MobileBottomNavigation = ({
  ariaLabel,
  className,
  items
}: MobileBottomNavigationProps): React.ReactElement => (
  <nav
    aria-label={ariaLabel}
    className={cn("mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 lg:hidden", className)}
  >
    <div
      className="floating-pill mobile-bottom-nav-grid mx-auto grid w-full max-w-[520px] gap-1 rounded-[var(--radius-card)] p-2"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) =>
        item.href ? (
          <Link
            aria-current={item.active ? "page" : undefined}
            className={mobileNavItemClass(item.active)}
            href={item.href}
            key={item.key}
          >
            <MobileNavItemContent item={item} />
          </Link>
        ) : (
          <button
            aria-current={item.active ? "page" : undefined}
            className={mobileNavItemClass(item.active)}
            key={item.key}
            onClick={item.onSelect}
            type="button"
          >
            <MobileNavItemContent item={item} />
          </button>
        )
      )}
    </div>
  </nav>
);
