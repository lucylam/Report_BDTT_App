"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProgressCharts } from "@/components/admin/ProgressCharts";
import { Badge, Icon, Widget, WidgetHeader, type IconName } from "@/components/ui";
import { buildExcelDashboard } from "@/lib/dashboard";
import { DEFAULT_REPORT_DATE, formatViDate } from "@/lib/date";
import {
  getOrgScopeLabel,
  getScopedAppData,
  hasFullOrgScope,
  isDataAdminAccount
} from "@/lib/permissions";
import { calculateMetrics, getTaskPercent } from "@/lib/progress";
import {
  getActiveTasksByAssignee,
  getReportablePersonnel,
  hasSubmittedReportForDate
} from "@/lib/reportingPersonnel";
import { useAppData } from "@/hooks/useAppData";
import type { AppData, DashboardMetrics, Task } from "@/types/domain";

const PLAN_TARGET_PERCENT = 50;

type OrgUnitLevel = "group" | "subgroup";
type Tone = "info" | "success" | "warning" | "danger";
type DashboardView = "excel" | "overview";

interface RecentUpdateRow {
  readonly key: string;
  readonly workerName: string;
  readonly taskTag: string;
  readonly taskName: string;
  readonly reportDate: string;
  readonly reportDateLabel: string;
  readonly submittedAtLabel: string;
  readonly percent: number;
  readonly hasPhoto: boolean;
}

interface RecentUpdateGroup {
  readonly reportDate: string;
  readonly reportDateLabel: string;
  readonly rows: readonly RecentUpdateRow[];
}

interface OrgUnitRow {
  readonly key: string;
  readonly name: string;
  readonly shortName: string;
  readonly context: string;
  readonly members: number;
  readonly submitted: number;
  readonly tasks: number;
  readonly completed: number;
  readonly inProgress: number;
  readonly notStarted: number;
  readonly overdue: number;
  readonly cancelled: number;
  readonly percent: number;
}

const AdminPage = (): React.ReactElement => {
  const router = useRouter();
  const { currentAccount, data, logout } = useAppData();

  useEffect(() => {
    if (!data) return;
    if (!currentAccount) router.replace("/login");
    if (currentAccount?.mustChangePassword) router.replace("/change-password");
  }, [currentAccount, data, router]);

  if (!data || !currentAccount || currentAccount.mustChangePassword) {
    return (
      <main className="min-h-dvh p-6">
        <p className="text-sm font-semibold text-[var(--text-muted)]">Đang tải dashboard...</p>
      </main>
    );
  }

  if (currentAccount.role !== "admin") {
    return (
      <main className="min-h-dvh px-4 py-8">
        <section className="glass-card mx-auto max-w-md rounded-[var(--radius-card)] p-6">
          <h1 className="text-xl font-semibold">Không có quyền giám sát</h1>
          <p className="mt-2 text-sm font-semibold text-[var(--text-muted)]">
            Tài khoản worker chỉ được vào màn hình Việc của tôi.
          </p>
          <Link
            className="focus-ring pressable mt-4 inline-flex min-h-12 items-center justify-center rounded-[var(--radius-field)] bg-[var(--primary-strong)] px-5 text-sm font-semibold text-[var(--primary-contrast)] shadow-[var(--shadow-soft-sm)] hover:bg-[var(--primary)]"
            href="/worker"
          >
            Về Workspace
          </Link>
        </section>
      </main>
    );
  }

  const scopedData = getScopedAppData(data, currentAccount);
  const scopeLabel = getOrgScopeLabel(currentAccount);
  const isFullScope = hasFullOrgScope(currentAccount);
  const metrics = calculateMetrics(scopedData, DEFAULT_REPORT_DATE);

  return (
    <AdminShell
      account={currentAccount}
      onLogout={logout}
      subtitle={`Tổ Thiết bị Đo lường & Điều khiển · ${scopeLabel} · Ngày báo cáo: ${formatViDate(DEFAULT_REPORT_DATE)}`}
      title={isFullScope ? "Dashboard giám sát" : "Dashboard nhóm"}
    >
      <ManagementDashboard
        canReviewUpdateHistory={isDataAdminAccount(currentAccount)}
        data={scopedData}
        isFullScope={isFullScope}
        metrics={metrics}
      />
    </AdminShell>
  );
};

