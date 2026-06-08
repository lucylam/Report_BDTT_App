import type { SaveState } from "@/components/worker/types";

const statusMap: Record<SaveState, { readonly label: string; readonly className: string }> = {
  idle: {
    label: "Sẵn sàng",
    className: "bg-[var(--surface-muted)] text-[var(--text-muted)]"
  },
  saving: {
    label: "Đang lưu",
    className: "bg-[var(--info-soft)] text-[var(--info)]"
  },
  saved: {
    label: "Đã lưu",
    className: "bg-[var(--success-soft)] text-[var(--success)]"
  },
  offline: {
    label: "Lưu tạm offline",
    className: "bg-[var(--warning-soft)] text-[var(--warning)]"
  },
  error: {
    label: "Lỗi lưu",
    className: "bg-[var(--danger-soft)] text-[var(--danger)]"
  }
};

export const SaveStatus = ({
  state
}: {
  readonly state: SaveState;
}): React.ReactElement => {
  const status = statusMap[state];
  return (
    <span
      aria-live="polite"
      className={`inline-flex min-h-7 items-center rounded-full px-3 text-xs font-semibold shadow-sm ${status.className}`}
    >
      {status.label}
    </span>
  );
};
