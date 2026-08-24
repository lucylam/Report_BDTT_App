"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AccountMenu } from "@/components/AccountMenu";
import { CompanyBrand } from "@/components/CompanyBrand";
import { GlobalNotifications } from "@/components/GlobalNotifications";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Alert, Badge, Icon, PageHeader, type IconName } from "@/components/ui";
import { useAppData } from "@/hooks/useAppData";
import { usePortalModules } from "@/hooks/usePortalModules";
import { DEFAULT_REPORT_DATE, formatViDate } from "@/lib/date";
import { calculateMetrics } from "@/lib/progress";
import { cn } from "@/lib/ui";

interface CockpitResponse {
  readonly ok?: boolean;
  readonly error?: string;
  readonly unreadNotifications?: number;
  readonly am?: {
    readonly active: number;
    readonly waitingReview: number;
    readonly needsRevision: number;
    readonly overdue: number;
  };
}

const HomePage = (): React.ReactElement => {
  const router = useRouter();
  const { currentAccount, data, logout } = useAppData();
  const { modules, loading, error } = usePortalModules(Boolean(currentAccount));
  const [cockpit, setCockpit] = useState<CockpitResponse | null>(null);
  const isExecutive = Boolean(
    currentAccount?.role === "admin" ||
      modules.some((module) => ["leader", "workshop_manager", "web_admin"].includes(module.role ?? ""))
  );
  const bdttMetrics = useMemo(
    () => data && currentAccount?.role === "admin" ? calculateMetrics(data, DEFAULT_REPORT_DATE) : null,
    [currentAccount?.role, data]
  );

  useEffect(() => {
    if (currentAccount?.mustChangePassword) router.replace("/change-password");
  }, [currentAccount, router]);

  useEffect(() => {
    if (!isExecutive) return;
    let cancelled = false;
    void fetch("/api/cockpit", { cache: "no-store" })
      .then(async (response) => (await response.json().catch(() => ({ ok: false }))) as CockpitResponse)
      .then((payload) => {
        if (!cancelled) setCockpit(payload);
      })
      .catch(() => {
        if (!cancelled) setCockpit({ ok: false, error: "Không kết nối được dữ liệu điều hành." });
      });
    return () => { cancelled = true; };
  }, [isExecutive]);

  return (
    <main className="min-h-dvh w-full max-w-[100vw] overflow-x-auto px-2 py-2 sm:px-3 sm:py-3 lg:p-4">
      <section className="app-shell mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-none flex-col overflow-hidden rounded-[var(--radius-panel)] sm:min-h-[calc(100dvh-1.5rem)] lg:min-h-[calc(100dvh-2rem)]">
        <header className="border-b border-[var(--line)] bg-[var(--surface)] px-4 py-4 md:px-5">
          <div className="flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CompanyBrand className="w-full sm:flex-1" variant="sidebar" />
            <div className="flex shrink-0 items-center justify-end gap-2">
              {currentAccount ? <GlobalNotifications /> : null}
              <ThemeToggle className="shrink-0" />
              {currentAccount ? (
                <AccountMenu
                  account={currentAccount}
                  onLogout={logout}
                  showInstallButton
                  statusLabel="Phiên nội bộ"
                />
              ) : null}
            </div>
          </div>
        </header>

        <div className="min-w-0 flex-1 p-4 md:p-5">
          <PageHeader
            description="Truy cập công tác theo quyền và theo dõi các điểm cần xử lý trong ngày."
            eyebrow="Cổng vận hành nội bộ"
            title="Xưởng Điều khiển"
          />

          {currentAccount ? (
            <Link
              className="focus-ring pressable mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-field)] bg-[var(--primary-strong)] px-5 text-base font-semibold text-[var(--primary-contrast)] no-underline shadow-[var(--shadow-soft-sm)] hover:bg-[var(--success-strong)] sm:w-auto"
              href={currentAccount.role === "admin" ? "/admin/tasks" : "/worker"}
            >
              <Icon name="list" />
              {currentAccount.role === "admin" ? "Mở WorkOrder" : "Nhập liệu hôm nay"}
            </Link>
          ) : null}

          {isExecutive ? (
            <div className="mt-3">
              <ExecutiveCockpit bdtt={bdttMetrics} cockpit={cockpit} />
            </div>
          ) : null}

          <div className="mt-3 grid min-w-0 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_17rem]">
            <section className="glass-card min-w-0 overflow-hidden rounded-[var(--radius-card)]">
              <header className="border-b border-[var(--line)] px-4 py-3">
                <h2 className="text-base font-semibold text-[var(--foreground)]">
                  {currentAccount ? "Công tác được cấp" : "Đăng nhập hệ thống"}
                </h2>
                <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                  {currentAccount
                    ? "Mỗi công tác có workflow và vai trò nghiệp vụ riêng."
                    : "Đăng nhập một lần để nhận đúng công việc và thông báo theo tài khoản."}
                </p>
              </header>

              {error ? <Alert className="m-3">{error}</Alert> : null}

              {currentAccount ? (
                <div className="grid min-w-0 gap-3 p-3 sm:grid-cols-2">
                  {modules.map((module) => (
                    <ModuleCard
                      description={module.description}
                      href={module.href}
                      icon={module.icon}
                      key={module.key}
                      shortLabel={module.shortLabel}
                      title={module.label}
                    />
                  ))}
                  {loading ? <ModuleCardSkeleton /> : null}
                  {!loading && modules.length === 0 && !error ? (
                    <div className="border-b border-r border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] p-4 text-sm font-medium leading-6 text-[var(--text-muted)] sm:col-span-2">
                      Tài khoản chưa được cấp công tác nào. Liên hệ quản trị viên để kiểm tra phân quyền.
                    </div>
                  ) : null}
                </div>
              ) : data ? (
                <div className="p-4">
                  <Link
                    className="primary-action focus-ring pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-field)] px-4 text-sm font-semibold lg:min-h-10"
                    href="/login"
                  >
                    <Icon name="account" />
                    Đăng nhập vào hệ thống
                  </Link>
                </div>
              ) : (
                <div className="inline-flex min-h-16 items-center gap-2 p-3 text-sm font-medium text-[var(--text-muted)]">
                  <Icon className="animate-spin" name="loading" />
                  Đang kiểm tra phiên đăng nhập...
                </div>
              )}
            </section>

            <aside className="glass-card overflow-hidden rounded-[var(--radius-card)]">
              <header className="border-b border-[var(--line)] px-4 py-3">
                <h2 className="text-base font-semibold">Phiên làm việc</h2>
                <p className="mt-0.5 text-sm text-[var(--text-muted)]">Thông tin truy cập hiện tại</p>
              </header>
              <dl className="divide-y divide-[var(--line-soft)] px-4">
                <StatusTile
                  label="Tài khoản"
                  value={currentAccount ? currentAccount.username : data ? "Chưa đăng nhập" : "Đang kiểm tra"}
                />
                <StatusTile
                  label="Công tác"
                  value={currentAccount ? (loading ? "Đang tải" : `${modules.length} được cấp`) : "N/A"}
                />
                <StatusTile label="Ngày báo cáo" value={formatViDate(DEFAULT_REPORT_DATE)} />
              </dl>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
};

const StatusTile = ({
  label,
  value
}: {
  readonly label: string;
  readonly value: string;
}): React.ReactElement => (
  <div className="flex items-center justify-between gap-3 py-2.5">
    <dt className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-soft)]">{label}</dt>
    <dd className="min-w-0 break-words text-right text-sm font-semibold text-[var(--foreground)]">{value}</dd>
  </div>
);

