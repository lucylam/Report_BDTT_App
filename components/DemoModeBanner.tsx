"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Alert, Button, Dialog, Icon, Input } from "@/components/ui";
import { getCurrentReportDate } from "@/lib/date";

interface TrialRunStatus {
  readonly id: string;
  readonly name: string;
  readonly startedAt: string;
}

interface DemoPreview {
  readonly tasks: number;
  readonly taskChanges: number;
  readonly progress: number;
  readonly generatedProgress: number;
  readonly dataIssues: number;
  readonly abnormalities: number;
  readonly notifications: number;
  readonly photos: number;
}

interface DemoStatusResponse {
  readonly ok?: boolean;
  readonly mode?: "trial" | "live";
  readonly run?: TrialRunStatus | null;
  readonly canManage?: boolean;
  readonly canGenerateProgress?: boolean;
  readonly preview?: DemoPreview;
  readonly resetConfirmation?: string;
  readonly created?: number;
  readonly cleared?: number;
  readonly totalDemo?: number;
  readonly reportDate?: string;
  readonly error?: string;
}

const previewItems: readonly [keyof DemoPreview, string][] = [
  ["progress", "Tổng báo cáo dùng thử"],
  ["generatedProgress", "Báo cáo mẫu đã tạo"],
  ["tasks", "Task phát sinh"],
  ["taskChanges", "Task kế hoạch đã sửa"],
  ["dataIssues", "Báo sai dữ liệu"],
  ["abnormalities", "Báo bất thường"],
  ["photos", "Ảnh dùng thử"],
  ["notifications", "Thông báo"]
];

const readResponse = async (response: Response): Promise<DemoStatusResponse> =>
  (await response.json().catch(() => ({}))) as DemoStatusResponse;

