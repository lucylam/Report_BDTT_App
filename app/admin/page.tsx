"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { AdminShell } from "@/components/admin/AdminShell";
import { KpiCards } from "@/components/admin/KpiCards";
import { SnapshotPanel } from "@/components/admin/SnapshotPanel";
import { DEFAULT_REPORT_DATE, formatViDate } from "@/lib/date";
import { BDTT_2026_SUBTITLE } from "@/lib/org2026";
import { getOrgScopeLabel, getScopedAppData, hasFullOrgScope } from "@/lib/permissions";
import { calculateMetrics, getTaskPercent } from "@/lib/progress";
import { useAppData } from "@/hooks/useAppData";
import type { AppData, DashboardMetrics, Task } from "@/types/domain";

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
          <h1 className="text-xl font-semibold">Không có quyền admin</h1>
          <p className="mt-2 text-sm text-slate-600">
            Tài khoản worker chỉ được vào màn hình Việc của tôi.
          </p>
          <Link
            className="focus-ring pressable mt-4 inline-flex min-h-11 items-center rounded-2xl bg-[var(--foreground)] px-4 text-sm font-semibold text-white"
            href="/worker"
          >
            Về worker
          </Link>
        </section>
      </main>
    );
  }

  const scopedData = getScopedAppData(data, currentAccount);
  const scopeLabel = getOrgScopeLabel(currentAccount);
  const canViewDashboard = hasFullOrgScope(currentAccount);
  const metrics = calculateMetrics(scopedData, DEFAULT_REPORT_DATE);

  if (!canViewDashboard) {
    return (
      <AdminShell
        account={currentAccount}
        onLogout={logout}
        subtitle={`${BDTT_2026_SUBTITLE} · ${scopeLabel}`}
        title="Dashboard nhóm"
      >
        <TeamDashboard data={scopedData} metrics={metrics} />
      </AdminShell>
    );
  }

  return (
    <AdminShell
      account={currentAccount}
      onLogout={logout}
      subtitle={`${BDTT_2026_SUBTITLE} · ${scopeLabel} · Ngày báo cáo: ${formatViDate(DEFAULT_REPORT_DATE)}`}
      title="Dashboard giám sát"
    >
      <KpiCards metrics={metrics} />
      <OrganizationDashboard data={scopedData} />
      <SupervisorFocusPanel data={scopedData} metrics={metrics} />
      <SnapshotPanel snapshots={scopedData.dailySnapshots} />
    </AdminShell>
  );
};

const chartColors = {
  completed: "#287342",
  inProgress: "#a86512",
  notStarted: "#94a3b8",
  cancelled: "#a93a3a",
  submitted: "#0f8b6d",
  missing: "#b83b3b"
} as const;

