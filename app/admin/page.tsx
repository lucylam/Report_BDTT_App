"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { KpiCards } from "@/components/admin/KpiCards";
import { ProgressCharts } from "@/components/admin/ProgressCharts";
import { SnapshotPanel } from "@/components/admin/SnapshotPanel";
import { TasksTable } from "@/components/admin/TasksTable";
import { WorkerStatusTable } from "@/components/admin/WorkerStatusTable";
import { DEFAULT_REPORT_DATE, formatViDate } from "@/lib/date";
import { buildPhaseOneDashboard } from "@/lib/dashboard";
import { BDTT_2026_SUBTITLE, BDTT_2026_TITLE } from "@/lib/org2026";
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

  if (!canViewDashboard) {
    return (
      <AdminShell
        account={currentAccount}
        onLogout={logout}
        subtitle={`${BDTT_2026_SUBTITLE} · ${scopeLabel}`}
        title="Theo dõi nhóm"
      >
        <TeamOperationsWorkspace data={scopedData} />
      </AdminShell>
    );
  }

  const metrics = calculateMetrics(scopedData, DEFAULT_REPORT_DATE);
  const dashboard = buildPhaseOneDashboard(scopedData, DEFAULT_REPORT_DATE);

  return (
    <AdminShell
      account={currentAccount}
      onLogout={logout}
      subtitle={`${BDTT_2026_SUBTITLE} · ${scopeLabel} · Ngày báo cáo: ${formatViDate(DEFAULT_REPORT_DATE)}`}
      title={BDTT_2026_TITLE}
    >
      <KpiCards metrics={metrics} />
      <SupervisorFocusPanel data={scopedData} metrics={metrics} />
      <SnapshotPanel snapshots={scopedData.dailySnapshots} />
      <TasksTable data={scopedData} limit={12} />
      <ProgressCharts dashboard={dashboard} reportDateLabel={formatViDate(DEFAULT_REPORT_DATE)} />
    </AdminShell>
  );
};

const TeamOperationsWorkspace = ({
  data
}: {
  readonly data: AppData;
}): React.ReactElement => {
  return (
    <section className="grid min-w-0 max-w-full gap-4 overflow-x-hidden">
      <section className="soft-panel min-w-0 max-w-full p-4 lg:p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--primary-strong)]">
          Theo dõi vận hành nhóm
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Tình trạng báo cáo, tiến độ thực hiện và task thành viên
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
          Màn hình này chỉ hiển thị dữ liệu trong phạm vi phụ trách của tài khoản hiện tại.
        </p>
      </section>

      <WorkerStatusTable data={data} />
      <TasksTable data={data} limit={25} />
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

export default AdminPage;
