"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui";
import { DEFAULT_REPORT_DATE, formatViDate } from "@/lib/date";
import {
  getOrgScopeLabel,
  getScopedAppData,
  hasFullOrgScope
} from "@/lib/permissions";
import { calculateMetrics, getTaskPercent } from "@/lib/progress";
import { useAppData } from "@/hooks/useAppData";
import type { AppData, DashboardMetrics, Task } from "@/types/domain";

const PLAN_TARGET_PERCENT = 50;

type OrgUnitLevel = "group" | "subgroup";
type Tone = "info" | "success" | "warning" | "danger";

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
        <p className="text-sm font-semibold text-slate-600">Đang tải dashboard...</p>
      </main>
    );
  }

  if (currentAccount.role !== "admin") {
    return (
      <main className="min-h-dvh px-4 py-8">
        <section className="glass-card mx-auto max-w-md rounded-[var(--radius-card)] p-6">
          <h1 className="text-xl font-extrabold">Không có quyền giám sát</h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Tài khoản worker chỉ được vào màn hình Việc của tôi.
          </p>
          <Link
            className="focus-ring pressable mt-4 inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--primary-strong)] px-5 text-sm font-extrabold text-white shadow-[var(--shadow-soft-sm)]"
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
      <ManagementDashboard data={scopedData} isFullScope={isFullScope} metrics={metrics} />
    </AdminShell>
  );
};

const ManagementDashboard = ({
  data,
  isFullScope,
  metrics
}: {
  readonly data: AppData;
  readonly isFullScope: boolean;
  readonly metrics: DashboardMetrics;
}): React.ReactElement => {
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
    <section className="grid min-w-0 gap-5">
      <section className="glass-card rounded-[var(--radius-card)] p-5 lg:p-6">
        <p className="text-xs font-extrabold uppercase text-[var(--primary-strong)]">
          Điều hành tiến độ
        </p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-2xl font-extrabold tracking-normal text-[var(--foreground)]">
              Theo dõi theo {isFullScope ? "nhóm và phân nhóm" : "phân nhóm"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[var(--text-muted)]">
              Tập trung vào đơn vị đạt kế hoạch, đơn vị cần tăng cường, WorkOrder trễ
              và mức báo cáo của worker trong ngày.
            </p>
          </div>
          <div className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-extrabold text-[var(--text-muted)] shadow-[var(--shadow-soft-sm)]">
            Mốc đạt: {PLAN_TARGET_PERCENT}% · {formatViDate(DEFAULT_REPORT_DATE)}
          </div>
        </div>
      </section>

      <ManagementKpiStrip
        attentionCount={attentionRows.length}
        metrics={metrics}
        onTrackCount={onTrackRows.length}
        rows={rows}
      />

      <section className="grid min-w-0 gap-5 2xl:grid-cols-[0.9fr_1.1fr]">
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
    </section>
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
    readonly label: string;
    readonly value: string;
    readonly helper: string;
    readonly tone: Tone;
  }> = [
    {
      label: "Đơn vị báo cáo",
      value: formatNumber(rows.length),
      helper: `${fullyReported}/${rows.length} đơn vị đủ báo cáo`,
      tone: "info"
    },
    {
      label: "Đáp ứng kế hoạch",
      value: formatNumber(onTrackCount),
      helper: "Đạt mốc tiến độ",
      tone: "success"
    },
    {
      label: "Cần tăng cường",
      value: formatNumber(attentionCount),
      helper: "Cần theo dõi",
      tone: "warning"
    },
    {
      label: "WorkOrder trễ",
      value: formatNumber(metrics.overdue),
      helper: `${overdueUnits} đơn vị có WO trễ`,
      tone: "danger"
    },
    {
      label: "Tỷ lệ đạt TB",
      value: `${metrics.overallPercent}%`,
      helper: `Mốc đạt ${PLAN_TARGET_PERCENT}%`,
      tone: metrics.overallPercent >= PLAN_TARGET_PERCENT ? "success" : "warning"
    }
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <article
          className={`metric-card rounded-[var(--radius-card)] p-5 ${toneText(card.tone)}`}
          key={card.label}
        >
          <p className="text-[11px] font-extrabold uppercase text-[var(--text-soft)]">
            {card.label}
          </p>
          <p className="mt-3 text-4xl font-extrabold leading-none tabular-nums">
            {card.value}
          </p>
          <p className="mt-3 text-sm font-semibold text-[var(--text-muted)]">{card.helper}</p>
        </article>
      ))}
    </section>
  );
};

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
    <section className="glass-card min-w-0 overflow-hidden rounded-[var(--radius-card)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
        <h3 className="text-lg font-extrabold text-[var(--foreground)]">{title}</h3>
        <span
          className={`rounded-full px-3 py-1 text-sm font-extrabold ${
            isSuccess
              ? "bg-[var(--success-soft)] text-[var(--success)]"
              : "bg-[var(--accent-soft)] text-[var(--accent)]"
          }`}
        >
          {subtitle}
        </span>
      </header>

      {rows.length === 0 ? (
        <div className="p-5 text-sm font-semibold text-[var(--text-muted)]">{emptyText}</div>
      ) : (
        <div className="divide-y divide-[var(--line-soft)]">
          {rows.map((row) => (
            <ManagementRow isSuccess={isSuccess} key={row.key} row={row} />
          ))}
        </div>
      )}
    </section>
  );
};