const ManagementDashboard = ({
  canReviewUpdateHistory,
  data,
  isFullScope,
  metrics
}: {
  readonly canReviewUpdateHistory: boolean;
  readonly data: AppData;
  readonly isFullScope: boolean;
  readonly metrics: DashboardMetrics;
}): React.ReactElement => {
  const [dashboardView, setDashboardView] = useState<DashboardView>("excel");
  const excelDashboard = useMemo(
    () => buildExcelDashboard(data, DEFAULT_REPORT_DATE),
    [data]
  );
  const updateHistoryRows = useMemo(
    () => (canReviewUpdateHistory ? buildRecentUpdateRows(data) : []),
    [canReviewUpdateHistory, data]
  );
  const level: OrgUnitLevel = isFullScope ? "group" : "subgroup";
  const rows = buildOrgUnitRows(data, level);
  const onTrackRows = rows
    .filter((row) => row.percent >= PLAN_TARGET_PERCENT && row.overdue === 0)
    .sort((left, right) => right.percent - left.percent);
  const onTrackKeys = new Set(onTrackRows.map((row) => row.key));
  const attentionRows = rows
    .filter((row) => !onTrackKeys.has(row.key))
    .sort((left, right) => {
      if (right.overdue !== left.overdue) return right.overdue - left.overdue;
      return left.percent - right.percent;
    });

  return (
    <section className="grid min-w-0 gap-4">
      <DashboardViewTabs onChange={setDashboardView} value={dashboardView} />

      {dashboardView === "excel" ? (
        <ProgressCharts
          dashboard={excelDashboard}
          reportDateLabel={formatViDate(DEFAULT_REPORT_DATE)}
        />
      ) : (
        <>
      <ManagementKpiStrip
        attentionCount={attentionRows.length}
        metrics={metrics}
        onTrackCount={onTrackRows.length}
        rows={rows}
      />

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <ProgressOverview rows={rows} />
        <ReportCoverage metrics={metrics} rows={rows} />
      </section>

      <section className="grid min-w-0 gap-4 2xl:grid-cols-2">
        <ManagementTable
          emptyText="Chưa có đơn vị nào đạt mốc kế hoạch trong phạm vi hiện tại."
          rows={onTrackRows}
          subtitle={`${onTrackRows.length} đơn vị`}
          title="Đáp ứng kế hoạch"
          tone="success"
        />
        <ManagementTable
          emptyText="Không có đơn vị cần tăng cường tại mốc báo cáo này."
          rows={attentionRows}
          subtitle={`${attentionRows.length} đơn vị`}
          title="Cần tăng cường triển khai"
          tone="warning"
        />
      </section>

      <StatusLegend />
        </>
      )}

      {canReviewUpdateHistory ? <RecentUpdateList rows={updateHistoryRows} /> : null}
    </section>
  );
};

