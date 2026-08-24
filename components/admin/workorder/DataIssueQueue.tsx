"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, EmptyState, Input, Widget, WidgetHeader } from "@/components/ui";
import type { AppData, DataIssueStatus, DataIssueType } from "@/types/domain";

interface RawIssue {
  readonly id: string;
  readonly task_id: string;
  readonly reported_by: string;
  readonly issue_type: DataIssueType;
  readonly current_value: string;
  readonly suggested_value: string;
  readonly note: string;
  readonly status: DataIssueStatus;
  readonly resolution_note: string;
  readonly created_at: string;
}

const statusLabel: Record<DataIssueStatus, string> = {
  open: "Mới",
  reviewing: "Đang xử lý",
  resolved: "Đã sửa",
  rejected: "Từ chối"
};

const typeLabel: Record<DataIssueType, string> = {
  wrong_tag: "Sai Tag",
  wrong_wo: "Sai WO",
  wrong_assignment: "Sai phân công",
  other: "Khác"
};

export const DataIssueQueue = ({ data }: { readonly data: AppData }): React.ReactElement => {
  const [items, setItems] = useState<RawIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/data-issues", { cache: "no-store" });
      const payload = (await response.json()) as { items?: RawIssue[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Không tải được hàng chờ xử lý.");
      setItems(payload.items ?? []);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không tải được hàng chờ xử lý.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const mutate = async (issueId: string, action: "review" | "resolve" | "reject"): Promise<void> => {
    setBusyId(issueId);
    try {
      const response = await fetch("/api/data-issues", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ issueId, action, resolutionNote: notes[issueId] ?? "" })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Không cập nhật được báo sai.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không cập nhật được báo sai.");
    } finally {
      setBusyId("");
    }
  };

  const openCount = useMemo(
    () => items.filter((item) => item.status === "open" || item.status === "reviewing").length,
    [items]
  );

  return (
    <Widget>
      <WidgetHeader
        icon="data"
        tone="warning"
        subtitle={`${openCount} mục đang chờ · xử lý trong đúng phạm vi phụ trách`}
        title="Báo sai dữ liệu"
      />
      {message ? <Alert className="mt-3" tone="warning">{message}</Alert> : null}
      {isLoading ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">Đang tải báo sai dữ liệu...</p>
      ) : items.length === 0 ? (
        <EmptyState description="Chưa có báo sai dữ liệu trong phạm vi của bạn." title="Hàng chờ trống" />
      ) : (
        <div className="mt-3 divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {items.map((item) => {
            const task = data.tasks.find((entry) => entry.id === item.task_id);
            const reporter = data.profiles.find((entry) => entry.id === item.reported_by);
            const terminal = item.status === "resolved" || item.status === "rejected";
            return (
              <article className="grid gap-3 py-3 xl:grid-cols-[minmax(180px,0.7fr)_minmax(260px,1.5fr)_minmax(280px,1fr)]" key={item.id}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={terminal ? "success" : item.status === "reviewing" ? "warning" : "info"}>
                      {statusLabel[item.status]}
                    </Badge>
                    <span className="text-sm font-semibold">{typeLabel[item.issue_type]}</span>
                  </div>
                  <p className="mt-2 break-words font-mono text-sm font-semibold text-[var(--primary-strong)]">
                    {task?.tagname || item.task_id}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {reporter?.fullName || "Người báo cáo"} · {new Date(item.created_at).toLocaleString("vi-VN")}
                  </p>
                </div>
                <div className="min-w-0 text-sm leading-6">
                  <p><span className="font-semibold">Hiện tại:</span> {item.current_value || "—"}</p>
                  <p><span className="font-semibold">Đề xuất:</span> {item.suggested_value || "—"}</p>
                  {item.note ? <p className="text-[var(--text-muted)]">{item.note}</p> : null}
                  {item.resolution_note ? <p className="mt-2 rounded-[var(--radius-field)] bg-[var(--success-soft)] px-3 py-2 text-[var(--success)] ring-1 ring-[var(--success)]">{item.resolution_note}</p> : null}
                </div>
                <div className="min-w-0">
                  {!terminal ? (
                    <>
                      <Input
                        aria-label={`Kết luận xử lý ${task?.tagname || "báo sai"}`}
                        onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                        placeholder="Nhập kết luận trước khi đóng"
                        value={notes[item.id] ?? ""}
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.status === "open" ? (
                          <Button disabled={busyId === item.id} onClick={() => void mutate(item.id, "review")} size="sm" variant="secondary">
                            Tiếp nhận
                          </Button>
                        ) : null}
                        <Button disabled={busyId === item.id} onClick={() => void mutate(item.id, "resolve")} size="sm">
                          Xác nhận đã sửa
                        </Button>
                        <Button disabled={busyId === item.id} onClick={() => void mutate(item.id, "reject")} size="sm" variant="danger">
                          Từ chối
                        </Button>
                      </div>
                    </>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Widget>
  );
};
