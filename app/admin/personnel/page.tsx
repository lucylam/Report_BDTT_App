"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { WorkerStatusTable } from "@/components/admin/WorkerStatusTable";
import { useAppData } from "@/hooks/useAppData";

const AdminPersonnelPage = (): React.ReactElement => {
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

  return (
    <AdminShell
      account={currentAccount}
      onLogout={logout}
      subtitle="Theo dõi trạng thái báo cáo, tiến độ và phân bổ hạng mục theo từng worker."
      title="Nhân sự"
    >
      {data ? (
        <WorkerStatusTable data={data} />
      ) : (
        <p className="text-sm text-slate-600">Đang tải dữ liệu nhân sự...</p>
      )}
    </AdminShell>
  );
};

export default AdminPersonnelPage;
