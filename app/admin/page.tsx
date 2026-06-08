"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { KpiCards } from "@/components/admin/KpiCards";
import { ProgressCharts } from "@/components/admin/ProgressCharts";
import { SnapshotPanel } from "@/components/admin/SnapshotPanel";
import { TasksTable } from "@/components/admin/TasksTable";
import { DEFAULT_REPORT_DATE, formatViDate } from "@/lib/date";
import { buildPhaseOneDashboard } from "@/lib/dashboard";
import { calculateMetrics } from "@/lib/progress";
import { useAppData } from "@/hooks/useAppData";

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

  const metrics = calculateMetrics(data, DEFAULT_REPORT_DATE);
  const dashboard = buildPhaseOneDashboard(data, DEFAULT_REPORT_DATE);

  return (
    <AdminShell
      account={currentAccount}
      onLogout={logout}
      subtitle={`Ngày báo cáo: ${formatViDate(DEFAULT_REPORT_DATE)}`}
      title="Tiến độ BDTT"
    >
      <KpiCards metrics={metrics} />
      <SnapshotPanel snapshots={data.dailySnapshots} />
      <ProgressCharts dashboard={dashboard} reportDateLabel={formatViDate(DEFAULT_REPORT_DATE)} />
      <TasksTable data={data} />
    </AdminShell>
  );
};

export default AdminPage;
