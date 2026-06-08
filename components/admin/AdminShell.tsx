"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
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
  { href: "/admin/tasks", label: "Hạng mục" },
  { href: "/admin/upload", label: "Import / Export", dataAdminOnly: true },
  { href: "/worker", label: "Xem worker" }
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
    <main className="min-h-dvh bg-transparent lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="m-4 mr-0 hidden rounded-3xl border border-white/70 bg-white/75 p-5 shadow-[var(--shadow-soft-md)] backdrop-blur-xl lg:block">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--primary)]">
          BDTT Admin
        </p>
        <div className="mt-6 rounded-3xl bg-white/75 p-4 shadow-sm ring-1 ring-[var(--border)]">
          <p className="font-semibold">{account.fullName}</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">@{account.username}</p>
        </div>
        <nav className="mt-6 space-y-2">
          {visibleLinks.map((link) => (
            <Link
              className={`focus-ring pressable flex min-h-11 items-center rounded-2xl px-3 text-sm font-bold ${
                pathname === link.href
                  ? "bg-[var(--primary-strong)] text-white shadow-md"
                  : "border border-transparent text-slate-800 hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-strong)]"
              }`}
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <button
          className="focus-ring pressable mt-6 min-h-11 w-full rounded-2xl border border-[var(--border-strong)] bg-white px-4 text-sm font-bold text-slate-800 shadow-sm hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
          onClick={onLogout}
          type="button"
        >
          Đăng xuất
        </button>
      </aside>

      <section className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-white/50 bg-white/60 px-4 py-4 backdrop-blur-xl lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[var(--primary)]">
                Admin
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--foreground)] lg:text-4xl">
                {title}
              </h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canManageData ? (
                <>
                  <Link
                    className="focus-ring pressable min-h-11 rounded-2xl bg-[var(--primary-strong)] px-4 py-3 text-sm font-bold text-white shadow-md"
                    href="/admin/upload"
                  >
                    Import Excel
                  </Link>
                  <Link
                    className="focus-ring pressable min-h-11 rounded-2xl border border-[var(--primary)] bg-white px-4 py-3 text-sm font-bold text-[var(--primary-strong)] shadow-sm hover:bg-[var(--primary-soft)]"
                    href="/admin/upload"
                  >
                    Export DATA
                  </Link>
                </>
              ) : null}
              <Link
                className="focus-ring pressable min-h-11 rounded-2xl border border-[var(--primary)] bg-white px-4 py-3 text-sm font-bold text-[var(--primary-strong)] shadow-sm hover:bg-[var(--primary-soft)]"
                href="/admin/tasks"
              >
                Xem hạng mục
              </Link>
              <button
                className="focus-ring pressable min-h-11 rounded-2xl border border-[var(--border-strong)] bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm lg:hidden"
                onClick={onLogout}
                type="button"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 lg:px-8">
          {children}
        </div>
      </section>
    </main>
  );
};
