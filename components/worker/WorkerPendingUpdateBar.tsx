import { Button, Icon } from "@/components/ui";
import { cn } from "@/lib/ui";

interface WorkerPendingUpdateBarProps {
  readonly pendingCount: number;
  readonly isOnline: boolean;
  readonly isSubmitting: boolean;
  readonly onDiscard: () => void;
  readonly onSubmit: () => void;
  readonly className?: string;
}

export const WorkerPendingUpdateBar = ({
  pendingCount,
  isOnline,
  isSubmitting,
  onDiscard,
  onSubmit,
  className
}: WorkerPendingUpdateBarProps): React.ReactElement | null => {
  if (pendingCount === 0) return null;

  return (
    <div
      aria-live="polite"
      className={cn(
        "rounded-[var(--radius-card)] border border-[var(--primary)] bg-[var(--surface)] p-3 shadow-[var(--shadow-soft)]",
        className
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {pendingCount} thay đổi chờ cập nhật
          </p>
          <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">
            {isOnline ? "Sẵn sàng ghi vào database." : "Đang offline, sẽ lưu tạm và tự đồng bộ."}
          </p>
        </div>
        <div className="grid min-w-0 grid-cols-[1fr_1.15fr] gap-2 sm:flex sm:shrink-0">
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
      </div>
    </div>
  );
};
