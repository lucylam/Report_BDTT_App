"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Icon } from "@/components/ui";

const STORAGE_KEY = "bdtt-onboarding-2026-complete";

export const FirstRunOnboarding = (): React.ReactElement | null => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (pathname.startsWith("/login") || pathname.startsWith("/change-password")) return;
    if (window.localStorage.getItem(STORAGE_KEY) === "1") return;
    const timer = window.setTimeout(() => setOpen(true), 300);
    return () => window.clearTimeout(timer);
  }, [pathname]);
  if (!open) return null;
  const close = (): void => {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };
  return (
    <div aria-modal="true" className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/55 p-3 sm:items-center" role="dialog">
      <section className="w-full max-w-xl border border-[var(--border-strong)] bg-[var(--surface)] p-4 shadow-2xl sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--primary-strong)]">Hướng dẫn nhanh</p><h2 className="mt-1 text-xl font-semibold">Bắt đầu làm việc với BDTT</h2></div>
          <button aria-label="Đóng hướng dẫn" className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center border border-[var(--line)]" onClick={close} type="button"><Icon name="close" /></button>
        </div>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          <li className="border-l-2 border-[var(--primary)] pl-3"><strong className="block text-sm">1. Việc hôm nay</strong><span className="mt-1 block text-sm leading-5 text-[var(--text-muted)]">Mở Công việc, chọn task và nhập tiến độ.</span></li>
          <li className="border-l-2 border-[var(--info)] pl-3"><strong className="block text-sm">2. Mất mạng</strong><span className="mt-1 block text-sm leading-5 text-[var(--text-muted)]">Báo cáo được giữ trong hàng chờ và tự gửi lại.</span></li>
          <li className="border-l-2 border-[var(--danger)] pl-3"><strong className="block text-sm">3. Bất thường</strong><span className="mt-1 block text-sm leading-5 text-[var(--text-muted)]">Tạo ghi nhận riêng, thêm ảnh và theo dõi xử lý.</span></li>
        </ol>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Link className="focus-ring inline-flex min-h-11 items-center justify-center border border-[var(--border-strong)] px-4 text-sm font-semibold text-[var(--foreground)] no-underline" href="/help" onClick={close}>Xem hướng dẫn đầy đủ</Link>
          <Button onClick={close}>Đã hiểu, bắt đầu</Button>
        </div>
      </section>
    </div>
  );
};
