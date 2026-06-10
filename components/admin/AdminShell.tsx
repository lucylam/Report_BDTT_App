"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CompanyBrand } from "@/components/CompanyBrand";
import { ModeSwitch } from "@/components/ModeSwitch";
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
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/personnel", label: "Thành viên" },
  { href: "/admin/tasks", label: "WorkOrder" },
  { href: "/admin/upload", label: "DATA", dataAdminOnly: true }
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
  const mobileLinks = visibleLinks.slice(0, 5);

  return (
    <main className="w-full max-w-[100vw] overflow-x-hidden min-h-dvh bg-transparent pb-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom)+1rem)] lg:grid lg:grid-cols-[292px_minmax(0,1fr)] lg:pb-0">
      <aside className="m-5 mr-0 hidden rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-[var(--shadow-soft-md)] backdrop-blur-xl lg:block">
        <CompanyBrand variant="sidebar" />
        <div className="mt-5 rounded-[1.75rem] bg-[var(--primary-strong)] p-5 text-white shadow-[var(--shadow-floating)]">
          <p className="text-lg font-semibold leading-tight">{account.fullName}</p>
          <p className="mt-1 text-sm text-white/72">@{account.username}</p>
          <p className="mt-3 text-sm font-bold leading-5 text-white">
            {account.orgTitle}
          </p>
          <p className="mt-2 text-sm leading-5 text-white/78">
            {account.orgAssignment}
          </p>
        </div>
        <nav className="mt-6 space-y-2">
          {visibleLinks.map((link) => (
            <Link
              className={`focus-ring pressable flex min-h-12 items-center rounded-full px-4 text-sm font-bold ${
                pathname === link.href
                  ? "bg-[var(--primary-strong)] text-white shadow-[var(--shadow-soft-sm)]"
                  : "border border-transparent bg-white/60 text-slate-800 hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-strong)]"
              }`}
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <button
          className="focus-ring pressable mt-6 min-h-12 w-full rounded-full border border-[var(--border-strong)] bg-white/80 px-4 text-sm font-bold text-slate-800 shadow-sm hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
          onClick={onLogout}
          type="button"
        >
          Đăng xuất
        </button>
      </aside>

      <section className="min-w-0 overflow-x-hidden">
        <header className="mobile-topbar sticky top-0 z-20 border-b border-white/70 bg-white/88 px-4 pb-3 backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <CompanyBrand variant="compact" />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase text-[var(--primary-strong)]">BDTT 2026</p>
              <h1 className="truncate text-xl font-bold leading-tight text-[var(--foreground)]">
                {title}
              </h1>
              <p className="truncate text-xs font-semibold text-[var(--text-muted)]">
                {account.orgTitle}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <ModeSwitch activeMode="supervision" className="max-w-[13.5rem] text-xs" href="/worker" />
              <button
                className="focus-ring pressable min-h-10 rounded-full border border-[var(--border-strong)] bg-white px-4 text-xs font-bold text-slate-800 shadow-sm"
                onClick={onLogout}
                type="button"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </header>

        <header className="sticky top-0 z-20 hidden border-b border-white/60 bg-white/70 px-4 py-4 backdrop-blur-xl lg:block lg:px-8">
          <div className="flex w-full min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-wide text-[var(--primary)]">
                BDTT 2026 workspace
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                {title}
              </h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
            </div>
            <ModeSwitch activeMode="supervision" href="/worker" />
          </div>
        </header>

        <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-4 pb-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom)+1.25rem)] lg:gap-5 lg:px-8 lg:py-5 lg:pb-5">
          {children}
        </div>
      </section>

      <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-30 px-3 lg:hidden">
        <div className="floating-pill grid gap-1 rounded-[2rem] p-2 text-center text-xs font-bold" style={{ gridTemplateColumns: `repeat(${mobileLinks.length}, minmax(0, 1fr))` }}>
          {mobileLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                className={`focus-ring pressable flex min-h-12 items-center justify-center rounded-full px-1 leading-tight ${
                  active
                    ? "bg-[var(--primary-strong)] text-white shadow-md"
                    : "text-slate-800 hover:bg-[var(--primary-soft)] hover:text-[var(--primary-strong)]"
                }`}
                href={link.href}
                key={link.href}
              >
                {link.href === "/admin/upload" ? "DATA" : link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </main>
  );
};
