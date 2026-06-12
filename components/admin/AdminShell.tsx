"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ModeSwitch } from "@/components/ModeSwitch";
import { Button, Icon, PageHeader } from "@/components/ui";
import type { IconName } from "@/components/ui";
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
  { href: "/admin/personnel", label: "Thành viên", shortLabel: "Thành viên", icon: "people" },
  { href: "/admin/tasks", label: "WorkOrder", shortLabel: "WorkOrder", icon: "workorder" },
  { href: "/admin/upload", label: "DATA", shortLabel: "DATA", icon: "data", dataAdminOnly: true }
] as const;

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
    <main className="min-h-dvh w-full max-w-[100vw] overflow-x-hidden p-2 pb-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom)+0.75rem)] sm:p-3 lg:p-5 lg:pb-5">
      <div className="app-shell min-h-[calc(100dvh-1rem)] overflow-hidden rounded-[2rem] lg:grid lg:min-h-[calc(100dvh-2.5rem)] lg:grid-cols-[74px_minmax(0,1fr)]">
        <aside className="hidden border-r border-[var(--line)] bg-white/88 px-4 py-5 lg:flex lg:flex-col lg:items-center lg:gap-1">
          <div className="mb-5 grid h-11 w-11 place-items-center rounded-[0.9rem] bg-[linear-gradient(135deg,#0b6b4f,#15a06f)] text-[11px] font-extrabold tracking-wide text-white shadow-[var(--shadow-soft-sm)]">
            PVCFC
          </div>
          <nav className="flex flex-col gap-1" aria-label="Admin navigation">
            {visibleLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  aria-label={link.label}
                  className={`focus-ring icon-button ${active ? "icon-button-active" : ""}`}
                  href={link.href}
                  key={link.href}
                  title={link.label}
                >
                  <Icon name={link.icon} />
                </Link>
              );
            })}
          </nav>
          <div className="flex-1" />
          <button className="focus-ring icon-button" title="Trợ giúp" type="button">
            <Icon name="help" />
          </button>
          <button
            className="focus-ring icon-button"
            onClick={onLogout}
            title="Đăng xuất"
            type="button"
          >
            <Icon name="settings" />
          </button>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-white/70 bg-white/82 px-4 py-4 backdrop-blur-2xl lg:static lg:border-b-0 lg:bg-transparent lg:px-7 lg:py-5">
            <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center">
              <PageHeader
                className="min-w-0 flex-1"
                description={subtitle}
                eyebrow="Giám sát · BDTT 2026"
                title={title}
              />

              <div className="hidden min-w-[18rem] items-center gap-2 rounded-full border border-[var(--line)] bg-white/90 px-4 py-3 text-sm font-semibold text-[var(--text-soft)] shadow-[var(--shadow-soft-sm)] lg:flex xl:min-w-[26rem]">
                <Icon name="search" />
                <span className="truncate">Tìm WorkOrder, hạng mục, đơn vị...</span>
              </div>

              <div className="hidden lg:block">
                <ModeSwitch activeMode="supervision" href="/worker" />
              </div>

              <div className="hidden rounded-full border border-[var(--line)] bg-white/90 p-1 shadow-[var(--shadow-soft-sm)] lg:flex">
                <Link
                  className={`focus-ring min-h-10 rounded-full px-5 text-sm font-bold leading-10 ${
                    pathname === "/admin"
                      ? "bg-[var(--foreground)] text-white"
                      : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
                  }`}
                  href="/admin"
                >
                  Dashboard
                </Link>
                <Link
                  className={`focus-ring min-h-10 rounded-full px-5 text-sm font-bold leading-10 ${
                    pathname === "/admin/tasks"
                      ? "bg-[var(--foreground)] text-white"
                      : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
                  }`}
                  href="/admin/tasks"
                >
                  WorkOrder
                </Link>
              </div>

              <div className="flex min-w-0 items-center gap-2 lg:min-w-[15rem]">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#f08a3c,#f2b463)] text-sm font-extrabold text-white shadow-[var(--shadow-soft-sm)]">
                  {getInitials(account.fullName)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-[var(--foreground)]">
                    {account.fullName}
                  </p>
                  <p className="truncate text-xs font-semibold text-[var(--text-muted)]">
                    {account.orgTitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 lg:hidden">
              <ModeSwitch activeMode="supervision" className="max-w-none flex-1 text-xs" href="/worker" />
              <Button className="shrink-0" onClick={onLogout} size="sm" variant="secondary">
                Đăng xuất
              </Button>
            </div>
          </header>

          <div className="min-w-0 px-4 py-4 lg:px-7 lg:pb-7 lg:pt-2">
            <div className="flex w-full min-w-0 flex-col gap-4 lg:gap-5">{children}</div>
          </div>
        </section>
      </div>

      <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 px-3 lg:hidden">
        <div
          className="floating-pill grid gap-1 rounded-[var(--radius-card)] p-2 text-center text-[11px] font-extrabold"
          style={{ gridTemplateColumns: `repeat(${visibleLinks.length}, minmax(0, 1fr))` }}
        >
          {visibleLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                className={`focus-ring pressable flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-field)] px-1 leading-tight ${
                  active
                    ? "bg-[var(--primary-strong)] text-white shadow-md"
                    : "text-slate-700 hover:bg-[var(--primary-soft)] hover:text-[var(--primary-strong)]"
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

const getInitials = (name: string): string => {
  const words = name.trim().split(/\s+/);
  const first = words[0]?.[0] ?? "B";
  const last = words[words.length - 1]?.[0] ?? "D";
  return `${first}${last}`.toUpperCase();
};

