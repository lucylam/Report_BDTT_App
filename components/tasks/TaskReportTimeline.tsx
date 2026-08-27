"use client";

import { useEffect, useState } from "react";
import { Badge, Icon } from "@/components/ui";
import { cn } from "@/lib/ui";
import type { TaskReportHistoryItem } from "@/types/domain";

interface ReportHistoryResponse {
  readonly ok?: boolean;
  readonly history?: TaskReportHistoryItem[];
  readonly error?: string;
}

interface TaskReportTimelineProps {
  readonly taskId: string;
  readonly refreshKey?: string;
  readonly className?: string;
}

interface TimelineState {
  readonly requestKey: string;
  readonly history: TaskReportHistoryItem[];
  readonly error: string;
  readonly isLoading: boolean;
}

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Ho_Chi_Minh"
});

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC"
});

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
};

const formatReportDate = (value: string): string => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
};

export const TaskReportTimeline = ({
  taskId,
  refreshKey,
  className
}: TaskReportTimelineProps): React.ReactElement => {
  const requestKey = `${taskId}:${refreshKey ?? ""}`;
  const [state, setState] = useState<TimelineState>({
    requestKey,
    history: [],
    error: "",
    isLoading: true
  });
  const isCurrentRequest = state.requestKey === requestKey;
  const history = isCurrentRequest ? state.history : [];
  const error = isCurrentRequest ? state.error : "";
  const isLoading = !isCurrentRequest || state.isLoading;

  useEffect(() => {
    const controller = new AbortController();

    void fetch(`/api/tasks/${encodeURIComponent(taskId)}/report-history`, {
      cache: "no-store",
      signal: controller.signal
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | ReportHistoryResponse
          | null;
        if (!response.ok) {
          throw new Error(payload?.error || "Không tải được lịch sử báo cáo.");
        }
        setState({
          requestKey,
          history: payload?.history ?? [],
          error: "",
          isLoading: false
        });
      })
      .catch((nextError: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          requestKey,
          history: [],
          error:
            nextError instanceof Error
              ? nextError.message
              : "Không tải được lịch sử báo cáo.",
          isLoading: false
        });
      });

    return () => controller.abort();
  }, [requestKey, taskId]);

  return (
    <section
      aria-busy={isLoading}
      aria-label="Lịch sử báo cáo"
      className={cn(
        "rounded-[var(--radius-field)] border border-[var(--border)] bg-[var(--surface-muted)] p-3 sm:p-4",
        className
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
          <Icon className="h-4 w-4 text-[var(--primary-strong)]" name="history" />
          <span>Lịch sử báo cáo</span>
        </h3>
        {!isLoading && !error ? (
          <span className="text-xs font-semibold tabular-nums text-[var(--text-muted)]">
            {history.length} lần cập nhật
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <p className="mt-3 text-sm text-[var(--text-muted)]">Đang tải...</p>
      ) : error ? (
        <p className="mt-3 break-words text-sm font-medium text-[var(--danger)]" role="status">
          {error}
        </p>
      ) : history.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--text-muted)]">Chưa có lần cập nhật nào.</p>
      ) : (
        <ol className="mt-3 space-y-0">
          {history.map((item, index) => (
            <li className="relative flex min-w-0 gap-3 pb-4 last:pb-0" key={item.id}>
              <div className="relative flex w-5 shrink-0 justify-center pt-2">
                <span className="z-[1] h-3 w-3 rounded-full border-2 border-[var(--surface)] bg-[var(--primary-strong)] shadow-sm" />
                {index < history.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-[-0.5rem] top-4 w-px bg-[var(--border-strong)]"
                  />
                ) : null}
              </div>

              <div className="min-w-0 flex-1 rounded-[var(--radius-field)] border border-[var(--line)] bg-[var(--surface)] p-3">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <Badge solid tone={item.percent >= 100 ? "success" : "accent"}>
                    {item.percent}%
                  </Badge>
                  <time
                    className="break-words text-xs font-semibold tabular-nums text-[var(--text-muted)]"
                    dateTime={item.createdAt}
                  >
                    {formatDateTime(item.createdAt)}
                  </time>
                </div>
                <p className="mt-2 break-words text-sm leading-6 text-[var(--foreground)] [overflow-wrap:anywhere]">
                  {item.note || "Không có ghi chú."}
                </p>
                <p className="mt-2 break-words text-xs font-medium leading-5 text-[var(--text-muted)] [overflow-wrap:anywhere]">
                  {item.actorName}
                  {item.actorUsername ? ` · @${item.actorUsername}` : ""}
                  {` · Ngày báo cáo ${formatReportDate(item.reportDate)}`}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};
