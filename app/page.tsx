"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CompanyBrand } from "@/components/CompanyBrand";
import { useAppData } from "@/hooks/useAppData";

const HomePage = (): React.ReactElement => {
  const router = useRouter();
  const { currentAccount, data } = useAppData();

  useEffect(() => {
    if (!data || !currentAccount) return;
    router.replace(currentAccount.role === "admin" ? "/admin" : "/worker");
  }, [currentAccount, data, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-6">
      <section className="app-shell w-full max-w-5xl overflow-hidden rounded-[var(--radius-panel)] p-4 md:grid md:grid-cols-[1.05fr_0.95fr] md:p-5">
        <div className="rounded-[var(--radius-card)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft-sm)] md:p-7">
          <CompanyBrand className="rounded-[var(--radius-field)] bg-[var(--surface-muted)] p-4 ring-1 ring-[var(--border)]" variant="full" />
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase text-[var(--primary-strong)]">
              Tổ Thiết bị Đo lường & Điều khiển
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-normal text-[var(--foreground)] md:text-5xl">
              Tiến độ BDTT 2026
            </h1>
            <p className="mt-4 max-w-xl text-base font-semibold leading-7 text-[var(--text-muted)]">
              Công nhân cập nhật tiến độ ngay trên điện thoại, nhóm trưởng và tổ trưởng
              theo dõi WorkOrder theo thời gian thực, số liệu tự tổng hợp cho báo cáo BDTT.
            </p>
          </div>
          <Link
            className="focus-ring pressable mt-7 inline-flex min-h-12 items-center justify-center rounded-[var(--radius-field)] bg-[var(--primary-strong)] px-6 text-sm font-semibold text-white shadow-[var(--shadow-soft-sm)] hover:bg-[var(--primary)]"
            href="/login"
          >
            Vào màn hình đăng nhập
          </Link>
        </div>

        <div className="mt-4 grid gap-4 md:mt-0 md:p-4">
          <div className="rounded-[var(--radius-card)] bg-[var(--primary-strong)] p-5 text-white shadow-[var(--shadow-soft-md)]">
            <p className="text-xs font-semibold uppercase text-white/85">Trạng thái</p>
            <p className="mt-3 text-5xl font-semibold leading-none">Sẵn sàng</p>
            <p className="mt-3 text-sm font-semibold leading-6 text-white/88">
              Cập nhật được cả khi mất mạng — dữ liệu tự gửi lại khi có kết nối.
              Nhớ báo cáo tiến độ trước mốc 12:00 mỗi ngày.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Metric label="Công nhân" value="Cập nhật trên điện thoại" />
            <Metric label="Quản lý" value="Dashboard giám sát" />
            <Metric label="Báo cáo" value="Xuất Excel tự động" />
            <Metric label="Mốc nhắc" value="Trước 12:00" />
          </div>
        </div>
      </section>
    </main>
  );
};

const Metric = ({
  label,
  value
}: {
  readonly label: string;
  readonly value: string;
}): React.ReactElement => {
  return (
    <div className="metric-card rounded-[var(--radius-card)] p-4 text-[var(--primary-strong)]">
      <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-lg font-semibold leading-tight text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
};

export default HomePage;
