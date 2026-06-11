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
      <section className="app-shell w-full max-w-5xl overflow-hidden rounded-[2.2rem] p-4 md:grid md:grid-cols-[1.05fr_0.95fr] md:p-5">
        <div className="rounded-[1.8rem] bg-white/82 p-5 shadow-[var(--shadow-soft-sm)] backdrop-blur-xl md:p-7">
          <CompanyBrand className="rounded-[1.35rem] bg-white/78 p-4 ring-1 ring-[var(--border)]" variant="full" />
          <div className="mt-6">
            <p className="text-xs font-extrabold uppercase text-[var(--primary-strong)]">
              Tổ Thiết bị Đo lường & Điều khiển
            </p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-normal text-[var(--foreground)] md:text-5xl">
              Tiến độ BDTT 2026
            </h1>
            <p className="mt-4 max-w-xl text-base font-semibold leading-7 text-[var(--text-muted)]">
              Một điểm vào duy nhất để worker cập nhật tiến độ, quản lý theo dõi WorkOrder,
              và đồng bộ DATA cho báo cáo BDTT.
            </p>
          </div>
          <Link
            className="focus-ring pressable mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--primary-strong)] px-6 text-sm font-extrabold text-white shadow-[var(--shadow-soft-sm)]"
            href="/login"
          >
            Vào màn hình đăng nhập
          </Link>
        </div>

        <div className="mt-4 grid gap-4 md:mt-0 md:p-4">
          <div className="rounded-[1.6rem] bg-[var(--primary-strong)] p-5 text-white shadow-[var(--shadow-floating)]">
            <p className="text-xs font-extrabold uppercase text-white/72">Trạng thái</p>
            <p className="mt-3 text-5xl font-extrabold leading-none">Live</p>
            <p className="mt-3 text-sm font-semibold leading-6 text-white/78">
              Dữ liệu local hoạt động ngay; các thao tác import/progress/sync dùng API server
              khi cấu hình Supabase và Google Sheets sẵn sàng.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Metric label="Worker" value="Mobile-first" />
            <Metric label="Admin" value="Dashboard" />
            <Metric label="DATA" value="Excel A:M" />
            <Metric label="Sync" value="N:AF" />
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
    <div className="metric-card rounded-[1.35rem] p-4 text-[var(--primary-strong)]">
      <p className="text-xs font-extrabold uppercase text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-lg font-extrabold leading-tight text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
};

export default HomePage;
