import { Button, Icon } from "@/components/ui";
import type { QueueSyncState } from "@/components/worker/types";
import { cn } from "@/lib/ui";

interface WorkerPendingUpdateBarProps {
  readonly pendingCount: number;
  readonly isOnline: boolean;
  readonly isSubmitting: boolean;
  readonly lastSyncedAt: string | null;
  readonly queuedCount: number;
  readonly syncState: QueueSyncState;
  readonly onDiscard: () => void;
  readonly onSubmit: () => void;
  readonly className?: string;
}

export const WorkerPendingUpdateBar = ({
  pendingCount,
  isOnline,
  isSubmitting,
  lastSyncedAt,
  queuedCount,
  syncState,
  onDiscard,
  onSubmit,
  className
}: WorkerPendingUpdateBarProps): React.ReactElement | null => {
  if (pendingCount === 0 && queuedCount === 0 && !lastSyncedAt) return null;

  const syncedTime = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit"
      })
    : null;
  const statusTitle =
    syncState === "syncing"
      ? `Đang đồng bộ ${queuedCount} cập nhật`
      : syncState === "failed" && queuedCount > 0
        ? `${queuedCount} cập nhật chưa đồng bộ`
        : queuedCount > 0
          ? `${queuedCount} cập nhật đang chờ đồng bộ`
          : pendingCount > 0
            ? `${pendingCount} thay đổi chưa gửi`
            : `Đã đồng bộ${syncedTime ? ` lúc ${syncedTime}` : ""}`;
  const statusDescription =
    syncState === "failed"
      ? "Hệ thống sẽ tự thử lại khi mạng ổn định hoặc khi bạn mở lại ứng dụng."
      : queuedCount > 0
        ? isOnline
          ? "Đang gửi dữ liệu đã lưu trên thiết bị lên máy chủ."
          : "Dữ liệu đã lưu trên thiết bị và sẽ tự gửi khi có mạng."
        : pendingCount > 0
          ? isOnline
            ? "Kiểm tra nội dung rồi nhấn Cập nhật."
            : "Nhấn Cập nhật để lưu trên thiết bị và chờ đồng bộ."
          : "Dữ liệu trên thiết bị và máy chủ đã khớp.";

  return (
    <div
      aria-live="polite"
      className={cn(
        "border bg-[var(--surface)] p-3",
        syncState === "failed" ? "border-[var(--danger)]" : "border-[var(--primary)]",
        className
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {statusTitle}
          </p>
          <p className="mt-1 text-xs font-medium text-[var(--text-muted)]">
            {statusDescription}
          </p>
        </div>
        {pendingCount > 0 ? (
        <div className="mobile-reflow-grid grid min-w-0 grid-cols-[1fr_1.15fr] gap-2 md:flex md:shrink-0">
          <Button
            disabled={isSubmitting}
            className="min-h-11 px-2"
            onClick={onDiscard}
            size="sm"
            type="button"
            variant="secondary"
          >
            Hủy thay đổi
          </Button>
          <Button
            disabled={isSubmitting}
            className="min-h-11 px-2"
            onClick={onSubmit}
            size="sm"
            type="button"
            variant="primary"
          >
            {isSubmitting ? (
              <Icon className="animate-spin" name="loading" />
            ) : (
              <Icon name="check" />
            )}
            Cập nhật
          </Button>
        </div>
        ) : syncState === "syncing" ? (
          <Icon className="animate-spin text-[var(--primary-strong)]" name="loading" />
        ) : null}
      </div>
    </div>
  );
};
