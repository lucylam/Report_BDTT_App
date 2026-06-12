"use client";

import { useEffect, useState } from "react";
import { minutesUntilNoon } from "@/lib/date";

export const CountdownBanner = (): React.ReactElement => {
  const [minutesLeft, setMinutesLeft] = useState<number>(minutesUntilNoon());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMinutesLeft(minutesUntilNoon());
    }, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  if (minutesLeft === 0) {
    return (
      <div className="mx-4 mt-2 rounded-[var(--radius-card)] border border-amber-200 bg-[var(--warning-soft)] px-3 py-2 text-sm font-semibold text-[var(--warning)] shadow-[var(--shadow-soft-sm)]">
        Đã qua mốc nhắc 12:00. Vẫn có thể cập nhật tiến độ, ghi chú và ảnh.
      </div>
    );
  }

  const hours = Math.floor(minutesLeft / 60);
  const minutes = minutesLeft % 60;
  const urgentClass =
    minutesLeft <= 30
      ? "border-red-200 bg-[var(--danger-soft)] text-[var(--danger)]"
      : minutesLeft <= 90
        ? "border-amber-200 bg-[var(--warning-soft)] text-[var(--warning)]"
        : "border-emerald-200 bg-[var(--success-soft)] text-[var(--success)]";

  return (
    <div className={`mx-4 mt-2 rounded-[var(--radius-card)] border px-3 py-2 text-sm shadow-[var(--shadow-soft-sm)] ${urgentClass}`}>
      Còn <span className="font-semibold">{hours} giờ {minutes} phút</span> để cập nhật trước mốc nhắc 12:00.
    </div>
  );
};
