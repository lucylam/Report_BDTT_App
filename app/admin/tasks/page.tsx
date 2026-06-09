"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { TasksTable } from "@/components/admin/TasksTable";
import { useAppData } from "@/hooks/useAppData";
import { BDTT_2026_SUBTITLE } from "@/lib/org2026";
import { getOrgScopeLabel, getScopedAppData } from "@/lib/permissions";

const AdminTasksPage = (): React.ReactElement => {
  const router = useRouter();
  const { currentAccount, data, logout } = useAppData();

  useEffect(() => {
    if (!data) return;
    if (!currentAccount) router.replace("/login");
    if (currentAccount?.mustChangePassword) router.replace("/change-password");
  }, [currentAccount, data, router]);

  if (!currentAccount || currentAccount.mustChangePassword) {
    return (
      <main className="min-h-dvh p-6">
        <p className="text-sm text-slate-600">Đang kiểm tra đăng nhập...</p>
      </main>
    );
  }

  if (currentAccount.role !== "admin") {
    return (
      <main className="min-h-dvh p-6">
        <Link className="focus-ring text-sm font-semibold text-[var(--primary)]" href="/worker">
          Về worker
        </Link>
      </main>
    );
  }

  const scopedData = data ? getScopedAppData(data, currentAccount) : null;
  const scopeLabel = getOrgScopeLabel(currentAccount);

  return (
    <AdminShell
      account={currentAccount}
      onLogout={logout}
      subtitle={`${BDTT_2026_SUBTITLE} · ${scopeLabel}`}
      title="Tất cả hạng mục"
    >
      {scopedData ? (
        <TasksTable data={scopedData} limit={100} />
      ) : (
        <p className="text-sm text-slate-600">Đang tải dữ liệu...</p>
      )}
    </AdminShell>
  );
};

export default AdminTasksPage;