const ModuleCard = ({
  description,
  href,
  icon,
  shortLabel,
  title
}: {
  readonly description: string;
  readonly href: string;
  readonly icon: IconName;
  readonly shortLabel: string;
  readonly title: string;
}): React.ReactElement => (
  <Link
    className="focus-ring pressable group grid min-h-20 min-w-0 grid-cols-[2.75rem_minmax(0,1fr)_auto] items-start gap-3 rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] p-4 text-[var(--foreground)] shadow-[var(--shadow-soft-sm)] hover:border-[var(--primary)] hover:bg-[var(--surface-muted)]"
    href={href}
  >
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-field)] bg-[var(--primary-soft)] text-[var(--primary-strong)]">
        <Icon name={icon} />
      </span>
    <span className="block min-w-0">
      <span className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="min-w-0 break-words text-base font-semibold">{title}</span>
        <Badge tone="neutral">{shortLabel}</Badge>
      </span>
      <span className="mt-0.5 block break-words text-sm font-normal leading-5 text-[var(--text-muted)]">
        {description}
      </span>
    </span>
    <span className="inline-flex h-9 w-9 items-center justify-center text-[var(--primary-strong)]">
      <Icon className="h-4 w-4 -rotate-90" name="chevronDown" />
    </span>
  </Link>
);

