"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { DEFAULT_REPORT_DATE, formatViDate } from "@/lib/date";
import { downloadExportWorkbook } from "@/lib/excel/exporter";
import { parseExcelFile } from "@/lib/excel/parser";
import { isDataAdminAccount } from "@/lib/permissions";
import { useAppData } from "@/hooks/useAppData";
import type { ImportPreview, Task } from "@/types/domain";

const MAX_EXCEL_SIZE_BYTES = 5 * 1024 * 1024;

const AdminUploadPage = (): React.ReactElement => {
  const router = useRouter();
  const { currentAccount, data, logout, setImportedTasks } = useAppData();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [message, setMessage] = useState<string>("");
  const [isParsing, setIsParsing] = useState<boolean>(false);

  const handleFile = async (file: File): Promise<void> => {
    if (!data) return;
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

  const applyImport = (): void => {
    if (!preview || preview.missingColumns.length > 0) return;
    setImportedTasks(preview.tasks);
    setMessage(
      `Đã thay danh sách hiện tại bằng ${preview.tasks.length} hạng mục trong demo local.`
    );
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

  useEffect(() => {
    if (!data) return;
    if (!currentAccount) router.replace("/login");
    if (currentAccount?.mustChangePassword) router.replace("/change-password");
  }, [currentAccount, data, router]);

  if (!currentAccount || currentAccount.mustChangePassword) {
    return (
      <main className="min-h-dvh p-6">
        <p className="text-sm text-slate-600">Đang kiểm tra đăng nhập...</p>
      </main>
    );
  }

  const canManageData = isDataAdminAccount(currentAccount);

  if (currentAccount.role !== "admin" || !canManageData) {
    return (
      <main className="min-h-dvh px-4 py-8">
        <section className="soft-panel mx-auto max-w-md rounded-[2rem] p-6">
          <h1 className="text-xl font-semibold">Không có quyền import/export DATA</h1>
          <p className="mt-2 text-sm text-slate-600">
            Chỉ tài khoản vinhlpp được import và export DATA. Các admin khác vẫn có thể xem dashboard và danh sách hạng mục.
          </p>
          <Link
            className="focus-ring pressable mt-4 inline-flex min-h-11 items-center rounded-2xl bg-[var(--foreground)] px-4 text-sm font-semibold text-white"
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
      subtitle="Import DATA A:M và export file DATA đã có tiến độ worker."
      title="Import / Export Excel"
    >
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="soft-card rounded-3xl p-5 lg:p-6">
          <h2 className="text-xl font-semibold">Import hạng mục từ Excel</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            Chỉ đọc sheet DATA cột A:M. Các cột tiến độ sau M sẽ được tạo từ dữ liệu
            worker nhập trong app.
          </p>
          <label className="mt-5 block">
            <span className="text-sm font-semibold">Chọn file .xlsx</span>
            <input
              accept=".xlsx"
              className="focus-ring mt-2 block w-full rounded-2xl border border-[var(--border)] bg-white/90 p-3 text-base shadow-sm"
              disabled={!data || isParsing}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }}
              type="file"
            />
          </label>
          <div className="mt-4 rounded-2xl bg-[var(--warning-soft)] p-4 text-sm leading-6 text-[var(--warning)]">
            Khi xác nhận import, danh sách hạng mục hiện tại trong demo/local data sẽ được
            thay thế bằng file mới.
          </div>
          <button
            className="focus-ring pressable mt-4 min-h-11 w-full rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!preview || preview.missingColumns.length > 0}
            onClick={applyImport}
            type="button"
          >
            Xác nhận thay danh sách hạng mục
          </button>
        </div>

        <div className="soft-card rounded-3xl p-5 lg:p-6">
          <h2 className="text-xl font-semibold">Export DATA hoàn chỉnh</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            File export lấy danh sách hạng mục hiện tại và điền tiến độ, ghi chú mới nhất từ
            worker trong app.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Metric label="Ngày báo cáo" value={formatViDate(DEFAULT_REPORT_DATE)} />
            <Metric label="Tổng hạng mục" value={String(data?.tasks.length ?? 0)} />
          </div>
          <button
            className="focus-ring pressable mt-4 min-h-11 w-full rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3 text-sm font-semibold shadow-sm"
            disabled={!data}
            onClick={exportFile}
            type="button"
          >
            Export DATA hoàn chỉnh
          </button>
          {message ? (
            <p
              aria-live="polite"
              className="mt-4 rounded-2xl bg-white/70 p-3 text-sm text-slate-700 ring-1 ring-[var(--border)]"
            >
              {message}
            </p>
          ) : null}
        </div>
      </section>

      {preview ? <ImportPreviewPanel preview={preview} /> : null}
    </AdminShell>
  );
};

const ImportPreviewPanel = ({
  preview
}: {
  readonly preview: ImportPreview;
}): React.ReactElement => {
  return (
    <section className="soft-card rounded-3xl p-5 lg:p-6">
      <h2 className="text-xl font-semibold">Preview import</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Dòng hạng mục" value={String(preview.rowCount)} />
        <Metric label="Thiếu cột" value={String(preview.missingColumns.length)} />
        <Metric
          label="Worker chưa map"
          value={String(preview.unmappedResourceNames.length)}
        />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <PreviewList title="Missing columns" values={preview.missingColumns} />
        <PreviewList
          title="Unmapped Resource Names"
          values={preview.unmappedResourceNames.slice(0, 30)}
        />
      </div>
      <div className="mt-5">
        <h3 className="text-sm font-semibold text-slate-700">Sample 5 dòng đầu</h3>
        <div className="mt-2 grid gap-2">
          {preview.tasks.slice(0, 5).map((task) => (
            <SampleTask key={task.id} task={task} />
          ))}
        </div>
      </div>
    </section>
  );
};

const SampleTask = ({ task }: { readonly task: Task }): React.ReactElement => {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/70 p-3 text-sm shadow-sm">
      <p className="font-mono font-semibold">{task.tagname}</p>
      <p className="mt-1 text-slate-700">{task.taskName}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        {task.donVi || "N/A"} · {task.resourceName || "N/A"}
      </p>
    </div>
  );
};

const Metric = ({
  label,
  value
}: {
  readonly label: string;
  readonly value: string;
}): React.ReactElement => {
  return (
    <div className="rounded-2xl bg-white/70 p-4 shadow-sm ring-1 ring-[var(--border)]">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
};

const PreviewList = ({
  title,
  values
}: {
  readonly title: string;
  readonly values: readonly string[];
}): React.ReactElement => {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      {values.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">Không có</p>
      ) : (
        <ul className="mt-2 max-h-56 overflow-auto rounded-2xl border border-[var(--border)] bg-white/70 p-3 text-sm">
          {values.map((value) => (
            <li className="border-b border-[var(--border)] py-2 last:border-b-0" key={value}>
              {value}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminUploadPage;
