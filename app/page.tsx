"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CompanyBrand } from "@/components/CompanyBrand";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Icon } from "@/components/ui";
import { useAppData } from "@/hooks/useAppData";

const HomePage = (): React.ReactElement => {
  const router = useRouter();
  const { currentAccount, data } = useAppData();

  useEffect(() => {
    if (!data || !currentAccount) return;
    router.replace(currentAccount.role === "admin" ? "/admin" : "/worker");
  }, [currentAccount, data, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-5 md:py-8">
      <section className="app-shell w-full max-w-5xl overflow-hidden rounded-[22px] p-4 md:grid md:grid-cols-[1fr_0.95fr] md:p-5">
        <div className="rounded-[var(--radius-card)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft-sm)] md:p-7">
          <div className="flex items-start justify-between gap-4">
            <CompanyBrand
              className="min-w-0"
              variant="full"
            />
            <ThemeToggle className="shrink-0" />
          </div>

          <div className="mt-8 max-w-xl">
            <p className="text-xs font-semibold uppercase text-[var(--primary-strong)]">
              Tổ Thiết bị Đo lường & Điều khiển
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight text-[var(--foreground)] md:text-5xl">
              Tiến độ BDTT 2026
            </h1>
            <p className="mt-4 text-base font-semibold leading-7 text-[var(--text-muted)]">
              Công nhân cập nhật tiến độ trên điện thoại, cấp quản lý theo dõi WorkOrder theo
              thời gian thực, dữ liệu tự tổng hợp cho báo cáo nội bộ.
            </p>
          </div>

          <Link
            className="focus-ring pressable mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-field)] bg-[var(--primary-strong)] px-6 text-sm font-semibold text-[var(--primary-contrast)] shadow-[var(--shadow-soft-sm)] hover:bg-[var(--success-strong)]"
            href="/login"
          >
            <Icon name="account" />
            Vào màn hình đăng nhập
          </Link>
        </div>

        <div className="mt-4 grid gap-4 md:mt-0 md:p-4">
          <div className="rounded-[var(--radius-card)] bg-[var(--foreground)] p-5 text-[var(--surface)] shadow-[var(--shadow-soft-md)]">
            <p className="text-xs font-semibold uppercase opacity-75">Trạng thái hệ thống</p>
            <p className="mt-3 text-5xl font-semibold leading-none">Sẵn sàng</p>
            <p className="mt-3 text-sm font-semibold leading-6 opacity-85">
              Cập nhật được cả khi mất mạng; dữ liệu tự gửi lại khi có kết nối. Mốc nhắc báo
              cáo giữ trước 12:00 mỗi ngày.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Metric icon="account" label="Công nhân" value="Cập nhật mobile" />
            <Metric icon="dashboard" label="Quản lý" value="Dashboard giám sát" />
            <Metric icon="spreadsheet" label="Báo cáo" value="Xuất Excel" />
            <Metric icon="calendar" label="Mốc nhắc" value="Trước 12:00" />
          </div>
        </div>
      </section>
    </main>
  );
};

const Metric = ({
  icon,
  label,
  value
}: {
  readonly icon: "account" | "calendar" | "dashboard" | "spreadsheet";
  readonly label: string;
  readonly value: string;
}): React.ReactElement => (
  <div className="metric-card rounded-[var(--radius-card)] p-4 text-[var(--primary-strong)]">
    <Icon name={icon} />
    <p className="mt-3 text-xs font-semibold uppercase text-[var(--text-muted)]">{label}</p>
    <p className="mt-2 text-lg font-semibold leading-tight text-[var(--foreground)]">
      {value}
    </p>
  </div>
);

export default HomePage;
