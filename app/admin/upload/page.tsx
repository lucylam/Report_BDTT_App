"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Alert, Badge, Button, Icon, Widget, WidgetHeader } from "@/components/ui";
import { OFFICIAL_DEMO_NOTE_PREFIX, isOfficialDemoProgress } from "@/lib/demoProgress";
import { isDataAdminAccount } from "@/lib/permissions";
import { useAppData } from "@/hooks/useAppData";

interface BootstrapPreview {
  readonly initialized: boolean;
  readonly checksum?: string;
  readonly rowCount: number;
  readonly duplicateKeys?: string[];
  readonly unmappedResourceNames?: string[];
  readonly missingColumns?: string[];
  readonly incompleteRows?: number[];
  readonly progressModeHeaderMissing?: boolean;
  readonly hasBlockingErrors?: boolean;
  readonly sample?: readonly {
    readonly tagname: string;
    readonly wo: string;
    readonly taskName: string;
    readonly resourceName: string;
    readonly progressMode: string;
  }[];
  readonly message?: string;
}

interface SyncPreview {
  readonly checksum: string;
  readonly status: "never" | "synced" | "pending" | "failed";
  readonly lastSyncedAt?: string;
  readonly lastError?: string;
  readonly range: string;
  readonly stats: {
    readonly totalTasks: number;
    readonly newTasks: number;
    readonly changedTasks: number;
    readonly changedAssignments: number;
    readonly changedReports: number;
    readonly cancelledTasks: number;
    readonly adHocTasks: number;
  };
}

const requestJson = async <T,>(url: string, body: unknown): Promise<T> => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || `Yêu cầu thất bại (HTTP ${response.status}).`);
  return payload;
};

const formatTimestamp = (value: string | undefined): string =>
  value ? new Date(value).toLocaleString("vi-VN") : "Chưa có";

