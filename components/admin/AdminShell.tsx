"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AccountMenu } from "@/components/AccountMenu";
import { CompanyBrand } from "@/components/CompanyBrand";
import { ModeSwitch } from "@/components/ModeSwitch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Icon, PageHeader } from "@/components/ui";
import { isDataAdminAccount } from "@/lib/permissions";
import type { AuthAccount } from "@/types/domain";

interface AdminShellProps {
  readonly account: AuthAccount;
  readonly title: string;
  readonly subtitle: string;
  readonly children: ReactNode;
  readonly onLogout: () => void;
}

const links = [
  { href: "/admin", label: "Dashboard", shortLabel: "Tổng quan", icon: "dashboard" },
  { href: "/admin/tasks", label: "WorkOrder", shortLabel: "WorkOrder", icon: "workorder" },
  { href: "/admin/personnel", label: "Nhân sự", shortLabel: "Nhân sự", icon: "people" },
  { href: "/admin/upload", label: "DATA", shortLabel: "DATA", icon: "database", dataAdminOnly: true }
] as const;

const sidebarNavTypographyStyle = {
  fontFamily: "var(--font-sans)",
  fontSize: "0.875rem",
  fontWeight: 600,
  lineHeight: "1.25rem"
};

export const AdminShell = ({
  account,
  title,
  subtitle,
  children,
  onLogout
}: AdminShellProps): React.ReactElement => {
  const pathname = usePathname();
  const canManageData = isDataAdminAccount(account);
  const visibleLinks = links.filter(
    (link) => !("dataAdminOnly" in link) || !link.dataAdminOnly || canManageData
  );

  return (
    <main className="min-h-dvh w-full max-w-[100vw] overflow-x-hidden px-2 pb-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom)+0.75rem)] pt-2 sm:px-3 sm:pt-3 lg:p-5">
      <div className="app-shell mx-auto min-h-[calc(100dvh-1rem)] max-w-[1700px] overflow-hidden rounded-[22px] lg:grid lg:min-h-[calc(100dvh-2.5rem)] lg:grid-cols-[218px_minmax(0,1fr)]">
        <aside className="hidden border-r border-[var(--line)] bg-[var(--surface)] p-4 lg:flex lg:flex-col">
          <Link className="focus-ring rounded-[var(--radius-card)] p-1" href="/admin">
            <CompanyBrand variant="sidebar" />
          </Link>

          <nav className="mt-6 flex-1 space-y-1" aria-label="Giám sát navigation">
            <div className="space-y-1">
              {visibleLinks.map((link) => (
                <DesktopNavLink
                  active={
                    link.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(link.href)
                  }
                  href={link.href}
                  icon={link.icon}
                  key={link.href}
                  label={link.label}
                />
              ))}
            </div>
          </nav>

          <div className="rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface-muted)] p-3">
            <p className="text-[11px] font-semibold uppercase text-[var(--text-soft)]">
              Phiên giám sát
            </p>
            <p className="mt-2 truncate text-sm font-semibold text-[var(--foreground)]">
              {account.fullName}
            </p>
            <p className="mt-0.5 truncate text-xs font-semibold text-[var(--text-muted)]">
              {account.orgTitle}
            </p>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--surface)]/96 px-4 py-4 backdrop-blur-xl lg:static lg:border-b-0 lg:bg-transparent lg:px-5 lg:py-5 lg:backdrop-blur-0">
            <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center">
              <PageHeader
                className="min-w-0 flex-1"
                description={subtitle}
                eyebrow="Giám sát · BDTT 2026"
                title={title}
              />

              <div className="hidden min-w-0 items-center gap-2 lg:flex">
                <ThemeToggle />
                <ModeSwitch activeMode="supervision" href="/worker" />
              </div>

              <div className="hidden lg:block">
                <AccountMenu
                  account={account}
                  onLogout={onLogout}
                  statusLabel="Phiên giám sát"
                />
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 lg:hidden">
              <ModeSwitch activeMode="supervision" className="max-w-none flex-1 text-xs" href="/worker" />
              <ThemeToggle className="shrink-0" />
              <AccountMenu
                account={account}
                onLogout={onLogout}
                statusLabel="Phiên giám sát"
              />
            </div>
          </header>

          <div className="min-w-0 px-4 py-4 lg:px-5 lg:pb-6 lg:pt-0">
            <div className="mx-auto flex w-full max-w-[1400px] min-w-0 flex-col gap-4 lg:gap-5">
              {children}
            </div>
          </div>
        </section>
      </div>

      <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 px-3 lg:hidden">
        <div
          className="floating-pill mx-auto grid max-w-[520px] gap-1 rounded-[var(--radius-card)] p-2 text-center text-[11px] font-semibold"
          style={{ gridTemplateColumns: `repeat(${visibleLinks.length}, minmax(0, 1fr))` }}
        >
          {visibleLinks.map((link) => {
            const active =
              link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
            return (
              <Link
                className={`focus-ring pressable flex min-h-14 flex-col items-center justify-center gap-1 rounded-[var(--radius-field)] px-1 leading-tight ${
                  active
                    ? "bg-[var(--primary-strong)] text-[var(--primary-contrast)] shadow-md"
                    : "text-[var(--text-muted)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-strong)]"
                }`}
                href={link.href}
                key={link.href}
              >
                <Icon name={link.icon} />
                <span>{link.shortLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </main>
  );
};

const DesktopNavLink = ({
  active,
  href,
  icon,
  label
}: {
  readonly active: boolean;
  readonly href: string;
  readonly icon: (typeof links)[number]["icon"];
  readonly label: string;
}): React.ReactElement => (
  <Link
    className={`focus-ring flex min-h-11 w-full items-center gap-2 rounded-xl border-0 bg-transparent px-3 text-left text-sm font-semibold leading-5 tracking-normal no-underline transition ${
      active
        ? "bg-[var(--primary-soft)] text-[var(--foreground)]"
        : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
    }`}
    href={href}
    style={sidebarNavTypographyStyle}
  >
    <Icon className={active ? "text-[var(--primary-strong)]" : ""} name={icon} />
    <span className="truncate">{label}</span>
  </Link>
);
