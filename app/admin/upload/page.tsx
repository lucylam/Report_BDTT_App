"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Alert, Button, Icon, Widget, WidgetHeader } from "@/components/ui";
import { DEFAULT_REPORT_DATE, formatViDate } from "@/lib/date";
import { downloadExportWorkbook } from "@/lib/excel/exporter";
import { parseExcelFile } from "@/lib/excel/parser";
import { isDataAdminAccount } from "@/lib/permissions";
import { useAppData } from "@/hooks/useAppData";
import type { ImportPreview, Task } from "@/types/domain";

const MAX_EXCEL_SIZE_BYTES = 5 * 1024 * 1024;

const readApiResult = async <T extends { readonly error?: string }>(
  response: Response
): Promise<T | { readonly error: string }> => {
  const text = await response.text();
  if (!text) return { error: `HTTP ${response.status}: server không trả nội dung.` };

  try {
    return JSON.parse(text) as T;
  } catch {
    return {
      error: `HTTP ${response.status}: ${text.slice(0, 240)}`
    };
  }
};

const AdminUploadPage = (): React.ReactElement => {
  const router = useRouter();
  const { currentAccount, data, logout, setImportedTasks } = useAppData();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [message, setMessage] = useState<string>("");
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isSyncingSheet, setIsSyncingSheet] = useState<boolean>(false);
  const [selectedFileName, setSelectedFileName] = useState<string>("");

  const handleFile = async (file: File): Promise<void> => {
    if (!data) return;
    setSelectedFileName(file.name);
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setMessage("Chỉ hỗ trợ file .xlsx.");
      return;
    }
    if (file.size > MAX_EXCEL_SIZE_BYTES) {
      setMessage("File Excel vượt quá 5MB. Hãy kiểm tra lại file import.");
      return;
    }
    setIsParsing(true);
    setMessage("");
    try {
      const result = await parseExcelFile(file, data.profiles);
      setPreview(result);
      if (result.missingColumns.length > 0) {
        setMessage("File thiếu cột bắt buộc. Chưa thể import.");
      } else {
        setMessage(`Đã đọc ${result.rowCount} dòng từ sheet DATA A:M.`);
      }
    } catch (error) {
      console.error("[AdminUploadPage.handleFile]", error);
      setMessage(error instanceof Error ? error.message : "Lỗi đọc file Excel.");
    } finally {
      setIsParsing(false);
    }
  };

  const applyImport = async (): Promise<void> => {
    if (!preview || preview.missingColumns.length > 0 || !currentAccount) return;
    setIsImporting(true);
    setMessage("");
    try {
      const response = await fetch("/api/tasks/import", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          fileName: selectedFileName || "DATA.xlsx",
          importedByUsername: currentAccount.username,
          tasks: preview.tasks
        })
      });
      const result = (await readApiResult(response)) as
        | {
            readonly ok?: boolean;
            readonly inserted?: number;
            readonly updated?: number;
            readonly error?: string;
          }
        | null;

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error || `Không import được DATA vào database. HTTP ${response.status}.`
        );
      }

      setImportedTasks(preview.tasks);
      setMessage(
        `Đã import ${preview.tasks.length} hạng mục: thêm ${result.inserted ?? 0}, cập nhật ${
          result.updated ?? 0
        } trong database.`
      );
    } catch (error) {
      console.error("[AdminUploadPage.applyImport]", error);
      setMessage(error instanceof Error ? error.message : "Lỗi import DATA vào database.");
    } finally {
      setIsImporting(false);
    }
  };

  const exportFile = (): void => {
    if (!data) return;
    try {
      downloadExportWorkbook(data);
      setMessage(
        `Đã export bdtt-progress-export.xlsx từ dữ liệu ${formatViDate(
          DEFAULT_REPORT_DATE
        )}, tổng ${data.tasks.length} hạng mục.`
      );
    } catch (error) {
      console.error("[AdminUploadPage.exportFile]", error);
      setMessage(error instanceof Error ? error.message : "Lỗi export Excel.");
    }
  };

  const syncGoogleSheet = async (): Promise<void> => {
    if (!data) return;
    setIsSyncingSheet(true);
    setMessage("");
    try {
      const response = await fetch("/api/google-sheets/sync-data", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(data)
      });
      const result = (await readApiResult(response)) as
        | {
            readonly ok?: boolean;
            readonly updatedRows?: number;
            readonly updatedColumns?: number;
            readonly range?: string;
            readonly error?: string;
          }
        | null;

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error || `Không sync được Google Sheet DATA. HTTP ${response.status}.`
        );
      }

      setMessage(
        `Đã đẩy ${result.updatedRows ?? 0} dòng, ${result.updatedColumns ?? 0} cột (${result.range ?? "N:AF"}) về Google Sheet DATA.`
      );
    } catch (error) {
      console.error("[AdminUploadPage.syncGoogleSheet]", error);
      setMessage(error instanceof Error ? error.message : "Lỗi sync Google Sheet DATA.");
    } finally {
      setIsSyncingSheet(false);
    }
  };

  useEffect(() => {
    if (!data) return;
    if (!currentAccount) router.replace("/login");
    if (currentAccount?.mustChangePassword) router.replace("/change-password");
  }, [currentAccount, data, router]);

  if (!currentAccount || currentAccount.mustChangePassword) {
    return (
      <main className="min-h-dvh p-6">
        <p className="text-sm text-[var(--text-muted)]">Đang kiểm tra đăng nhập...</p>
      </main>
    );
  }

  const canManageData = isDataAdminAccount(currentAccount);

  if (currentAccount.role !== "admin" || !canManageData) {
    return (
      <main className="min-h-dvh px-4 py-8">
        <section className="glass-card mx-auto max-w-md rounded-[var(--radius-card)] p-6">
          <h1 className="text-xl font-semibold">Không có quyền import/export DATA</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            Chỉ tài khoản được phân quyền DATA admin mới được import và export DATA.
          </p>
          <Link
            className="focus-ring pressable mt-4 inline-flex min-h-12 items-center rounded-[var(--radius-field)] bg-[var(--primary-strong)] px-4 text-sm font-semibold text-[var(--primary-contrast)] hover:bg-[var(--primary)]"
            href={currentAccount.role === "admin" ? "/admin" : "/worker"}
          >
            Quay lại
          </Link>
        </section>
      </main>
    );
  }

  return (
    <AdminShell
      account={currentAccount}
      onLogout={logout}
      subtitle="Import DATA A:M, export tiến độ worker và đồng bộ Google Sheets."
      title="Import / Export DATA"
    >
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.82fr)]">
        <Widget className="p-5 lg:p-6">
          <WidgetHeader
            action={<Icon className="text-[var(--primary-strong)]" name="upload" />}
            subtitle="Bước 1: chọn file, kiểm tra preview, sau đó mới ghi database"
            title="Import hạng mục từ Excel"
          />
          <label className="mt-5 block">
            <span className="text-sm font-semibold">Chọn file .xlsx</span>
            <input
              accept=".xlsx"
              className="focus-ring mt-2 block w-full rounded-[var(--radius-field)] border border-[var(--line)] bg-[var(--surface)] p-3 text-base text-[var(--foreground)] shadow-[var(--shadow-soft-sm)]"
              disabled={!data || isParsing}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }}
              type="file"
            />
          </label>
          <Alert className="mt-4 p-4 leading-6" tone="warning">
            Khi xác nhận import, danh sách hạng mục hiện tại sẽ được ghi vào database và thay
            thế bằng file mới trên web.
          </Alert>
          <Button
            className="mt-4"
            disabled={!preview || preview.missingColumns.length > 0 || isImporting}
            full
            onClick={() => void applyImport()}
          >
            {isImporting ? (
              <>
                <Icon className="animate-spin" name="loading" />
                Đang import vào database...
              </>
            ) : (
              <>
                <Icon name="database" />
                Xác nhận thay danh sách hạng mục
              </>
            )}
          </Button>
        </Widget>

        <Widget className="p-5 lg:p-6">
          <WidgetHeader
            action={<Icon className="text-[var(--accent-strong)]" name="download" />}
            subtitle={`Dữ liệu ngày báo cáo ${formatViDate(DEFAULT_REPORT_DATE)}`}
            title="Export và đồng bộ"
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
            <Metric label="Ngày báo cáo" value={formatViDate(DEFAULT_REPORT_DATE)} />
            <Metric label="Tổng hạng mục" value={String(data?.tasks.length ?? 0)} />
          </div>
          <Button className="mt-4" disabled={!data} full onClick={exportFile} variant="secondary">
            <Icon name="download" />
            Export DATA hoàn chỉnh
          </Button>
          <Button
            className="mt-3"
            disabled={!data || isSyncingSheet}
            full
            onClick={() => void syncGoogleSheet()}
          >
            {isSyncingSheet ? (
              <>
                <Icon className="animate-spin" name="loading" />
                Đang đẩy lên Google Sheet...
              </>
            ) : (
              <>
                <Icon name="spreadsheet" />
                Đẩy lên Google Sheet DATA
              </>
            )}
          </Button>
          {message ? (
            <p
              aria-live="polite"
              className="mt-4 rounded-[var(--radius-field)] bg-[var(--surface-muted)] p-3 text-sm text-[var(--text-muted)] ring-1 ring-[var(--line)]"
            >
              {message}
            </p>
          ) : null}
        </Widget>
      </section>

      {preview ? <ImportPreviewPanel preview={preview} /> : null}
    </AdminShell>
  );
};

