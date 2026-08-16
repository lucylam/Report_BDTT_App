"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { TasksTable } from "@/components/admin/TasksTable";
import { WorkerStatusTable } from "@/components/admin/WorkerStatusTable";
import { AbnormalityBoard } from "@/components/admin/workorder/AbnormalityBoard";
import { DataIssueQueue } from "@/components/admin/workorder/DataIssueQueue";
import { WorkOrderTabs, type WorkOrderTab } from "@/components/admin/workorder/WorkOrderTabs";
import { Icon } from "@/components/ui";
import { useAppData } from "@/hooks/useAppData";
import { canManageBdttTasks, getOrgScopeLabel, getScopedAppData } from "@/lib/permissions";

const validTabs: readonly WorkOrderTab[] = ["tasks", "personnel", "abnormalities", "issues"];

const AdminTasksContent = (): React.ReactElement => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentAccount, data, logout, refreshRemoteData } = useAppData();
  const requestedTab = searchParams.get("tab") as WorkOrderTab | null;
  const initialQuery = searchParams.get("query") ?? "";
  const activeTab = requestedTab && validTabs.includes(requestedTab) ? requestedTab : "tasks";

  useEffect(() => {
    if (!data) return;
    if (!currentAccount) router.replace("/login");
    if (currentAccount?.mustChangePassword) router.replace("/change-password");
  }, [currentAccount, data, router]);

  if (!currentAccount || currentAccount.mustChangePassword) {
    return <main className="min-h-dvh p-6"><p className="text-sm text-[var(--text-muted)]">Đang kiểm tra đăng nhập...</p></main>;
  }
  if (currentAccount.role !== "admin") {
    return <main className="min-h-dvh p-6"><Link className="focus-ring text-sm font-semibold text-[var(--primary)]" href="/worker">Về trang công việc</Link></main>;
  }

  const scopedData = data ? getScopedAppData(data, currentAccount) : null;
  const canManage = canManageBdttTasks(currentAccount);

  return (
    <AdminShell
      account={currentAccount}
      onLogout={logout}
      subtitle={`Tổ Thiết bị Đo lường & Điều khiển · ${getOrgScopeLabel(currentAccount)}`}
      title="WorkOrder"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <WorkOrderTabs active={activeTab} />
        <a
          className="focus-ring pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-field)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] no-underline shadow-[var(--shadow-soft-sm)] hover:bg-[var(--surface-muted)]"
          href="/api/exports/tasks"
        >
          <Icon name="download" /> Xuất Excel theo phạm vi
        </a>
      </div>
      {!scopedData ? (
        <p className="text-sm text-[var(--text-muted)]">Đang tải dữ liệu...</p>
      ) : activeTab === "personnel" ? (
        <WorkerStatusTable data={scopedData} />
      ) : activeTab === "abnormalities" ? (
        <AbnormalityBoard canManage={canManage} data={scopedData} />
      ) : activeTab === "issues" ? (
        canManage ? <DataIssueQueue data={scopedData} /> : <p className="text-sm text-[var(--text-muted)]">Bạn không có quyền xử lý báo sai dữ liệu.</p>
      ) : (
        <TasksTable
          canManage={canManage}
          data={scopedData}
          initialQuery={initialQuery}
          limit={100}
          onDataChanged={refreshRemoteData}
        />
      )}
    </AdminShell>
  );
};

const AdminTasksPage = (): React.ReactElement => (
  <Suspense fallback={<main className="min-h-dvh p-6"><p className="text-sm text-[var(--text-muted)]">Đang tải WorkOrder...</p></main>}>
    <AdminTasksContent />
  </Suspense>
);

export default AdminTasksPage;