const AdminUploadPage = (): React.ReactElement => {
  const router = useRouter();
  const {
    clearDemoProgress,
    createDemoProgress,
    currentAccount,
    data,
    logout,
    refreshRemoteData
  } = useAppData();
  const [bootstrap, setBootstrap] = useState<BootstrapPreview | null>(null);
  const [sync, setSync] = useState<SyncPreview | null>(null);
  const [busy, setBusy] = useState<"bootstrap-preview" | "bootstrap-apply" | "sync-preview" | "sync-apply" | "">("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!data) return;
    if (!currentAccount) router.replace("/login");
    if (currentAccount?.mustChangePassword) router.replace("/change-password");
  }, [currentAccount, data, router]);

  if (!data || !currentAccount || currentAccount.mustChangePassword) {
    return <main className="min-h-dvh p-6"><p className="text-sm text-[var(--text-muted)]">Đang kiểm tra đăng nhập...</p></main>;
  }
  if (currentAccount.role !== "admin" || !isDataAdminAccount(currentAccount)) {
    return (
      <main className="min-h-dvh px-4 py-8">
        <section className="mx-auto max-w-md rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-soft-sm)]">
          <h1 className="text-xl font-semibold">Không có quyền quản lý DATA</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Chỉ tài khoản DATA admin được khởi tạo và đồng bộ Google Sheet.</p>
          <Link className="focus-ring pressable mt-4 inline-flex min-h-11 items-center rounded-[var(--radius-field)] bg-[var(--primary-strong)] px-4 text-sm font-semibold text-[var(--primary-contrast)] no-underline shadow-[var(--shadow-soft-sm)]" href="/admin">Quay lại</Link>
        </section>
      </main>
    );
  }

  const loadBootstrap = async (): Promise<void> => {
    setBusy("bootstrap-preview");
    setMessage("");
    try {
      setBootstrap(await requestJson<BootstrapPreview>("/api/google-sheets/bootstrap", { action: "preview" }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không đọc được Google Sheet.");
    } finally {
      setBusy("");
    }
  };

  const applyBootstrap = async (): Promise<void> => {
    if (!bootstrap?.checksum) return;
    setBusy("bootstrap-apply");
    try {
      const result = await requestJson<BootstrapPreview>("/api/google-sheets/bootstrap", {
        action: "apply",
        expectedChecksum: bootstrap.checksum
      });
      setBootstrap(result);
      setMessage(`Đã khởi tạo ${result.rowCount} task từ Google Sheet.`);
      await refreshRemoteData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không khởi tạo được dữ liệu.");
    } finally {
      setBusy("");
    }
  };

  const loadSync = async (): Promise<void> => {
    setBusy("sync-preview");
    setMessage("");
    try {
      setSync(await requestJson<SyncPreview>("/api/google-sheets/sync-data", { action: "preview" }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không tạo được preview đồng bộ.");
    } finally {
      setBusy("");
    }
  };

  const applySync = async (): Promise<void> => {
    if (!sync?.checksum) return;
    setBusy("sync-apply");
    try {
      const result = await requestJson<SyncPreview & { updatedRows?: number }>("/api/google-sheets/sync-data", {
        action: "apply",
        expectedChecksum: sync.checksum
      });
      setMessage(`Đã đồng bộ ${result.updatedRows ?? result.stats.totalTasks} dòng A:AG sang Google Sheet.`);
      await loadSync();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không đồng bộ được Google Sheet.");
    } finally {
      setBusy("");
    }
  };

  const demoCount = data.progress.filter(isOfficialDemoProgress).length;

  return (
    <AdminShell
      account={currentAccount}
      onLogout={logout}
      subtitle="Database là nguồn dữ liệu chính; Google Sheet chỉ dùng để khởi tạo một lần và nhận snapshot đầu ra."
      title="Dữ liệu & Google Sheet"
    >
      {message ? <Alert tone="info">{message}</Alert> : null}
      <section className="grid items-start gap-3 xl:grid-cols-2">
        <Widget>
          <WidgetHeader action={<Icon name="upload" />} subtitle="Chỉ khả dụng khi database chưa có task kế hoạch" title="1. Khởi tạo từ Google Sheet" />
          <div className="mt-3 grid grid-cols-2 border-y border-[var(--line)]">
            <Metric label="Task trong database" value={String(data.tasks.length)} />
            <Metric label="Khởi tạo gần nhất" value={formatTimestamp(data.planVersion?.importedAt)} />
          </div>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button disabled={busy !== ""} onClick={() => void loadBootstrap()} variant="secondary">
              {busy === "bootstrap-preview" ? "Đang đọc..." : "Đọc và xem trước"}
            </Button>
            <Button disabled={!bootstrap?.checksum || bootstrap.initialized || bootstrap.hasBlockingErrors || busy !== ""} onClick={() => void applyBootstrap()}>
              {busy === "bootstrap-apply" ? "Đang khởi tạo..." : "Xác nhận khởi tạo"}
            </Button>
          </div>
          {bootstrap ? <BootstrapPanel preview={bootstrap} /> : null}
        </Widget>

        <Widget>
          <WidgetHeader action={<Icon name="spreadsheet" />} subtitle="Server tạo snapshot A:AG từ database; không nhận dữ liệu từ trình duyệt" title="2. Đồng bộ đầu ra" />
          <div className="mt-3 grid grid-cols-2 border-y border-[var(--line)]">
            <Metric label="Trạng thái" value={sync ? syncStatusLabel(sync.status) : "Chưa kiểm tra"} />
            <Metric label="Lần đồng bộ cuối" value={formatTimestamp(sync?.lastSyncedAt)} />
          </div>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <a className="focus-ring inline-flex min-h-11 items-center gap-2 border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--foreground)] no-underline" href="/api/exports/tasks"><Icon name="download" /> Xuất Excel</a>
            <Button disabled={data.tasks.length === 0 || busy !== ""} onClick={() => void loadSync()} variant="secondary">
              {busy === "sync-preview" ? "Đang so sánh..." : "Xem thay đổi"}
            </Button>
            <Button disabled={!sync?.checksum || sync.status === "synced" || busy !== ""} onClick={() => void applySync()}>
              {busy === "sync-apply" ? "Đang đồng bộ..." : "Xác nhận đồng bộ"}
            </Button>
          </div>
          {sync ? <SyncPanel preview={sync} /> : null}
        </Widget>
      </section>

      <Widget>
        <WidgetHeader subtitle={`Marker an toàn ${OFFICIAL_DEMO_NOTE_PREFIX}; không tác động task thật`} title="Dữ liệu demo trình bày" />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Metric label="Record demo hiện có" value={String(demoCount)} />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => { const result = createDemoProgress(); setMessage(`Đã tạo ${result.created} record demo.`); }} variant="secondary">Tạo demo</Button>
            <Button disabled={demoCount === 0} onClick={() => { const result = clearDemoProgress(); setMessage(`Đã xóa ${result.cleared} record demo.`); }} variant="danger">Xóa demo</Button>
          </div>
        </div>
      </Widget>
    </AdminShell>
  );
};

const BootstrapPanel = ({ preview }: { readonly preview: BootstrapPreview }): React.ReactElement => (
  <div className="mt-3 border-t border-[var(--line)] pt-3">
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone={preview.initialized ? "success" : preview.hasBlockingErrors ? "danger" : "info"}>{preview.initialized ? "Đã khóa khởi tạo" : preview.hasBlockingErrors ? "Cần sửa Sheet" : "Sẵn sàng"}</Badge>
      <span className="text-sm font-semibold">{preview.rowCount} dòng</span>
    </div>
    {preview.message ? <p className="mt-2 text-sm text-[var(--text-muted)]">{preview.message}</p> : null}
    {!preview.initialized ? (
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Key trùng Tag + WO" value={String(preview.duplicateKeys?.length ?? 0)} />
        <Metric label="Resource chưa map" value={String(preview.unmappedResourceNames?.length ?? 0)} />
        <Metric label="Cột thiếu" value={String(preview.missingColumns?.length ?? 0)} />
        <Metric label="Dòng thiếu dữ liệu" value={String(preview.incompleteRows?.length ?? 0)} />
        {preview.progressModeHeaderMissing ? (
          <p className="text-sm text-[var(--text-muted)] sm:col-span-2 xl:col-span-4">
            Sheet cũ chưa có tiêu đề AG. Hệ thống sẽ mặc định các task là 0-100 và tạo cột AG khi đồng bộ đầu ra.
          </p>
        ) : null}
      </div>
    ) : null}
    {preview.sample?.length ? (
      <div className="mt-3 divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {preview.sample.map((task) => <p className="break-words py-2 text-sm" key={`${task.tagname}|${task.wo}`}><span className="font-mono font-semibold">{task.tagname}</span> · {task.taskName} · {task.progressMode === "binary" ? "0/100" : "0-100"}</p>)}
      </div>
    ) : null}
  </div>
);

const SyncPanel = ({ preview }: { readonly preview: SyncPreview }): React.ReactElement => (
  <div className="mt-3 border-t border-[var(--line)] pt-3">
    <div className="flex flex-wrap items-center gap-2"><Badge tone={preview.status === "synced" ? "success" : preview.status === "failed" ? "danger" : "warning"}>{syncStatusLabel(preview.status)}</Badge><span className="font-mono text-sm">{preview.range}</span></div>
    <div className="mt-3 grid grid-cols-2 gap-px bg-[var(--line)] sm:grid-cols-4">
      <Metric label="Task mới" value={String(preview.stats.newTasks)} />
      <Metric label="Task thay đổi" value={String(preview.stats.changedTasks)} />
      <Metric label="Đổi phân công" value={String(preview.stats.changedAssignments)} />
      <Metric label="Báo cáo thay đổi" value={String(preview.stats.changedReports)} />
      <Metric label="Task phát sinh" value={String(preview.stats.adHocTasks)} />
      <Metric label="Task đã hủy" value={String(preview.stats.cancelledTasks)} />
      <Metric label="Tổng task" value={String(preview.stats.totalTasks)} />
      <Metric label="Checksum" value={preview.checksum.slice(0, 10)} />
    </div>
    {preview.lastError ? <Alert className="mt-3" tone="danger">{preview.lastError}</Alert> : null}
  </div>
);

const Metric = ({ label, value }: { readonly label: string; readonly value: string }): React.ReactElement => (
  <div className="min-w-0 bg-[var(--surface-muted)] px-3 py-2">
    <p className="text-sm text-[var(--text-muted)]">{label}</p>
    <p className="mt-1 break-words text-base font-semibold tabular-nums">{value}</p>
  </div>
);

const syncStatusLabel = (status: SyncPreview["status"]): string => {
  if (status === "synced") return "Đã đồng bộ";
  if (status === "pending") return "Chưa đồng bộ";
  if (status === "failed") return "Đồng bộ lỗi";
  return "Chưa từng đồng bộ";
};

export default AdminUploadPage;
