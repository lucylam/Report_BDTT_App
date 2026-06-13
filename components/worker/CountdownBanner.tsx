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
      <div className="mx-4 mt-2 rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface-warm)] px-3 py-2 text-sm font-semibold text-[var(--accent-strong)] shadow-[var(--shadow-soft-sm)]">
        Đã qua mốc nhắc 12:00. Vẫn có thể cập nhật tiến độ, ghi chú và ảnh.
      </div>
    );
  }

  const hours = Math.floor(minutesLeft / 60);
  const minutes = minutesLeft % 60;
  const urgentClass =
    minutesLeft <= 30
      ? "bg-[var(--danger-soft)] text-[var(--danger-strong)]"
      : minutesLeft <= 90
        ? "bg-[var(--surface-warm)] text-[var(--accent-strong)]"
        : "bg-[var(--success-soft)] text-[var(--success-strong)]";

  return (
    <div className={`mx-4 mt-2 rounded-[var(--radius-card)] border border-[var(--line)] px-3 py-2 text-sm shadow-[var(--shadow-soft-sm)] ${urgentClass}`}>
      Còn <span className="font-semibold">{hours} giờ {minutes} phút</span> để cập nhật trước mốc nhắc 12:00.
    </div>
  );
};
