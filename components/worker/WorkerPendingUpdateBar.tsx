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
  readonly compact?: boolean;
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
  className,
  compact = false
}: WorkerPendingUpdateBarProps): React.ReactElement | null => {
  if (pendingCount === 0 && queuedCount === 0 && (compact || !lastSyncedAt)) return null;

  const syncedTime = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit"
      })
    : null;

  const statusText =
    pendingCount > 0
      ? `${pendingCount} thay đổi chưa gửi`
      : syncState === "syncing"
        ? `Đang đồng bộ ${queuedCount} cập nhật`
        : `${queuedCount} cập nhật đang chờ đồng bộ`;

  if (!compact) {
    return (
      <div
        aria-live="polite"
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border bg-[var(--surface)] p-3",
          syncState === "failed" ? "border-[var(--danger)]" : "border-[var(--primary)]",
          className
        )}
      >
        <p className="text-sm font-semibold text-[var(--foreground)]">
          {pendingCount > 0
            ? statusText
            : queuedCount > 0
              ? statusText
              : `Đã đồng bộ${syncedTime ? ` lúc ${syncedTime}` : ""}`}
        </p>
        {pendingCount > 0 ? (
          <div className="flex gap-2">
            <Button disabled={isSubmitting} onClick={onDiscard} size="sm" variant="secondary">
              Hủy thay đổi
            </Button>
            <Button disabled={isSubmitting} onClick={onSubmit} size="sm">
              <Icon className={isSubmitting ? "animate-spin" : undefined} name={isSubmitting ? "loading" : "check"} />
              Cập nhật
            </Button>
          </div>
        ) : syncState === "syncing" ? (
          <Icon className="animate-spin text-[var(--primary-strong)]" name="loading" />
        ) : null}
      </div>
    );
  }

  return (
    <div
      aria-live="polite"
      className={cn(
        "flex w-fit items-center gap-2 rounded-full border bg-[var(--surface)] p-1.5 shadow-[var(--shadow-floating)]",
        syncState === "failed" ? "border-[var(--danger)]" : "border-[var(--primary)]",
        className
      )}
    >
      <span className="sr-only">{statusText}</span>
      {pendingCount > 0 ? (
        <>
          <button
            aria-label={`Hủy ${pendingCount} thay đổi`}
            className="focus-ring pressable inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--danger)] hover:bg-[var(--danger-soft)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
            onClick={onDiscard}
            title="Hủy thay đổi"
            type="button"
          >
            <Icon name="close" />
          </button>
          <button
            aria-label={`Gửi ${pendingCount} thay đổi`}
            className="focus-ring pressable inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--primary-strong)] text-[var(--primary-contrast)] shadow-sm hover:bg-[var(--success-strong)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
            onClick={onSubmit}
            title="Cập nhật"
            type="button"
          >
            <Icon className={isSubmitting ? "animate-spin" : undefined} name={isSubmitting ? "loading" : "check"} />
          </button>
        </>
      ) : (
        <span
          aria-label={statusText}
          className={cn(
            "inline-flex h-12 w-12 items-center justify-center rounded-full",
            syncState === "failed"
              ? "bg-[var(--danger-soft)] text-[var(--danger)]"
              : "bg-[var(--primary-soft)] text-[var(--primary-strong)]"
          )}
          role="status"
          title={statusText}
        >
          <Icon
            className={syncState === "syncing" ? "animate-spin" : undefined}
            name={syncState === "syncing" ? "loading" : isOnline ? "wifi" : "wifiOff"}
          />
        </span>
      )}
    </div>
  );
};
