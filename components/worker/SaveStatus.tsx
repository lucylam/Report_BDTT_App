import type { SaveState } from "@/components/worker/types";

const statusMap: Record<SaveState, { readonly label: string; readonly className: string }> = {
  idle: {
    label: "Sẵn sàng",
    className: "bg-white text-slate-800 ring-1 ring-[var(--border)]"
  },
  saving: {
    label: "Đang lưu",
    className: "bg-[var(--info-strong)] text-white"
  },
  saved: {
    label: "Đã lưu",
    className: "bg-[var(--success)] text-white"
  },
  offline: {
    label: "Chờ mạng, sẽ tự gửi",
    className: "bg-[var(--warning-strong)] text-white"
  },
  error: {
    label: "Lỗi lưu",
    className: "bg-[var(--danger-strong)] text-white"
  }
};

export const SaveStatus = ({ state }: { readonly state: SaveState }): React.ReactElement => {
  const status = statusMap[state];
  return (
    <span
      aria-live="polite"
      className={`inline-flex min-h-7 items-center rounded-full px-3 text-xs font-extrabold shadow-sm ${status.className}`}
    >
      {status.label}
    </span>
  );
};
