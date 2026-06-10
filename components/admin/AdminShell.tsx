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
    <main className="min-h-dvh w-full max-w-[100vw] overflow-x-hidden bg-transparent pb-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom)+1rem)] lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:pb-0">
      <aside className="m-5 mr-0 hidden rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-[var(--shadow-soft-md)] backdrop-blur-xl lg:block">
        <CompanyBrand variant="sidebar" />
        <p className="mt-5 text-sm font-semibold uppercase text-[var(--primary)]">
          Giám sát BDTT 2026
        </p>
        <h1 className="mt-3 text-2xl font-semibold leading-tight">Theo dõi tiến độ</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Dashboard · Thành viên · WorkOrder
        </p>

        <div className="mt-6 rounded-[1.75rem] border border-[var(--border)] bg-[var(--primary-strong)] p-4 text-white shadow-[var(--shadow-floating)]">
          <p className="font-semibold leading-tight">{account.fullName}</p>
          <p className="mt-1 text-sm text-white/72">@{account.username}</p>
          <p className="mt-3 text-sm font-bold leading-5 text-white">{account.orgTitle}</p>
          <p className="mt-2 text-sm leading-5 text-white/78">{account.orgAssignment}</p>
        </div>

        <nav className="mt-5 rounded-[1.5rem] border border-[var(--border)] bg-white/55 p-2">
          {visibleLinks.map((link) => (
            <Link
              className={`focus-ring pressable flex min-h-11 w-full items-center rounded-full px-4 text-sm font-semibold ${
                pathname === link.href
                  ? "bg-[var(--primary-strong)] text-white shadow-md"
                  : "text-slate-800 hover:bg-[var(--primary-soft)] hover:text-[var(--primary-strong)]"
              }`}
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <ModeSwitch activeMode="supervision" className="mt-5 max-w-none" href="/worker" />
        <button
          className="focus-ring pressable mt-5 min-h-11 w-full rounded-full border border-[var(--border)] bg-white/70 px-4 text-sm font-semibold text-slate-800 hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
          onClick={onLogout}
          type="button"
        >
          Đăng xuất
        </button>
      </aside>

      <section className="min-w-0 overflow-x-hidden">
        <header className="mobile-topbar sticky top-0 z-20 border-b border-white/70 bg-white/88 px-4 pb-3 backdrop-blur-xl lg:hidden">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
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
            <div className="col-span-2 flex items-center gap-2">
              <ModeSwitch
                activeMode="supervision"
                className="max-w-none flex-1 text-xs"
                href="/worker"
              />
              <button
                className="focus-ring pressable min-h-10 shrink-0 rounded-full border border-[var(--border-strong)] bg-white px-4 text-xs font-bold text-slate-800 shadow-sm"
                onClick={onLogout}
                type="button"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </header>

        <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-4 pb-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom)+1.25rem)] lg:gap-5 lg:px-6 lg:py-6 lg:pb-6">
          <header className="hidden rounded-[2rem] border border-white/80 bg-white/78 p-5 shadow-[var(--shadow-soft-sm)] backdrop-blur-xl lg:block">
            <div className="flex min-w-0 items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase text-[var(--primary)]">
                  Giám sát
                </p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                  {title}
                </h1>
                <p className="mt-1 max-w-4xl text-sm leading-6 text-[var(--text-muted)]">
                  {subtitle}
                </p>
              </div>
              <ModeSwitch activeMode="supervision" href="/worker" />
            </div>
          </header>

          <div className="flex w-full min-w-0 flex-col gap-4 lg:gap-5">{children}</div>
        </div>
      </section>

      <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-30 px-3 lg:hidden">
        <div
          className="floating-pill grid gap-1 rounded-[2rem] p-2 text-center text-xs font-bold"
          style={{ gridTemplateColumns: `repeat(${mobileLinks.length}, minmax(0, 1fr))` }}
        >
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