const ManagementRow = ({
  isSuccess,
  row
}: {
  readonly isSuccess: boolean;
  readonly row: OrgUnitRow;
}): React.ReactElement => {
  const barColor = row.overdue > 0 ? "var(--danger)" : isSuccess ? "var(--success)" : "var(--accent)";

  return (
    <article className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-[0.8rem] text-sm font-extrabold text-white"
            style={{ background: rowAvatarColor(row.shortName) }}
          >
            {getInitials(row.shortName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-extrabold text-[var(--foreground)]">
              {row.shortName}
            </p>
            <p className="truncate text-xs font-semibold text-[var(--text-muted)]">
              {row.context}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone="success">HT {row.completed}</Badge>
          <Badge tone="warning">ĐTH {row.inProgress}</Badge>
          <Badge tone="danger">Trễ {row.overdue}</Badge>
          <Badge>Tổng {row.tasks}</Badge>
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <div className="progress-track min-w-0 flex-1">
            <div
              className="progress-fill"
              style={{ backgroundColor: barColor, width: `${Math.min(row.percent, 100)}%` }}
            />
          </div>
          <span className="w-12 text-right text-sm font-extrabold" style={{ color: barColor }}>
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
  <section className="glass-card flex flex-wrap items-center justify-center gap-x-7 gap-y-3 rounded-[var(--radius-card)] px-5 py-4 text-sm">
    <LegendDot className="bg-[var(--success)]" label="Hoàn thành" />
    <LegendDot className="bg-[var(--warning)]" label="Đang thực hiện" />
    <LegendDot className="bg-[var(--danger)]" label="Trễ tiến độ" />
    <LegendDot className="bg-[var(--text-soft)]" label="Chưa triển khai" />
  </section>
);

const LegendDot = ({
  className,
  label
}: {
  readonly className: string;
  readonly label: string;
}): React.ReactElement => (
  <span className="inline-flex items-center gap-2 font-bold text-[var(--text-muted)]">
    <span className={`h-2.5 w-2.5 rounded ${className}`} />
    {label}
  </span>
);

const buildOrgUnitRows = (data: AppData, level: OrgUnitLevel): OrgUnitRow[] => {
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

  data.profiles
    .filter((profile) => profile.role === "worker")
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
      if (
        data.progress.some(
          (record) => record.userId === profile.id && record.reportDate === DEFAULT_REPORT_DATE
        )
      ) {
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

const getInitials = (value: string): string => {
  const letters = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0] ?? "")
    .join("");
  return (letters || "?").toUpperCase();
};

const rowAvatarColor = (value: string): string => {
  if (value.includes("Đo")) return "linear-gradient(135deg,#f08a3c,#f4ab5e)";
  if (value.includes("Chấp")) return "linear-gradient(135deg,#3e7bfa,#6fa0ff)";
  if (value.includes("HT")) return "linear-gradient(135deg,#7c5cff,#a48bff)";
  if (value.includes("Tháo")) return "linear-gradient(135deg,#0b6b4f,#15a06f)";
  return "linear-gradient(135deg,#98a2b3,#c0c7d4)";
};

const formatNumber = (value: number): string =>
  new Intl.NumberFormat("vi-VN").format(value);

const toneText = (tone: Tone): string => {
  if (tone === "success") return "text-[var(--success)]";
  if (tone === "warning") return "text-[var(--accent)]";
  if (tone === "danger") return "text-[var(--danger)]";
  return "text-[var(--info)]";
};

export default AdminPage;