const RecentUpdateList = ({
  rows
}: {
  readonly rows: readonly RecentUpdateRow[];
}): React.ReactElement => {
  const groups = buildRecentUpdateGroups(rows);

  return (
    <details className="glass-card min-w-0 overflow-hidden rounded-[var(--radius-card)] border-dashed shadow-none">
      <summary className="focus-ring flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 text-[var(--text-soft)]" name="history" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-[var(--foreground)]">
              Lịch sử cập nhật worker
            </span>
            <span className="block truncate text-[11px] font-semibold text-[var(--text-soft)]">
              Chỉ hiển thị với vinhlpp · tất cả ngày báo cáo
            </span>
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-[var(--line-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--text-muted)]">
            {rows.length} bản ghi
          </span>
          <Icon className="h-4 w-4 text-[var(--text-soft)]" name="chevronDown" />
        </span>
      </summary>

      {rows.length === 0 ? (
        <p className="border-t border-[var(--line-soft)] px-3 py-2 text-xs font-semibold text-[var(--text-muted)]">
          Chưa có worker gửi báo cáo hoặc chỉnh sửa tiến độ.
        </p>
      ) : (
        <div className="max-h-[24rem] overflow-y-auto border-t border-[var(--line-soft)]">
          {groups.map((group) => (
            <section className="min-w-0" key={group.reportDate}>
              <h3 className="bg-[var(--surface-muted)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-muted)]">
                BC {group.reportDateLabel} · {group.rows.length} cập nhật
              </h3>
              <ol className="divide-y divide-[var(--line-soft)]">
                {group.rows.map((row) => (
                  <li
                    className="grid min-w-0 gap-1.5 px-3 py-2 text-xs sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-3"
                    key={row.key}
                  >
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="max-w-full truncate font-semibold text-[var(--foreground)]">
                          {row.workerName}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${recentPercentPillClass(row.percent)}`}>
                          {row.percent}%
                        </span>
                        {row.hasPhoto ? (
                          <span className="rounded-full bg-[var(--info-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--info-strong)]">
                            Có ảnh
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] font-semibold text-[var(--text-muted)]">
                        <span className="font-mono text-[var(--foreground)]">{row.taskTag}</span>
                        <span> · {row.taskName}</span>
                      </p>
                    </div>

                    <div className="flex min-w-0 items-center gap-2 text-[11px] font-semibold text-[var(--text-soft)] sm:justify-end">
                      <span>{row.submittedAtLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span>Gửi/chỉnh sửa</span>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </details>
  );
};

const DashboardViewTabs = ({
  onChange,
  value
}: {
  readonly onChange: (value: DashboardView) => void;
  readonly value: DashboardView;
}): React.ReactElement => {
  const tabs: Array<{ readonly label: string; readonly value: DashboardView }> = [
    { label: "DASH BOARD Excel", value: "excel" },
    { label: "Tổng quan", value: "overview" }
  ];

  return (
    <div className="glass-card flex w-full max-w-xl rounded-[var(--radius-card)] p-1">
      {tabs.map((tab) => {
        const active = value === tab.value;
        return (
          <button
            className={`focus-ring pressable min-h-11 flex-1 rounded-[calc(var(--radius-card)-0.35rem)] px-4 text-sm font-semibold transition ${
              active
                ? "bg-[var(--foreground)] text-[var(--surface)] shadow-[var(--shadow-soft-sm)]"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            }`}
            key={tab.value}
            onClick={() => onChange(tab.value)}
            type="button"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

const ManagementKpiStrip = ({
  attentionCount,
  metrics,
  onTrackCount,
  rows
}: {
  readonly attentionCount: number;
  readonly metrics: DashboardMetrics;
  readonly onTrackCount: number;
  readonly rows: readonly OrgUnitRow[];
}): React.ReactElement => {
  const fullyReported = rows.filter(
    (row) => row.members > 0 && row.submitted >= row.members
  ).length;
  const overdueUnits = rows.filter((row) => row.overdue > 0).length;
  const cards: Array<{
    readonly icon: "chart" | "check" | "people" | "workorder";
    readonly label: string;
    readonly value: string;
    readonly helper: string;
    readonly tone: Tone;
  }> = [
    {
      icon: "people",
      label: "Đơn vị báo cáo",
      value: formatNumber(rows.length),
      helper: `${fullyReported}/${rows.length} đơn vị đủ báo cáo`,
      tone: "info"
    },
    {
      icon: "check",
      label: "Đáp ứng kế hoạch",
      value: formatNumber(onTrackCount),
      helper: `Mốc đạt ${PLAN_TARGET_PERCENT}%`,
      tone: "success"
    },
    {
      icon: "chart",
      label: "Cần tăng cường",
      value: formatNumber(attentionCount),
      helper: "Cần theo dõi trong ca",
      tone: "warning"
    },
    {
      icon: "workorder",
      label: "WorkOrder trễ",
      value: formatNumber(metrics.overdue),
      helper: `${overdueUnits} đơn vị có WO trễ`,
      tone: "danger"
    },
    {
      icon: "chart",
      label: "Tỷ lệ đạt TB",
      value: `${metrics.overallPercent}%`,
      helper: `${metrics.completed}/${metrics.totalTasks} hạng mục hoàn thành`,
      tone: metrics.overallPercent >= PLAN_TARGET_PERCENT ? "success" : "warning"
    }
  ];

  return (
    <section className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-5">
      {cards.map((card) => (
        <article
          className={`metric-card rounded-[var(--radius-card)] p-3 ${toneText(card.tone)}`}
          key={card.label}
        >
          <div className="flex items-start justify-between gap-3">
            <Icon className="h-4 w-4" name={card.icon} />
            <span className="mt-1 h-2 w-2 rounded-full bg-current opacity-55" />
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase leading-tight text-[var(--text-soft)]">
                {card.label}
              </p>
              <p className="mt-1.5 truncate text-xs font-semibold leading-4 text-[var(--text-muted)]">
                {card.helper}
              </p>
            </div>
            <p className="shrink-0 text-2xl font-semibold leading-none tabular-nums sm:text-3xl">
              {card.value}
            </p>
          </div>
        </article>
      ))}
    </section>
  );
};

const ProgressOverview = ({ rows }: { readonly rows: readonly OrgUnitRow[] }): React.ReactElement => {
  const chartRows = [...rows].sort((left, right) => right.tasks - left.tasks).slice(0, 10);

  return (
    <Widget className="p-5">
      <WidgetHeader
        action={
          <span className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--primary-strong)]">
            Top {chartRows.length}
          </span>
        }
        subtitle="Theo % hoàn thành trung bình và số WorkOrder trễ"
        title="Tổng quan tiến độ theo đơn vị"
      />
      <div className="mt-4 grid gap-3">
        {chartRows.map((row) => {
          const tone = row.overdue > 0 ? "danger" : row.percent >= PLAN_TARGET_PERCENT ? "success" : "warning";
          return (
            <div className="grid gap-2" key={row.key}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--foreground)]">{row.shortName}</p>
                  <p className="truncate text-xs font-semibold text-[var(--text-muted)]">
                    {row.context} · {row.tasks} WorkOrder
                  </p>
                </div>
                <span className={`shrink-0 font-semibold tabular-nums ${toneText(tone)}`}>
                  {row.percent}%
                </span>
              </div>
              <div className="progress-track">
                <div
                  className={`progress-fill progress-stripe-${tone}`}
                  style={{ width: `${Math.min(row.percent, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Widget>
  );
};

const ReportCoverage = ({
  metrics,
  rows
}: {
  readonly metrics: DashboardMetrics;
  readonly rows: readonly OrgUnitRow[];
}): React.ReactElement => {
  const members = rows.reduce((total, row) => total + row.members, 0);
  const submitted = rows.reduce((total, row) => total + row.submitted, 0);
  const coveragePercent = members === 0 ? 0 : Math.round((submitted / members) * 100);

  return (
    <Widget className="p-5">
      <WidgetHeader
        subtitle={formatViDate(DEFAULT_REPORT_DATE)}
        title="Báo cáo nhân sự trong ngày"
      />
      <div className="rounded-[var(--radius-card)] bg-[var(--foreground)] p-5 text-[var(--surface)]">
        <p className="text-sm font-semibold opacity-75">Tỷ lệ đã gửi báo cáo</p>
        <p className="mt-3 text-5xl font-semibold leading-none tabular-nums">{coveragePercent}%</p>
        <p className="mt-3 text-sm font-semibold opacity-80">
          {submitted}/{members} nhân sự được ghi nhận trong ngày.
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <MiniStat label="Hoàn thành" tone="success" value={metrics.completed} />
        <MiniStat label="Đang làm" tone="warning" value={metrics.inProgress} />
        <MiniStat label="Chưa làm" tone="info" value={metrics.notStarted} />
        <MiniStat label="Đã hủy" tone="danger" value={metrics.cancelled} />
      </div>
    </Widget>
  );
};

const MiniStat = ({
  label,
  tone,
  value
}: {
  readonly label: string;
  readonly tone: Tone;
  readonly value: number;
}): React.ReactElement => (
  <div className="rounded-[var(--radius-field)] bg-[var(--surface-muted)] p-3 ring-1 ring-[var(--border)]">
    <p className={`text-2xl font-semibold tabular-nums ${toneText(tone)}`}>{formatNumber(value)}</p>
    <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">{label}</p>
  </div>
);

const ManagementTable = ({
  emptyText,
  rows,
  subtitle,
  title,
  tone
}: {
  readonly emptyText: string;
  readonly rows: readonly OrgUnitRow[];
  readonly subtitle: string;
  readonly title: string;
  readonly tone: "success" | "warning";
}): React.ReactElement => {
  const isSuccess = tone === "success";

  return (
    <Widget className="min-w-0 p-0">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
        <WidgetHeader
          className="mb-0"
          subtitle={isSuccess ? "Đơn vị đang đi đúng nhịp" : "Ưu tiên kiểm tra trong ngày"}
          title={title}
        />
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            isSuccess
              ? "bg-[var(--success-soft)] text-[var(--success)]"
              : "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
          }`}
        >
          {subtitle}
        </span>
      </header>

      {rows.length === 0 ? (
        <div className="p-5 text-sm font-semibold text-[var(--text-muted)]">{emptyText}</div>
      ) : (
        <div className="divide-y divide-[var(--line-soft)]">
          {rows.slice(0, 8).map((row) => (
            <ManagementRow isSuccess={isSuccess} key={row.key} row={row} />
          ))}
        </div>
      )}
    </Widget>
  );
};

const ManagementRow = ({
  isSuccess,
  row
}: {
  readonly isSuccess: boolean;
  readonly row: OrgUnitRow;
}): React.ReactElement => {
  const tone = row.overdue > 0 ? "danger" : isSuccess ? "success" : "warning";

  return (
    <article className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-field)] bg-[var(--surface-muted)] ring-1 ring-[var(--border)] ${groupIconTone(row)}`}
          >
            <Icon className="h-5 w-5" name={groupIconName(row)} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-[var(--foreground)]">
              {row.shortName}
            </p>
            <p className="truncate text-xs font-semibold text-[var(--text-muted)]">
              {row.context}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone="success">HT {row.completed}</Badge>
          <Badge tone="accent">ĐTH {row.inProgress}</Badge>
          <Badge tone="danger">Trễ {row.overdue}</Badge>
          <Badge>Tổng {row.tasks}</Badge>
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <div className="progress-track min-w-0 flex-1">
            <div
              className={`progress-fill progress-stripe-${tone}`}
              style={{ width: `${Math.min(row.percent, 100)}%` }}
            />
          </div>
          <span className={`w-12 text-right text-sm font-semibold tabular-nums ${toneText(tone)}`}>
            {row.percent}%
          </span>
        </div>
        <p className="mt-2 text-xs font-semibold text-[var(--text-muted)]">
          {row.submitted}/{row.members} thành viên có báo cáo · {row.notStarted} chưa triển khai
        </p>
      </div>
    </article>
  );
};

const StatusLegend = (): React.ReactElement => (
  <Widget className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 px-5 py-4 text-sm">
    <LegendDot className="bg-[var(--success)]" label="Hoàn thành" />
    <LegendDot className="bg-[var(--warning)]" label="Đang thực hiện" />
    <LegendDot className="bg-[var(--danger)]" label="Trễ tiến độ" />
    <LegendDot className="bg-[var(--text-soft)]" label="Chưa triển khai" />
  </Widget>
);

const LegendDot = ({
  className,
  label
}: {
  readonly className: string;
  readonly label: string;
}): React.ReactElement => (
  <span className="inline-flex items-center gap-2 font-semibold text-[var(--text-muted)]">
    <span className={`h-2.5 w-2.5 rounded ${className}`} />
    {label}
  </span>
);

const buildRecentUpdateRows = (
  data: AppData,
  limit?: number
): RecentUpdateRow[] => {
  const profilesById = new Map(data.profiles.map((profile) => [profile.id, profile]));
  const tasksById = new Map(data.tasks.map((task) => [task.id, task]));

  const rows = [...data.progress]
    .filter((record) => tasksById.has(record.taskId))
    .sort((left, right) => getProgressTimestamp(right) - getProgressTimestamp(left))
    .map((record, index) => {
      const task = tasksById.get(record.taskId);
      const profile = profilesById.get(record.userId);
      const workerName =
        profile?.fullName || profile?.resourceName || task?.resourceName || record.userId;

      return {
        key: `${record.taskId}-${record.userId}-${record.reportDate}-${record.submittedAt ?? index}`,
        workerName,
        taskTag: task?.tagname || task?.wo || record.taskId,
        taskName: task?.taskName || "Hạng mục không còn trong DATA hiện tại",
        reportDate: record.reportDate,
        reportDateLabel: formatViDate(record.reportDate),
        submittedAtLabel: formatProgressSubmittedAt(record),
        percent: record.percent,
        hasPhoto: Boolean(record.photoPath)
      };
    });

  return typeof limit === "number" ? rows.slice(0, limit) : rows;
};

const buildRecentUpdateGroups = (
  rows: readonly RecentUpdateRow[]
): RecentUpdateGroup[] => {
  const groups = new Map<string, RecentUpdateRow[]>();

  rows.forEach((row) => {
    const current = groups.get(row.reportDate) ?? [];
    current.push(row);
    groups.set(row.reportDate, current);
  });

  return Array.from(groups.entries()).map(([reportDate, groupRows]) => ({
    reportDate,
    reportDateLabel: groupRows[0]?.reportDateLabel ?? formatViDate(reportDate),
    rows: groupRows
  }));
};

const getProgressTimestamp = (record: {
  readonly reportDate: string;
  readonly submittedAt?: string;
}): number => {
  const submittedTime = Date.parse(record.submittedAt ?? "");
  if (Number.isFinite(submittedTime)) return submittedTime;

  const reportTime = Date.parse(`${record.reportDate}T00:00:00+07:00`);
  return Number.isFinite(reportTime) ? reportTime : 0;
};

const formatProgressSubmittedAt = (record: {
  readonly reportDate: string;
  readonly submittedAt?: string;
}): string => {
  const submittedTime = Date.parse(record.submittedAt ?? "");
  if (!Number.isFinite(submittedTime)) return formatViDate(record.reportDate);

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(new Date(submittedTime));
};

const recentPercentPillClass = (percent: number): string => {
  if (percent >= 100) return "bg-[var(--success-soft)] text-[var(--success)]";
  if (percent > 0) return "bg-[var(--surface-warm)] text-[var(--accent-strong)]";
  return "bg-[var(--line-soft)] text-[var(--text-muted)]";
};

const buildOrgUnitRows = (data: AppData, level: OrgUnitLevel): OrgUnitRow[] => {
  const activeTasksByAssignee = getActiveTasksByAssignee(data.tasks);
  const units = new Map<
    string,
    {
      groupName: string;
      subgroupName: string;
      profiles: Set<string>;
      submitted: Set<string>;
      tasks: Task[];
    }
  >();

  getReportablePersonnel(data.profiles)
    .forEach((profile) => {
      const groupName = profile.orgGroup || profile.nhom || "Chưa phân nhóm";
      const subgroupName = profile.subgroup || profile.nhom || groupName;
      const key = level === "group" ? groupName : `${groupName}::${subgroupName}`;
      const current =
        units.get(key) ??
        {
          groupName,
          subgroupName,
          profiles: new Set<string>(),
          submitted: new Set<string>(),
          tasks: []
      };
      current.profiles.add(profile.id);
      if (hasSubmittedReportForDate({
        activeTasks: activeTasksByAssignee.get(profile.id) ?? [],
        progress: data.progress,
        profileId: profile.id,
        reportDate: DEFAULT_REPORT_DATE
      })) {
        current.submitted.add(profile.id);
      }
      units.set(key, current);
    });

  data.tasks.forEach((task) => {
    const profile = data.profiles.find((item) => item.id === task.assignedTo);
    if (!profile) return;
    const groupName = profile.orgGroup || task.nhom || "Chưa phân nhóm";
    const subgroupName = profile.subgroup || task.nhom || groupName;
    const key = level === "group" ? groupName : `${groupName}::${subgroupName}`;
    const current =
      units.get(key) ??
      {
        groupName,
        subgroupName,
        profiles: new Set<string>(),
        submitted: new Set<string>(),
        tasks: []
      };
    current.tasks.push(task);
    units.set(key, current);
  });

  return Array.from(units.entries())
    .map(([key, unit]) => {
      const activeTasks = unit.tasks.filter((task) => !task.isCancelled);
      const percents = activeTasks.map((task) =>
        getTaskPercent(data.progress, task.id, DEFAULT_REPORT_DATE)
      );
      const totalPercent = percents.reduce<number>((sum, percent) => sum + percent, 0);
      const completed = percents.filter((percent) => percent === 100).length;
      const inProgress = percents.filter((percent) => percent > 0 && percent < 100).length;
      const notStarted = percents.filter((percent) => percent === 0).length;
      const overdue = activeTasks.filter((task) => {
        const percent = getTaskPercent(data.progress, task.id, DEFAULT_REPORT_DATE);
        return task.finishDate < DEFAULT_REPORT_DATE && percent < 100;
      }).length;
      const name = level === "group" ? unit.groupName : unit.subgroupName;

      return {
        key,
        name,
        shortName: shortenName(name),
        context: level === "group" ? "Nhóm chức năng" : unit.groupName,
        members: unit.profiles.size,
        submitted: unit.submitted.size,
        tasks: activeTasks.length,
        completed,
        inProgress,
        notStarted,
        overdue,
        cancelled: unit.tasks.length - activeTasks.length,
        percent: activeTasks.length === 0 ? 0 : Math.round(totalPercent / activeTasks.length)
      };
    })
    .sort((left, right) => {
      if (right.tasks !== left.tasks) return right.tasks - left.tasks;
      return left.shortName.localeCompare(right.shortName);
    });
};

const shortenName = (name: string): string =>
  name
    .replace(/^Nhóm\s+/i, "")
    .replace("Thiết bị", "TB")
    .replace("Điều khiển", "ĐK")
    .replace("Đo lường", "Đo lường")
    .trim();

const groupIconName = (row: OrgUnitRow): IconName => {
  const value = `${row.name} ${row.shortName}`.toLowerCase();
  if (value.includes("chấp")) return "workorder";
  if (value.includes("đo") || value.includes("áp") || value.includes("mức") || value.includes("lưu")) return "chart";
  if (value.includes("ht") || value.includes("hệ thống") || value.includes("điều khiển")) return "shield";
  if (value.includes("tháo") || value.includes("lắp")) return "settings";
  return "people";
};

const groupIconTone = (row: OrgUnitRow): string => {
  const value = `${row.name} ${row.shortName}`.toLowerCase();
  if (value.includes("chấp")) return "text-[var(--info)]";
  if (value.includes("đo") || value.includes("áp") || value.includes("mức") || value.includes("lưu")) return "text-[var(--accent-strong)]";
  if (value.includes("ht") || value.includes("hệ thống") || value.includes("điều khiển")) return "text-[var(--primary-strong)]";
  if (value.includes("tháo") || value.includes("lắp")) return "text-[var(--success)]";
  return "text-[var(--text-muted)]";
};

const formatNumber = (value: number): string =>
  new Intl.NumberFormat("vi-VN").format(value);

const toneText = (tone: Tone): string => {
  if (tone === "success") return "text-[var(--success)]";
  if (tone === "warning") return "text-[var(--accent-strong)]";
  if (tone === "danger") return "text-[var(--danger)]";
  return "text-[var(--info)]";
};

export default AdminPage;
