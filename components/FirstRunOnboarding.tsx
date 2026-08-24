"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Icon, type IconName } from "@/components/ui";

const STORAGE_KEY = "bdtt-onboarding-2026-complete";
const stepMeta: readonly { readonly icon: IconName; readonly className: string }[] = [
  { icon: "list", className: "bg-[var(--primary-soft)] text-[var(--primary-strong)]" },
  { icon: "wifiOff", className: "bg-[var(--info-soft)] text-[var(--info-strong)]" },
  { icon: "bell", className: "bg-[var(--danger-soft)] text-[var(--danger-strong)]" }
];

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
      <section className="w-full max-w-xl rounded-[var(--radius-panel)] border border-[var(--border-strong)] bg-[var(--surface)] p-4 shadow-2xl sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--primary-strong)]">Hướng dẫn nhanh</p><h2 className="mt-1 text-xl font-semibold">Bắt đầu làm việc với BDTT</h2></div>
          <button aria-label="Đóng hướng dẫn" className="icon-button focus-ring" onClick={close} type="button"><Icon name="close" /></button>
        </div>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ["Việc hôm nay", "Mở Công việc, chọn task và nhập tiến độ."],
            ["Mất mạng", "Báo cáo được giữ trong hàng chờ và tự gửi lại."],
            ["Bất thường", "Tạo ghi nhận riêng, thêm ảnh và theo dõi xử lý."]
          ].map(([title, description], index) => (
            <li className="metric-card rounded-[var(--radius-card)] p-3" key={title}>
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-field)] ${stepMeta[index].className}`}><Icon name={stepMeta[index].icon} /></span>
              <strong className="mt-3 block text-sm">{index + 1}. {title}</strong>
              <span className="mt-1 block text-sm leading-5 text-[var(--text-muted)]">{description}</span>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Link className="focus-ring inline-flex min-h-11 items-center justify-center rounded-[var(--radius-field)] border border-[var(--border-strong)] px-4 text-sm font-semibold text-[var(--foreground)] no-underline hover:bg-[var(--surface-muted)]" href="/help" onClick={close}>Xem hướng dẫn đầy đủ</Link>
          <Button onClick={close}>Đã hiểu, bắt đầu</Button>
        </div>
      </section>
    </div>
  );
};