export const DemoModeBanner = (): React.ReactElement | null => {
  const pathname = usePathname();
  const [status, setStatus] = useState<DemoStatusResponse | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("Dùng thử trước vận hành");
  const [confirmation, setConfirmation] = useState("");
  const [demoReportDate, setDemoReportDate] = useState(getCurrentReportDate());
  const [mutationMessage, setMutationMessage] = useState("");
  const [dataChanged, setDataChanged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const previousModeKey = useRef<string | null>(null);

  const loadStatus = useCallback(async (details = false): Promise<void> => {
    const response = await fetch(`/api/demo-mode${details ? "?details=1" : ""}`, {
      cache: "no-store"
    });
    if (response.status === 401) {
      setStatus(null);
      return;
    }
    const result = await readResponse(response);
    if (!response.ok) return;
    const nextKey = result.run?.id ?? "live";
    if (previousModeKey.current && previousModeKey.current !== nextKey) {
      window.location.reload();
      return;
    }
    previousModeKey.current = nextKey;
    setStatus(result);
  }, []);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => void loadStatus(), 0);
    const timer = window.setInterval(() => void loadStatus(), 30_000);
    const onVisible = (): void => {
      if (document.visibilityState === "visible") void loadStatus();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadStatus]);

  if (
    pathname.startsWith("/am") ||
    !status ||
    (status.mode === "live" && !status.canManage)
  ) return null;

  const openDialog = (): void => {
    setError("");
    setConfirmation("");
    setMutationMessage("");
    setDataChanged(false);
    setDialogOpen(true);
    if (status.mode === "trial") void loadStatus(true);
  };

  const closeDialog = (): void => {
    if (busy) return;
    setDialogOpen(false);
    if (dataChanged) window.location.reload();
  };

  const startTrial = async (): Promise<void> => {
    setBusy(true);
    setError("");
    const response = await fetch("/api/demo-mode", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name })
    });
    const result = await readResponse(response);
    if (!response.ok) {
      setError(result.error || "Không bật được Demo Mode.");
      setBusy(false);
      return;
    }
    window.location.reload();
  };

  const resetTrial = async (): Promise<void> => {
    setBusy(true);
    setError("");
    const response = await fetch("/api/demo-mode", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirmation })
    });
    const result = await readResponse(response);
    if (!response.ok) {
      setError(result.error || "Không xóa được dữ liệu dùng thử.");
      setBusy(false);
      return;
    }
    window.location.reload();
  };

  const createDemoProgress = async (): Promise<void> => {
    setBusy(true);
    setError("");
    setMutationMessage("");
    const response = await fetch("/api/demo-mode", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reportDate: demoReportDate })
    });
    const result = await readResponse(response);
    if (!response.ok) {
      setError(result.error || "Không tạo được báo cáo demo.");
      setBusy(false);
      return;
    }
    setMutationMessage(
      result.created
        ? `Đã tạo ${result.created} báo cáo demo ngày ${result.reportDate}. Tổng hiện có: ${result.totalDemo}.`
        : "Không còn task phù hợp để tạo thêm trong ngày đã chọn."
    );
    setDataChanged((current) => Boolean(result.created) || current);
    await loadStatus(true);
    setBusy(false);
  };

  const clearDemoProgress = async (): Promise<void> => {
    setBusy(true);
    setError("");
    setMutationMessage("");
    const response = await fetch("/api/demo-mode", { method: "PATCH" });
    const result = await readResponse(response);
    if (!response.ok) {
      setError(result.error || "Không xóa được báo cáo demo.");
      setBusy(false);
      return;
    }
    setMutationMessage(`Đã xóa ${result.cleared ?? 0} báo cáo mẫu. Dữ liệu thật và báo cáo thử nhập tay được giữ nguyên.`);
    setDataChanged((current) => (result.cleared ?? 0) > 0 || current);
    await loadStatus(true);
    setBusy(false);
  };

  const isTrial = status.mode === "trial" && Boolean(status.run);
  return (
    <>
      <div
        className={
          isTrial
            ? "border-b border-amber-700 bg-amber-300 px-3 py-2 text-amber-950"
            : "border-b border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)]"
        }
      >
        <div className="mx-auto flex min-h-10 max-w-[1920px] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-sm font-bold">
            <Icon name={isTrial ? "demo" : "shield"} />
            <span className="truncate">
              {isTrial ? `CHẾ ĐỘ DÙNG THỬ · ${status.run?.name}` : "Chế độ chính thức · Demo đang tắt"}
            </span>
          </div>
          {status.canManage || (isTrial && status.canGenerateProgress) ? (
            <Button
              className={isTrial ? "border-amber-900 bg-amber-50 text-amber-950 hover:bg-white" : ""}
              onClick={openDialog}
              size="sm"
              variant="secondary"
            >
              {isTrial ? "Tạo / xóa demo" : "Bật dùng thử"}
            </Button>
          ) : (
            <span className="hidden shrink-0 text-xs font-bold sm:inline">Dữ liệu sẽ được xóa trước khi dùng thật</span>
          )}
        </div>
      </div>

      {dialogOpen ? (
        <Dialog
          description={
            isTrial
              ? "Tạo báo cáo mẫu trên WorkOrder sẵn có hoặc xóa riêng các báo cáo mẫu mà không ảnh hưởng dữ liệu thật."
              : "Sau khi bật, mọi thao tác BDTT phát sinh sẽ tự động được đánh dấu là dữ liệu thử."
          }
          eyebrow={isTrial ? "Đang dùng thử" : "Quản trị dữ liệu"}
          eyebrowTone={isTrial ? "danger" : "primary"}
          onClose={closeDialog}
          title={isTrial ? "Quản lý dữ liệu dùng thử" : "Bật Demo Mode"}
        >
          {isTrial ? (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {previewItems.map(([key, label]) => (
                  <div className="rounded-[var(--radius-field)] border border-[var(--line)] bg-[var(--surface-muted)] p-3" key={key}>
                    <p className="text-2xl font-bold text-[var(--foreground)]">{status.preview?.[key] ?? "–"}</p>
                    <p className="mt-1 text-xs font-semibold leading-4 text-[var(--text-muted)]">{label}</p>
                  </div>
                ))}
              </div>
              {status.canGenerateProgress ? (
                <section className="rounded-[var(--radius-card)] border border-[var(--primary-soft)] bg-[var(--primary-pale)] p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-field)] bg-[var(--surface)] text-[var(--primary-strong)] ring-1 ring-[var(--primary-soft)]">
                      <Icon name="chart" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-[var(--foreground)]">Báo cáo mẫu để test chart</h3>
                      <p className="mt-1 text-xs font-medium leading-5 text-[var(--text-muted)]">
                        Mỗi lần tạo tối đa 36 record trên task đang có, phân bổ giữa các đơn vị và nhóm trưởng. Không tạo task hoặc WorkOrder mới.
                      </p>
                    </div>
                  </div>
                  <label className="mt-4 block text-sm font-semibold">
                    Ngày báo cáo demo
                    <Input
                      className="mt-2 bg-[var(--surface)]"
                      disabled={busy}
                      onChange={(event) => setDemoReportDate(event.target.value)}
                      type="date"
                      value={demoReportDate}
                    />
                  </label>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Button
                      disabled={busy || !demoReportDate}
                      onClick={() => void createDemoProgress()}
                    >
                      <Icon name="demo" />
                      {busy ? "Đang xử lý…" : "Tạo thêm báo cáo demo"}
                    </Button>
                    <Button
                      disabled={busy || !status.preview?.generatedProgress}
                      onClick={() => void clearDemoProgress()}
                      variant="secondary"
                    >
                      <Icon name="database" />
                      Xóa báo cáo mẫu
                    </Button>
                  </div>
                  {mutationMessage ? <Alert className="mt-3" tone="success">{mutationMessage}</Alert> : null}
                </section>
              ) : null}
              {error ? <Alert tone="danger">{error}</Alert> : null}
              {status.canManage ? (
                <>
                  <Alert tone="warning">
                    Xóa dữ liệu thử sẽ phục hồi các task kế hoạch đã đổi người hoặc đã hủy. Thao tác này không thể hoàn tác.
                  </Alert>
                  <label className="block text-sm font-semibold">
                    Nhập <span className="font-bold text-[var(--danger)]">{status.resetConfirmation}</span> để xác nhận
                    <Input
                      autoComplete="off"
                      className="mt-2"
                      onChange={(event) => setConfirmation(event.target.value)}
                      value={confirmation}
                    />
                  </label>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button disabled={busy} onClick={closeDialog} variant="ghost">Đóng</Button>
                    <Button
                      disabled={busy || confirmation.trim().toUpperCase() !== status.resetConfirmation}
                      onClick={() => void resetTrial()}
                      variant="danger"
                    >
                      {busy ? "Đang xóa…" : "Xóa dữ liệu thử và dùng thật"}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex justify-end">
                  <Button disabled={busy} onClick={closeDialog} variant="ghost">Đóng</Button>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <label className="block text-sm font-semibold">
                Tên đợt dùng thử
                <Input className="mt-2" maxLength={120} onChange={(event) => setName(event.target.value)} value={name} />
              </label>
              <Alert tone="info">Google Sheet chỉ đồng bộ khi DATA admin chủ động xem trước và xác nhận. Snapshot có thể bao gồm dữ liệu dùng thử.</Alert>
              {error ? <Alert tone="danger">{error}</Alert> : null}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button disabled={busy} onClick={closeDialog} variant="ghost">Đóng</Button>
                <Button disabled={busy || name.trim().length < 3} onClick={() => void startTrial()}>
                  {busy ? "Đang bật…" : "Bật Demo Mode"}
                </Button>
              </div>
            </div>
          )}
        </Dialog>
      ) : null}
    </>
  );
};