const ExecutiveCockpit = ({
  bdtt,
  cockpit
}: {
  readonly bdtt: ReturnType<typeof calculateMetrics> | null;
  readonly cockpit: CockpitResponse | null;
}): React.ReactElement => {
  const cockpitStatus = cockpit === null ? "loading" : cockpit.ok === false ? "error" : "ready";
  const toneClass = {
    danger: "text-[var(--danger)]",
    warning: "text-[var(--warning)]",
    info: "text-[var(--info)]",
    primary: "text-[var(--primary-strong)]"
  } as const;
  const metrics = [
    { label: "BDTT quá hạn", value: bdtt?.overdue ?? "N/A", tone: "danger" },
    { label: "Chưa báo cáo", value: bdtt?.unsubmittedWorkers ?? "N/A", tone: "warning" },
    { label: "AM chờ duyệt", value: cockpit?.am?.waitingReview ?? "N/A", tone: "info" },
    { label: "AM quá hạn", value: cockpit?.am?.overdue ?? "N/A", tone: "danger" },
    { label: "AM cần bổ sung", value: cockpit?.am?.needsRevision ?? "N/A", tone: "warning" },
    { label: "Thông báo mới", value: cockpit?.unreadNotifications ?? "N/A", tone: "primary" }
  ] as const;
  return (
    <section aria-labelledby="executive-cockpit-title" className="glass-card overflow-hidden rounded-[var(--radius-card)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-[var(--primary-strong)]">Điều hành</p>
          <h2 className="mt-0.5 text-base font-semibold" id="executive-cockpit-title">Tổng hợp cần xử lý</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Điểm cần quyết định trong ngày · {formatViDate(DEFAULT_REPORT_DATE)}</p>
        </div>
        <Badge solid tone={cockpitStatus === "loading" ? "neutral" : cockpitStatus === "error" ? "warning" : (bdtt?.overdue ?? 0) + (cockpit?.am?.overdue ?? 0) > 0 ? "danger" : "success"}>
          {cockpitStatus === "loading" ? "Đang tổng hợp" : cockpitStatus === "error" ? "Chưa tải được" : (bdtt?.overdue ?? 0) + (cockpit?.am?.overdue ?? 0) > 0 ? "Cần xử lý" : "Trong kiểm soát"}
        </Badge>
      </div>
      <div className="grid grid-cols-2 border-l border-t border-[var(--line-soft)] md:grid-cols-3 xl:grid-cols-6">
        {metrics.map((metric) => (
          <div className="border-b border-r border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2.5" key={metric.label}>
            <p className="text-xs font-medium text-[var(--text-muted)]">{metric.label}</p>
            <p className={cn("mt-1 text-xl font-semibold tabular-nums", toneClass[metric.tone])}>{metric.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

const ModuleCardSkeleton = (): React.ReactElement => (
  <div
    aria-label="Đang tải công tác"
    className="min-h-16 animate-pulse border-b border-r border-[var(--line)] bg-[var(--surface-muted)] p-2.5"
  >
    <div className="h-4 w-2/3 rounded-full bg-[var(--line)]" />
    <div className="mt-3 h-3 w-full rounded-full bg-[var(--line)]" />
  </div>
);

export default HomePage;