const TeamDashboard = ({
  data,
  metrics
}: {
  readonly data: AppData;
  readonly metrics: DashboardMetrics;
}): React.ReactElement => {
  const memberRows = buildMemberDashboardRows(data);
  const submittedMembers = memberRows.filter((row) => row.submitted).length;
  const missingMembers = memberRows.length - submittedMembers;
  const taskStatusRows = [
    { name: "Hoàn thành", value: metrics.completed, color: chartColors.completed },
    { name: "Đang làm", value: metrics.inProgress, color: chartColors.inProgress },
    { name: "Chưa làm", value: metrics.notStarted, color: chartColors.notStarted },
    { name: "Cancel", value: metrics.cancelled, color: chartColors.cancelled }
  ];
  const reportRows = [
    { name: "Đã gửi", value: submittedMembers, color: chartColors.submitted },
    { name: "Chưa gửi", value: missingMembers, color: chartColors.missing }
  ];
  const subgroupRows = buildOrgUnitRows(data, "subgroup");

  return (
    <section className="grid min-w-0 max-w-full gap-4 overflow-x-hidden">
      <section className="soft-panel min-w-0 max-w-full p-4 lg:p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--primary-strong)]">
          Dashboard vận hành nhóm
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Tiến độ tổng và tình hình báo cáo thành viên
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
          Dashboard chỉ tổng hợp dữ liệu trong phạm vi phụ trách. Chi tiết từng người và từng WorkOrder nằm ở hai tab riêng.
        </p>
      </section>

      <KpiCards metrics={metrics} />

      <section className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <ChartCard
          subtitle={`${metrics.overallPercent}% trung bình, ${metrics.totalTasks} WorkOrder đang theo dõi`}
          title="Tiến độ tổng"
        >
          <div className="h-[340px]">
            <ResponsiveContainer height="100%" width="100%">
              <PieChart>
                <Pie
                  data={taskStatusRows}
                  dataKey="value"
                  innerRadius={72}
                  nameKey="name"
                  outerRadius={118}
                  paddingAngle={2}
                >
                  {taskStatusRows.map((row) => (
                    <Cell fill={row.color} key={row.name} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [formatNumber(Number(value)), "WorkOrder"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          subtitle={`${submittedMembers}/${memberRows.length} thành viên đã có cập nhật trong ngày ${formatViDate(DEFAULT_REPORT_DATE)}`}
          title="Tình hình báo cáo"
        >
          <div className="h-[340px]">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={reportRows} margin={{ left: 10, right: 10, top: 20 }}>
                <CartesianGrid stroke="rgba(24,24,24,0.06)" strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(value) => [formatNumber(Number(value)), "Thành viên"]} />
                <Bar dataKey="value" radius={[16, 16, 0, 0]}>
                  {reportRows.map((row) => (
                    <Cell fill={row.color} key={row.name} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </section>

      <ChartCard
        subtitle="Mỗi phân nhóm được tính theo thành viên và WorkOrder đã map đúng profile trong web"
        title="Tiến độ theo phân nhóm"
      >
        <div className="h-[460px]">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart
              data={subgroupRows.slice(0, 12)}
              layout="vertical"
              margin={{ left: 12, right: 24 }}
            >
              <CartesianGrid stroke="rgba(24,24,24,0.06)" strokeDasharray="3 3" />
              <XAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} type="number" />
              <YAxis dataKey="shortName" tick={{ fontSize: 12 }} type="category" width={150} />
              <Tooltip content={<OrgUnitTooltip />} />
              <Bar dataKey="percent" fill="#0f8b6d" radius={[0, 12, 12, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <SubgroupSummaryGrid rows={subgroupRows} />

      <ChartCard
        subtitle="Trung bình % hoàn thành theo WorkOrder được phân công cho từng thành viên"
        title="Tiến độ theo thành viên"
      >
        <div className="h-[520px]">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart
              data={memberRows.slice(0, 16)}
              layout="vertical"
              margin={{ left: 12, right: 24 }}
            >
              <CartesianGrid stroke="rgba(24,24,24,0.06)" strokeDasharray="3 3" />
              <XAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} type="number" />
              <YAxis dataKey="name" tick={{ fontSize: 12 }} type="category" width={150} />
              <Tooltip formatter={(value) => [`${value}%`, "Tiến độ"]} />
              <Bar dataKey="percent" fill="#0f8b6d" radius={[0, 12, 12, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </section>
  );
};

type OrgUnitLevel = "group" | "subgroup";

interface OrgUnitRow {
  readonly key: string;
  readonly name: string;
  readonly shortName: string;
  readonly groupName: string;
  readonly subgroupName: string;
  readonly members: number;
  readonly submitted: number;
  readonly tasks: number;
  readonly completed: number;
  readonly inProgress: number;
  readonly notStarted: number;
  readonly cancelled: number;
  readonly percent: number;
}

const buildOrgUnitRows = (data: AppData, level: OrgUnitLevel): OrgUnitRow[] => {
  const units = new Map<
    string,
    {
      groupName: string;
      subgroupName: string;
      members: Set<string>;
      submitted: Set<string>;
      tasks: Task[];
    }
  >();

  data.profiles
    .filter((profile) => profile.role === "worker" && !profile.isPlaceholder)
    .forEach((profile) => {
      const groupName = profile.orgGroup || "Chưa phân nhóm";
      const subgroupName = profile.subgroup || "Chưa phân nhóm";
      const key = level === "group" ? groupName : `${groupName}::${subgroupName}`;
      const unit =
        units.get(key) ??
        {
          groupName,
          subgroupName,
          members: new Set<string>(),
          submitted: new Set<string>(),
          tasks: []
        };
      unit.members.add(profile.id);
      if (
        data.progress.some(
          (record) =>
            record.userId === profile.id && record.reportDate === DEFAULT_REPORT_DATE
        )
      ) {
        unit.submitted.add(profile.id);
      }
      units.set(key, unit);
    });

  const profileById = new Map(data.profiles.map((profile) => [profile.id, profile]));
  data.tasks.forEach((task) => {
    if (!task.assignedTo) return;
    const profile = profileById.get(task.assignedTo);
    if (!profile || profile.isPlaceholder) return;
    const groupName = profile.orgGroup || "Chưa phân nhóm";
    const subgroupName = profile.subgroup || "Chưa phân nhóm";
    const key = level === "group" ? groupName : `${groupName}::${subgroupName}`;
    const unit =
      units.get(key) ??
      {
        groupName,
        subgroupName,
        members: new Set<string>(),
        submitted: new Set<string>(),
        tasks: []
      };
    unit.tasks.push(task);
    units.set(key, unit);
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
      const cancelled = unit.tasks.filter((task) => task.isCancelled).length;
      const shortName =
        level === "group"
          ? unit.groupName
          : `${unit.subgroupName} - ${unit.groupName}`;

      return {
        key,
        name: level === "group" ? unit.groupName : `${unit.groupName} / ${unit.subgroupName}`,
        shortName,
        groupName: unit.groupName,
        subgroupName: unit.subgroupName,
        members: unit.members.size,
        submitted: unit.submitted.size,
        tasks: activeTasks.length,
        completed,
        inProgress,
        notStarted,
        cancelled,
        percent: activeTasks.length === 0 ? 0 : Math.round(percentSum / activeTasks.length)
      };
    })
    .sort(
      (left, right) =>
        right.tasks - left.tasks ||
        left.percent - right.percent ||
        left.shortName.localeCompare(right.shortName)
    );
};

const OrganizationDashboard = ({ data }: { readonly data: AppData }): React.ReactElement => {
  const groupRows = buildOrgUnitRows(data, "group");
  const subgroupRows = buildOrgUnitRows(data, "subgroup");
  const riskiestSubgroups = [...subgroupRows]
    .sort(
      (left, right) =>
        right.members - right.submitted - (left.members - left.submitted) ||
        left.percent - right.percent ||
        right.tasks - left.tasks
    )
    .slice(0, 8);

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
      <ChartCard
        subtitle="Tổ trưởng/vinhlpp xem theo nhóm chức năng; click sang WorkOrder hoặc Thành viên để xử lý chi tiết."
        title="Tiến độ theo nhóm"
      >
        <div className="h-[420px]">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={groupRows} layout="vertical" margin={{ left: 12, right: 24 }}>
              <CartesianGrid stroke="rgba(24,24,24,0.06)" strokeDasharray="3 3" />
              <XAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} type="number" />
              <YAxis dataKey="shortName" tick={{ fontSize: 12 }} type="category" width={160} />
              <Tooltip content={<OrgUnitTooltip />} />
              <Bar dataKey="percent" fill="#0f8b6d" radius={[0, 12, 12, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <section className="soft-card p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--primary-strong)]">
          Phân nhóm cần chú ý
        </p>
        <h2 className="mt-2 text-lg font-semibold">Báo cáo thiếu hoặc tiến độ thấp</h2>
        <div className="mt-4 space-y-3">
          {riskiestSubgroups.map((row) => (
            <OrgUnitRiskRow row={row} key={row.key} />
          ))}
        </div>
      </section>

      <section className="soft-panel p-5 xl:col-span-2">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--primary-strong)]">
            Bản đồ nhóm / phân nhóm
          </p>
          <h2 className="text-xl font-semibold">Theo dõi gọn theo từng tầng</h2>
        </div>
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {groupRows.map((group) => (
            <OrgGroupCard
              group={group}
              key={group.key}
              subgroups={subgroupRows.filter((row) => row.groupName === group.groupName)}
            />
          ))}
        </div>
      </section>
    </section>
  );
};

const SubgroupSummaryGrid = ({ rows }: { readonly rows: readonly OrgUnitRow[] }): React.ReactElement => {
  return (
    <section className="soft-panel p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--primary-strong)]">
        Phân nhóm
      </p>
      <h2 className="mt-2 text-xl font-semibold">Các PN trong phạm vi quản lý</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <OrgUnitRiskRow row={row} key={row.key} />
        ))}
      </div>
    </section>
  );
};

const OrgGroupCard = ({
  group,
  subgroups
}: {
  readonly group: OrgUnitRow;
  readonly subgroups: readonly OrgUnitRow[];
}): React.ReactElement => {
  return (
    <article className="rounded-[1.5rem] bg-white/82 p-4 ring-1 ring-[var(--border)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-[var(--primary-strong)]">
            {group.shortName}
          </h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {group.members} thành viên · {group.tasks} WorkOrder
          </p>
        </div>
        <span className="rounded-full bg-[var(--primary-strong)] px-3 py-1 text-sm font-bold text-white">
          {group.percent}%
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--primary-pale)]">
        <div
          className="h-full rounded-full bg-[var(--primary-strong)]"
          style={{ width: `${Math.min(group.percent, 100)}%` }}
        />
      </div>
      <div className="mt-3 grid gap-2">
        {subgroups.slice(0, 4).map((subgroup) => (
          <div
            className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 text-sm"
            key={subgroup.key}
          >
            <span className="truncate font-semibold text-slate-800">
              {subgroup.subgroupName}
            </span>
            <span className="text-xs font-semibold text-[var(--text-muted)]">
              {subgroup.submitted}/{subgroup.members} gửi
            </span>
            <span className="rounded-full bg-[var(--primary-pale)] px-2 py-1 text-xs font-bold text-[var(--primary-strong)]">
              {subgroup.percent}%
            </span>
          </div>
        ))}
      </div>
    </article>
  );
};

const OrgUnitRiskRow = ({ row }: { readonly row: OrgUnitRow }): React.ReactElement => {
  const missing = Math.max(row.members - row.submitted, 0);
  const isRisk = missing > 0 || row.percent < 50;
  return (
    <article
      className={`rounded-[1.25rem] p-4 ring-1 ${
        isRisk
          ? "bg-[var(--danger-soft)] text-[var(--danger)] ring-[var(--danger)]"
          : "bg-white/82 text-slate-900 ring-[var(--border)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold">{row.shortName}</p>
          <p className="mt-1 text-xs font-semibold opacity-75">
            {row.tasks} WorkOrder · {row.members} thành viên
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-white/72 px-3 py-1 text-sm font-bold">
          {row.percent}%
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-bold">
        <span className="rounded-full bg-white/72 px-2 py-1">
          {row.submitted}/{row.members} gửi
        </span>
        <span className="rounded-full bg-white/72 px-2 py-1">{row.completed} xong</span>
        <span className="rounded-full bg-white/72 px-2 py-1">{missing} thiếu</span>
      </div>
    </article>
  );
};

const OrgUnitTooltip = ({
  active,
  payload
}: {
  readonly active?: boolean;
  readonly payload?: Array<{ readonly payload?: OrgUnitRow }>;
}): React.ReactElement | null => {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/95 p-3 text-sm shadow-md">
      <p className="font-bold text-slate-900">{row.name}</p>
      <p className="mt-1 text-[var(--primary-strong)]">Tiến độ: {row.percent}%</p>
      <p>WorkOrder: {row.tasks}</p>
      <p>Báo cáo: {row.submitted}/{row.members} thành viên</p>
      <p>Cancel: {row.cancelled}</p>
    </div>
  );
};

const buildMemberDashboardRows = (data: AppData): Array<{
  readonly name: string;
  readonly assigned: number;
  readonly percent: number;
  readonly submitted: boolean;
}> => {
  return data.profiles
    .filter((profile) => profile.role === "worker" && !profile.isPlaceholder)
    .map((profile) => {
      const tasks = data.tasks.filter(
        (task) => task.assignedTo === profile.id && !task.isCancelled
      );
      const percentSum = tasks.reduce(
        (sum, task) => sum + getTaskPercent(data.progress, task.id, DEFAULT_REPORT_DATE),
        0
      );
      return {
        name: profile.fullName,
        assigned: tasks.length,
        percent: tasks.length === 0 ? 0 : Math.round(percentSum / tasks.length),
        submitted: data.progress.some(
          (record) =>
            record.userId === profile.id &&
            record.reportDate === DEFAULT_REPORT_DATE
        )
      };
    })
    .sort((left, right) => right.assigned - left.assigned || right.percent - left.percent);
};

const ChartCard = ({
  children,
  subtitle,
  title
}: {
  readonly children: React.ReactNode;
  readonly subtitle: string;
  readonly title: string;
}): React.ReactElement => {
  return (
    <section className="rounded-[2rem] border border-white/80 bg-white/82 p-5 shadow-[var(--shadow-soft-sm)] backdrop-blur-xl">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">{subtitle}</p>
      {children}
    </section>
  );
};

const SupervisorFocusPanel = ({
  data,
  metrics
}: {
  readonly data: AppData;
  readonly metrics: DashboardMetrics;
}): React.ReactElement => {
  const activeTasks = data.tasks.filter((task) => !task.isCancelled);
  const p1Open = activeTasks.filter(
    (task) =>
      task.priority === 1 &&
      getTaskPercent(data.progress, task.id, DEFAULT_REPORT_DATE) < 100
  );
  const overdue = activeTasks.filter(
    (task) =>
      task.finishDate < DEFAULT_REPORT_DATE &&
      getTaskPercent(data.progress, task.id, DEFAULT_REPORT_DATE) < 100
  );
  const topLead = getTopRiskGroup(activeTasks, "nhomTruong");
  const topUnit = getTopRiskGroup(activeTasks, "donVi");
  const actions = [
    {
      label: "Cần nhắc worker",
      value: metrics.unsubmittedWorkers,
      helper: "Người chưa có báo cáo hôm nay",
      href: "/admin/personnel",
      tone: "danger"
    },
    {
      label: "P1 chưa xong",
      value: metrics.priorityOpen,
      helper: `${p1Open.length} hạng mục ưu tiên cao`,
      href: "/admin/tasks",
      tone: "danger"
    },
    {
      label: "Quá hạn",
      value: metrics.overdue,
      helper: `${overdue.length} finish date đã qua`,
      href: "/admin/tasks",
      tone: "warning"
    },
    {
      label: "Cancel",
      value: metrics.cancelled,
      helper: "Hạng mục worker đã báo hủy",
      href: "/admin/tasks",
      tone: "neutral"
    }
  ] as const;

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
      <div className="soft-panel p-4 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--primary-strong)]">
              Trọng tâm xử lý
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Việc cần xử lý trước
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
              Ưu tiên nhắc báo cáo, P1, quá hạn và hạng mục cancel trước khi xem chart chi tiết.
            </p>
          </div>
          <Link
            className="focus-ring pressable inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--primary-strong)] px-5 text-sm font-bold text-white shadow-[var(--shadow-soft-sm)]"
            href="/admin/tasks"
          >
            Mở danh sách hạng mục
          </Link>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {actions.map((action) => (
            <Link
              className={`focus-ring pressable rounded-[1.5rem] border p-3 shadow-[var(--shadow-soft-sm)] sm:p-4 ${actionTone(action.tone)}`}
              href={action.href}
              key={action.label}
            >
              <p className="text-xs font-bold uppercase opacity-75">{action.label}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{action.value}</p>
              <p className="mt-1 text-xs font-semibold leading-5 opacity-75">{action.helper}</p>
            </Link>
          ))}
        </div>
      </div>

      <aside className="soft-card p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--primary-strong)]">
          Điểm nóng dữ liệu
        </p>
        <div className="mt-4 space-y-3">
          <RiskRow label="Nhóm trưởng nhiều việc nhất" value={topLead.name} count={topLead.count} />
          <RiskRow label="Đơn vị nhiều việc nhất" value={topUnit.name} count={topUnit.count} />
          <RiskRow label="Đang thực hiện" value="0 < % < 100" count={metrics.inProgress} />
        </div>
      </aside>
    </section>
  );
};

const getTopRiskGroup = (
  tasks: readonly Task[],
  key: "nhomTruong" | "donVi"
): { readonly name: string; readonly count: number } => {
  const counts = new Map<string, number>();
  tasks.forEach((task) => {
    const name = task[key] || "Chưa phân loại";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  });
  return (
    Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count)[0] ?? {
      name: "Không có dữ liệu",
      count: 0
    }
  );
};

const actionTone = (tone: "danger" | "warning" | "neutral"): string => {
  if (tone === "danger") {
    return "border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]";
  }
  if (tone === "warning") {
    return "border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--warning)]";
  }
  return "border-white/80 bg-white/86 text-slate-900";
};

const RiskRow = ({
  count,
  label,
  value
}: {
  readonly count: number;
  readonly label: string;
  readonly value: string;
}): React.ReactElement => {
  return (
    <div className="rounded-[1.25rem] bg-white/80 p-4 ring-1 ring-[var(--border)]">
      <p className="text-xs font-bold uppercase text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 line-clamp-2 font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-sm font-bold text-[var(--primary-strong)]">{count} hạng mục</p>
    </div>
  );
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value);
};

export default AdminPage;
