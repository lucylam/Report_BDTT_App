"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
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

type IconName =
  | "dashboard"
  | "people"
  | "workorder"
  | "data"
  | "help"
  | "settings"
  | "search";

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
                  <ShellIcon name={link.icon} />
                </Link>
              );
            })}
          </nav>
          <div className="flex-1" />
          <button className="focus-ring icon-button" title="Trợ giúp" type="button">
            <ShellIcon name="help" />
          </button>
          <button
            className="focus-ring icon-button"
            onClick={onLogout}
            title="Đăng xuất"
            type="button"
          >
            <ShellIcon name="settings" />
          </button>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-white/70 bg-white/82 px-4 py-4 backdrop-blur-2xl lg:static lg:border-b-0 lg:bg-transparent lg:px-7 lg:py-5">
            <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold uppercase text-[var(--primary-strong)]">
                  Giám sát · BDTT 2026
                </p>
                <h1 className="mt-1 truncate text-2xl font-extrabold leading-tight tracking-normal text-[var(--foreground)] lg:text-3xl">
                  {title}
                </h1>
                <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-[var(--text-muted)]">
                  {subtitle}
                </p>
              </div>

              <div className="hidden min-w-[18rem] items-center gap-2 rounded-full border border-[var(--line)] bg-white/90 px-4 py-3 text-sm font-semibold text-[var(--text-soft)] shadow-[var(--shadow-soft-sm)] lg:flex xl:min-w-[26rem]">
                <ShellIcon name="search" />
                <span className="truncate">Tìm WorkOrder, hạng mục, đơn vị...</span>
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
              <button
                className="focus-ring pressable min-h-11 shrink-0 rounded-full border border-[var(--border-strong)] bg-white px-4 text-xs font-extrabold text-slate-800 shadow-sm"
                onClick={onLogout}
                type="button"
              >
                Đăng xuất
              </button>
            </div>
          </header>

          <div className="min-w-0 px-4 py-4 lg:px-7 lg:pb-7 lg:pt-2">
            <div className="flex w-full min-w-0 flex-col gap-4 lg:gap-5">{children}</div>
          </div>
        </section>
      </div>

      <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 px-3 lg:hidden">
        <div
          className="floating-pill grid gap-1 rounded-[1.65rem] p-2 text-center text-[11px] font-extrabold"
          style={{ gridTemplateColumns: `repeat(${visibleLinks.length}, minmax(0, 1fr))` }}
        >
          {visibleLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                className={`focus-ring pressable flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[1.25rem] px-1 leading-tight ${
                  active
                    ? "bg-[var(--primary-strong)] text-white shadow-md"
                    : "text-slate-700 hover:bg-[var(--primary-soft)] hover:text-[var(--primary-strong)]"
                }`}
                href={link.href}
                key={link.href}
              >
                <ShellIcon name={link.icon} />
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

const ShellIcon = ({ name }: { readonly name: IconName }): React.ReactElement => {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
    viewBox: "0 0 24 24"
  };

  return (
    <svg aria-hidden="true" className="h-5 w-5" {...common}>
      {name === "dashboard" ? (
        <>
          <rect height="7" rx="1.5" width="7" x="3" y="3" />
          <rect height="7" rx="1.5" width="7" x="14" y="3" />
          <rect height="7" rx="1.5" width="7" x="3" y="14" />
          <rect height="7" rx="1.5" width="7" x="14" y="14" />
        </>
      ) : null}
      {name === "people" ? (
        <>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
          <path d="M16 6a3 3 0 0 1 0 5.5" />
          <path d="M16.5 20a5.5 5.5 0 0 0-2-4" />
        </>
      ) : null}
      {name === "workorder" ? (
        <>
          <path d="M4 5h16" />
          <path d="M4 12h16" />
          <path d="M4 19h10" />
        </>
      ) : null}
      {name === "data" ? (
        <>
          <ellipse cx="12" cy="6" rx="7" ry="3" />
          <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
          <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
        </>
      ) : null}
      {name === "help" ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.7" />
          <path d="M12 17h.01" />
        </>
      ) : null}
      {name === "settings" ? (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3" />
          <path d="M12 19v3" />
          <path d="M2 12h3" />
          <path d="M19 12h3" />
          <path d="m5 5 2 2" />
          <path d="m17 17 2 2" />
          <path d="m19 5-2 2" />
          <path d="m7 17-2 2" />
        </>
      ) : null}
      {name === "search" ? (
        <>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3-3" />
        </>
      ) : null}
    </svg>
  );
};
