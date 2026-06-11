"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { DEFAULT_REPORT_DATE, formatViDate } from "@/lib/date";
import { BDTT_2026_SUBTITLE } from "@/lib/org2026";
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
        <p className="text-sm text-slate-600">Đang tải dashboard...</p>
      </main>
    );
  }

  if (currentAccount.role !== "admin") {
    return (
      <main className="min-h-dvh px-4 py-8">
        <section className="soft-panel mx-auto max-w-md rounded-[2rem] p-6">
          <h1 className="text-xl font-semibold">Không có quyền giám sát</h1>
          <p className="mt-2 text-sm text-slate-600">
            Tài khoản worker chỉ được vào màn hình Việc của tôi.
          </p>
          <Link
            className="focus-ring pressable mt-4 inline-flex min-h-11 items-center rounded-2xl bg-[var(--foreground)] px-4 text-sm font-semibold text-white"
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
      subtitle={`${BDTT_2026_SUBTITLE} · ${scopeLabel} · Ngày báo cáo: ${formatViDate(DEFAULT_REPORT_DATE)}`}
      title={isFullScope ? "Dashboard giám sát" : "Dashboard nhóm"}
    >
      <ManagementDashboard
        data={scopedData}
        isFullScope={isFullScope}
        metrics={metrics}
      />
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
      <section className="soft-panel p-5 lg:p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--primary-strong)]">
          Điều hành tiến độ
        </p>
        <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
              Theo dõi theo {isFullScope ? "nhóm và phân nhóm" : "phân nhóm"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
              Dashboard ưu tiên câu hỏi quản lý: đơn vị nào đạt kế hoạch, đơn vị nào cần nhắc,
              còn bao nhiêu việc chưa triển khai và có bao nhiêu WorkOrder trễ tiến độ.
            </p>
          </div>
          <div className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--text-muted)]">
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

      <section className="grid min-w-0 gap-5 2xl:grid-cols-2">
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
      label: "Tổng đơn vị báo cáo",
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
      label: "Cần tăng cường triển khai",
      value: formatNumber(attentionCount),
      helper: "Cần theo dõi",
      tone: "warning"
    },
    {
      label: "Kế hoạch hành động trễ tiến độ",
      value: formatNumber(metrics.overdue),
      helper: `${overdueUnits} đơn vị có WorkOrder trễ`,
      tone: "danger"
    },
    {
      label: "Tỷ lệ đạt trung bình",
      value: `${metrics.overallPercent}%`,
      helper: `Mốc đạt ${PLAN_TARGET_PERCENT}%`,
      tone: metrics.overallPercent >= PLAN_TARGET_PERCENT ? "success" : "warning"
    }
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <article
          className={`rounded-[1.4rem] border-2 bg-white/95 p-5 shadow-[0_16px_36px_rgba(15,83,69,0.08)] ${toneBorder(card.tone)}`}
          key={card.label}
        >
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {card.label}
          </p>
          <p className={`mt-3 text-4xl font-extrabold leading-none ${toneText(card.tone)}`}>
            {card.value}
          </p>
          <p className="mt-3 text-sm font-medium text-[var(--text-muted)]">{card.helper}</p>
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
    <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-white/95 shadow-[0_18px_44px_rgba(15,83,69,0.10)]">
      <header
        className={`flex flex-wrap items-center gap-3 px-4 py-3 text-white ${
          isSuccess ? "bg-[#2f8238]" : "bg-[#e9560a]"
        }`}
      >
        <h3 className="text-lg font-extrabold">{title}</h3>
        <span className="rounded-full bg-white/18 px-3 py-1 text-sm font-semibold">
          {subtitle}
        </span>
      </header>

      {rows.length === 0 ? (
        <div className="p-5 text-sm text-[var(--text-muted)]">{emptyText}</div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[780px]">
            <div className="grid grid-cols-[minmax(180px,1.2fr)_minmax(210px,1fr)_64px_64px_64px_64px_64px] items-center border-b border-[var(--border)] bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">
              <span>Đơn vị</span>
              <span>% đạt so với kế hoạch</span>
              <span className="text-center">Tổng</span>
              <span className="text-center text-[#287342]">HT</span>
              <span className="text-center text-[#0f66c3]">ĐTH</span>
              <span className="text-center text-[#be2d2d]">Trễ</span>
              <span className="text-center text-slate-500">CTK</span>
            </div>
            {rows.map((row) => (
              <ManagementRow isSuccess={isSuccess} key={row.key} row={row} />
            ))}
          </div>
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
  const barColor = row.overdue > 0 ? "#c92f2f" : isSuccess ? "#2f8238" : "#f07800";

  return (
    <div className="grid grid-cols-[minmax(180px,1.2fr)_minmax(210px,1fr)_64px_64px_64px_64px_64px] items-center border-b border-slate-100 px-4 py-3 text-sm last:border-b-0 even:bg-[#fbfaf7]">
      <div className="min-w-0">
        <p className="truncate text-base font-extrabold text-[var(--foreground)]">
          {row.shortName}
        </p>
        <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{row.context}</p>
        <p className="mt-1 text-xs text-slate-500">
          {row.submitted}/{row.members} thành viên có báo cáo
        </p>
      </div>

      <div className="min-w-0 pr-3">
        <div className="flex items-center gap-3">
          <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full"
              style={{ backgroundColor: barColor, width: `${Math.min(row.percent, 100)}%` }}
            />
          </div>
          <span
            className="w-14 text-right text-sm font-extrabold"
            style={{ color: barColor }}
          >
            {row.percent}%
          </span>
        </div>
      </div>

      <CountCell value={row.tasks} />
      <CountCell className="text-[#287342]" value={row.completed} />
      <CountCell className="text-[#0f66c3]" value={row.inProgress} />
      <CountCell className={row.overdue > 0 ? "text-[#be2d2d]" : "text-slate-400"} value={row.overdue} />
      <CountCell className="text-slate-500" value={row.notStarted} />
    </div>
  );
};

const CountCell = ({
  className = "text-[var(--foreground)]",
  value
}: {
  readonly className?: string;
  readonly value: number;
}): React.ReactElement => (
  <span className={`text-center text-base font-extrabold ${className}`}>
    {formatNumber(value)}
  </span>
);

const StatusLegend = (): React.ReactElement => (
  <section className="soft-panel flex flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 py-4 text-sm">
    <span className="font-bold text-[#287342]">HT</span>
    <span className="text-[var(--text-muted)]">Hoàn thành</span>
    <span className="font-bold text-[#0f66c3]">ĐTH</span>
    <span className="text-[var(--text-muted)]">Đang thực hiện</span>
    <span className="font-bold text-[#be2d2d]">Trễ</span>
    <span className="text-[var(--text-muted)]">Trễ tiến độ</span>
    <span className="font-bold text-slate-500">CTK</span>
    <span className="text-[var(--text-muted)]">Chưa triển khai</span>
  </section>
);

const buildOrgUnitRows = (data: AppData, level: OrgUnitLevel): OrgUnitRow[] => {
  const units = new Map<
    string,
    {
      readonly groupName: string;
      readonly subgroupName: string;
      readonly profiles: Set<string>;
      readonly submitted: Set<string>;
      readonly tasks: Task[];
    }
  >();

  data.profiles
    .filter((profile) => profile.role === "worker")
    .forEach((profile) => {
      const groupName = profile.orgGroup || "Chưa phân nhóm";
      const subgroupName = profile.subgroup || "Chưa phân nhóm";
      const key = level === "group" ? groupName : `${groupName}::${subgroupName}`;
      const unit =
        units.get(key) ??
        {
          groupName,
          subgroupName,
          profiles: new Set<string>(),
          submitted: new Set<string>(),
          tasks: []
        };

      unit.profiles.add(profile.id);
      units.set(key, unit);
    });

  const profileById = new Map(data.profiles.map((profile) => [profile.id, profile]));
  data.tasks.forEach((task) => {
    if (!task.assignedTo) return;
    const profile = profileById.get(task.assignedTo);
    if (!profile) return;

    const groupName = profile.orgGroup || "Chưa phân nhóm";
    const subgroupName = profile.subgroup || "Chưa phân nhóm";
    const key = level === "group" ? groupName : `${groupName}::${subgroupName}`;
    const unit =
      units.get(key) ??
      {
        groupName,
        subgroupName,
        profiles: new Set<string>(),
        submitted: new Set<string>(),
        tasks: []
      };

    unit.profiles.add(profile.id);
    unit.tasks.push(task);
    units.set(key, unit);
  });

  data.progress
    .filter((record) => record.reportDate === DEFAULT_REPORT_DATE)
    .forEach((record) => {
      const profile = profileById.get(record.userId);
      if (!profile) return;

      const groupName = profile.orgGroup || "Chưa phân nhóm";
      const subgroupName = profile.subgroup || "Chưa phân nhóm";
      const key = level === "group" ? groupName : `${groupName}::${subgroupName}`;
      const unit = units.get(key);
      unit?.submitted.add(record.userId);
    });

  return Array.from(units.entries())
    .map(([key, unit]) => {
      const activeTasks = unit.tasks.filter((task) => !task.isCancelled);
      const percentSum = activeTasks.reduce(
        (sum, task) => sum + getTaskPercent(data.progress, task.id, DEFAULT_REPORT_DATE),
        0
      );
      const completed = activeTasks.filter(
        (task) => getTaskPercent(data.progress, task.id, DEFAULT_REPORT_DATE) === 100
      ).length;
      const inProgress = activeTasks.filter((task) => {
        const percent = getTaskPercent(data.progress, task.id, DEFAULT_REPORT_DATE);
        return percent > 0 && percent < 100;
      }).length;
      const notStarted = activeTasks.filter(
        (task) => getTaskPercent(data.progress, task.id, DEFAULT_REPORT_DATE) === 0
      ).length;
      const overdue = activeTasks.filter((task) => {
        const percent = getTaskPercent(data.progress, task.id, DEFAULT_REPORT_DATE);
        return task.finishDate < DEFAULT_REPORT_DATE && percent < 100;
      }).length;
      const cancelled = unit.tasks.filter((task) => task.isCancelled).length;
      const percent =
        activeTasks.length === 0 ? 0 : Math.round(percentSum / activeTasks.length);
      const shortName =
        level === "group" ? compactGroupName(unit.groupName) : compactSubgroupName(unit.subgroupName);

      return {
        key,
        name:
          level === "group"
            ? unit.groupName
            : `${unit.subgroupName} - ${unit.groupName}`,
        shortName,
        context:
          level === "group"
            ? `${unit.profiles.size} thành viên · ${unit.tasks.length} WorkOrder`
            : unit.groupName,
        members: unit.profiles.size,
        submitted: unit.submitted.size,
        tasks: activeTasks.length,
        completed,
        inProgress,
        notStarted,
        overdue,
        cancelled,
        percent
      };
    })
    .sort((left, right) => right.tasks - left.tasks);
};

const compactGroupName = (name: string): string => {
  return name
    .replace(/^Nhóm\s+/i, "")
    .replace("Thiết bị", "TB")
    .replace("Điều khiển", "ĐK")
    .replace("Hệ thống", "HT")
    .replace("Hậu cần và Tổng hợp", "Hậu cần");
};

const compactSubgroupName = (name: string): string => {
  return name
    .replace(/^Phân nhóm\s+/i, "PN")
    .replace(/^P\.Nhóm\s+/i, "PN")
    .replace(" - ", " · ");
};

const toneBorder = (tone: Tone): string => {
  if (tone === "success") return "border-[#2f8238]";
  if (tone === "warning") return "border-[#f07800]";
  if (tone === "danger") return "border-[#d12f2f]";
  return "border-[#1587e8]";
};

const toneText = (tone: Tone): string => {
  if (tone === "success") return "text-[#2f8238]";
  if (tone === "warning") return "text-[#e9560a]";
  if (tone === "danger") return "text-[#c92f2f]";
  return "text-[var(--foreground)]";
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat("vi-VN").format(value);
};

export default AdminPage;