const ImportPreviewPanel = ({
  preview
}: {
  readonly preview: ImportPreview;
}): React.ReactElement => (
  <Widget className="p-5 lg:p-6">
    <WidgetHeader
      subtitle="Chỉ khi preview hợp lệ mới cho phép import"
      title="Xem trước dữ liệu import"
    />
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <Metric label="Dòng hạng mục" value={String(preview.rowCount)} />
      <Metric label="Thiếu cột" value={String(preview.missingColumns.length)} />
      <Metric label="Worker chưa map" value={String(preview.unmappedResourceNames.length)} />
    </div>
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <PreviewList title="Cột thiếu" values={preview.missingColumns} />
      <PreviewList
        title="Resource chưa map"
        values={preview.unmappedResourceNames.slice(0, 30)}
      />
    </div>
    <div className="mt-5">
      <h3 className="text-sm font-semibold text-[var(--foreground)]">Sample 5 dòng đầu</h3>
      <div className="mt-2 grid gap-2">
        {preview.tasks.slice(0, 5).map((task) => (
          <SampleTask key={task.id} task={task} />
        ))}
      </div>
    </div>
  </Widget>
);

const SampleTask = ({ task }: { readonly task: Task }): React.ReactElement => (
  <div className="rounded-[var(--radius-field)] border border-[var(--line)] bg-[var(--surface-muted)] p-3 text-sm">
    <p className="font-mono font-semibold">{task.tagname}</p>
    <p className="mt-1 text-[var(--text-muted)]">{task.taskName}</p>
    <p className="mt-1 text-xs text-[var(--text-muted)]">
      {task.donVi || "N/A"} · {task.resourceName || "N/A"}
    </p>
  </div>
);

const Metric = ({
  label,
  value
}: {
  readonly label: string;
  readonly value: string;
}): React.ReactElement => (
  <div className="metric-card rounded-[var(--radius-card)] p-4">
    <p className="text-sm text-[var(--text-muted)]">{label}</p>
    <p className="mt-1 text-2xl font-semibold">{value}</p>
  </div>
);

const PreviewList = ({
  title,
  values
}: {
  readonly title: string;
  readonly values: readonly string[];
}): React.ReactElement => (
  <div>
    <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
    {values.length === 0 ? (
      <p className="mt-2 text-sm text-[var(--text-muted)]">Không có</p>
    ) : (
      <ul className="mt-2 max-h-56 overflow-auto rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface-muted)] p-3 text-sm">
        {values.map((value) => (
          <li className="border-b border-[var(--line)] py-2 last:border-b-0" key={value}>
            {value}
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default AdminUploadPage;
