"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AccountMenu } from "@/components/AccountMenu";
import { CompanyBrand } from "@/components/CompanyBrand";
import { DeveloperMark } from "@/components/DeveloperMark";
import { GlobalNotifications } from "@/components/GlobalNotifications";
import {
  MobileAppHeader,
  MobileBottomNavigation
} from "@/components/MobileAppChrome";
import { ModeSwitch } from "@/components/ModeSwitch";
import { ModuleSwitcher } from "@/components/ModuleSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Icon, PageHeader } from "@/components/ui";
import { DEFAULT_REPORT_DATE } from "@/lib/date";
import { canManagePersonnelOrg, isDataAdminAccount } from "@/lib/permissions";
import type { AuthAccount } from "@/types/domain";

interface AdminShellProps {
  readonly account: AuthAccount;
  readonly title: string;
  readonly subtitle: string;
  readonly children: ReactNode;
  readonly onLogout: () => void;
}

const links = [
  { href: "/admin", label: "Tổng quan", shortLabel: "Tổng quan", icon: "dashboard" },
  { href: "/admin/tasks", label: "WorkOrder", shortLabel: "WorkOrder", icon: "workorder" },
  { href: "/admin/personnel", label: "Sơ đồ nhân sự", shortLabel: "Nhân sự", icon: "people", personnelAdminOnly: true },
  { href: "/admin/upload", label: "Dữ liệu", shortLabel: "Dữ liệu", icon: "database", dataAdminOnly: true }
] as const;

export const AdminShell = ({
  account,
  title,
  subtitle,
  children,
  onLogout
}: AdminShellProps): React.ReactElement => {
  const pathname = usePathname();
  const visibleLinks = links.filter(
    (link) =>
      (!("dataAdminOnly" in link) || !link.dataAdminOnly || isDataAdminAccount(account)) &&
      (!("personnelAdminOnly" in link) ||
        !link.personnelAdminOnly ||
        canManagePersonnelOrg(account))
  );

  return (
    <main className="mobile-native-page admin-mobile-page min-h-dvh w-full max-w-[100vw] overflow-x-hidden px-2 pb-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom)+0.75rem)] pt-2 sm:px-3 sm:pt-3 lg:p-3 2xl:p-4">
      <div className="app-shell mobile-native-shell mx-auto min-h-[calc(100dvh-1rem)] w-full max-w-none overflow-hidden rounded-[var(--radius-panel)] lg:grid lg:min-h-[calc(100dvh-1.5rem)] lg:grid-cols-[218px_minmax(0,1fr)] 2xl:min-h-[calc(100dvh-2rem)]">
        <aside className="hidden border-r border-[var(--line)] bg-[var(--surface)] p-4 lg:flex lg:flex-col">
          <Link className="focus-ring p-1" href="/"><CompanyBrand variant="sidebar" /></Link>
          <ModuleSwitcher activeModule="bdtt" bdttHref="/admin" className="mt-4" compact />
          <nav aria-label="Điều hướng giám sát" className="mt-4 flex-1 space-y-1.5">
            <p className="px-3 text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-soft)]">Chức năng BDTT</p>
            <div className="space-y-1">
              {visibleLinks.map((link) => {
                const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={`focus-ring flex min-h-11 w-full items-center gap-2 rounded-xl border-0 bg-transparent px-3 text-left text-sm font-semibold leading-5 tracking-normal no-underline transition ${
                      active
                        ? "bg-[var(--primary-soft)] text-[var(--foreground)]"
                        : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                    }`}
                    href={link.href}
                    key={link.href}
                  >
                    <Icon className={active ? "text-[var(--primary-strong)]" : ""} name={link.icon} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
              <Link className="focus-ring flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[var(--text-muted)] no-underline hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]" href="/help">
                <Icon name="help" /> Trợ giúp
              </Link>
            </div>
          </nav>
          <div className="rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface-muted)] p-3">
            <p className="text-xs font-medium uppercase text-[var(--text-soft)]">Phiên giám sát</p>
            <p className="mt-2 truncate text-sm font-semibold text-[var(--foreground)]">{account.fullName}</p>
            <p className="mt-0.5 truncate text-xs font-semibold text-[var(--text-muted)]">{account.orgTitle}</p>
          </div>
          <DeveloperMark className="mt-3" compact />
        </aside>

        <section className="min-w-0">
          <MobileAppHeader
            account={account}
            accountStatusLabel="Phiên giám sát"
            activeModule="bdtt"
            bdttHref="/admin"
            contextAction={
              <ModeSwitch
                activeMode="supervision"
                className="w-auto max-w-[11.5rem] text-[11px]"
                href="/worker"
              />
            }
            onLogout={onLogout}
            title={`BDTT ${DEFAULT_REPORT_DATE.slice(0, 4)}`}
          />
          <header className="hidden px-5 py-5 lg:block">
            <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center">
              <PageHeader className="min-w-0 flex-1" description={subtitle} eyebrow={`Giám sát · BDTT ${DEFAULT_REPORT_DATE.slice(0, 4)}`} title={title} />
              <div className="flex items-center gap-2">
                <Link aria-label="Mở trợ giúp" className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-field)] border border-[var(--line)] text-[var(--text-muted)] shadow-[var(--shadow-soft-sm)] hover:bg-[var(--surface-muted)]" href="/help"><Icon name="help" /></Link>
                <GlobalNotifications />
                <ThemeToggle />
                <ModeSwitch activeMode="supervision" href="/worker" />
                <AccountMenu account={account} onLogout={onLogout} statusLabel="Phiên giám sát" />
              </div>
            </div>
          </header>
          <div className="min-w-0 px-4 py-4 lg:px-5 lg:pb-6 lg:pt-0">
            <div className="mx-auto flex w-full max-w-none min-w-0 flex-col gap-4 lg:gap-5">{children}</div>
          </div>
        </section>
      </div>

      <MobileBottomNavigation
        ariaLabel="Điều hướng giám sát"
        items={visibleLinks.map((link) => ({
          active: link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href),
          href: link.href,
          icon: link.icon,
          key: link.href,
          label: link.shortLabel
        }))}
      />
    </main>
  );
};
