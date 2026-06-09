"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CompanyBrand } from "@/components/CompanyBrand";
import { useAppData } from "@/hooks/useAppData";
import { BDTT_2026_SUBTITLE, BDTT_2026_TITLE } from "@/lib/org2026";

const HomePage = (): React.ReactElement => {
  const router = useRouter();
  const { currentAccount, data } = useAppData();

  useEffect(() => {
    if (!data || !currentAccount) return;
    router.replace(currentAccount.role === "admin" ? "/admin" : "/worker");
  }, [currentAccount, data, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-6">
      <section className="soft-panel w-full max-w-md overflow-hidden p-5 md:p-7">
        <CompanyBrand className="rounded-[1.5rem] bg-white/76 p-4 ring-1 ring-[var(--border)]" variant="full" />
        <div className="mt-5 rounded-[1.75rem] bg-[var(--primary-strong)] px-5 py-7 text-white shadow-[var(--shadow-floating)]">
          <p className="text-xs font-bold uppercase tracking-wide text-white/75">
            {BDTT_2026_SUBTITLE}
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-4xl">
            {BDTT_2026_TITLE}
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/78">
            Một điểm vào duy nhất cho worker cập nhật tiến độ và cấp quản lý theo dõi tình hình.
          </p>
        </div>

        <div className="mt-5 rounded-[1.75rem] bg-white/80 p-4 ring-1 ring-[var(--border)]">
          <p className="text-sm font-semibold text-[var(--text-muted)]">
            Đăng nhập bằng username PVCFC. Hệ thống sẽ tự mở đúng màn hình theo tài khoản.
          </p>
          <Link
            className="focus-ring pressable mt-4 flex min-h-12 items-center justify-center rounded-full bg-[var(--primary-strong)] px-5 text-sm font-bold text-white shadow-[var(--shadow-soft-sm)]"
            href="/login"
          >
            Vào màn hình đăng nhập
          </Link>
        </div>
      </section>
    </main>
  );
};

export default HomePage;
