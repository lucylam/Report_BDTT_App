"use client";

import { useState } from "react";
import { Alert, Badge, Button, Widget, WidgetHeader } from "@/components/ui";
import { GROUP_IMPORT_SHEET, type GroupImportPreview } from "@/lib/google/groupImport";

interface Props {
  readonly busy: boolean;
  readonly demoMode: boolean;
  readonly onBusyChange: (busy: boolean) => void;
  readonly onImported: () => Promise<void>;
}

export const ThaoLapImportPanel = ({ busy, demoMode, onBusyChange, onImported }: Props): React.ReactElement => {
  const [preview, setPreview] = useState<GroupImportPreview | null>(null);
  const [activity, setActivity] = useState<"preview" | "apply" | "template" | "">("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<"changes" | "all">("changes");

  const downloadTemplate = async (): Promise<void> => {
    setActivity("template");
    onBusyChange(true);
    setError("");
    try {
      const response = await fetch("/api/google-sheets/import-thao-lap", { cache: "no-store" });
      if (!response.ok) {
        const result = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(result.error || "Không tải được mẫu Excel của nhóm.");
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "import-thao-lap.xlsx";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không tải được mẫu Excel.");
    } finally {
      setActivity("");
      onBusyChange(false);
    }
  };

  const run = async (action: "preview" | "apply"): Promise<void> => {
    setActivity(action);
    onBusyChange(true);
    setError("");
    setMessage("");
    const expectedChecksum = preview?.checksum;
    setPreview(null);
    setPage(0);
    try {
      const response = await fetch("/api/google-sheets/import-thao-lap", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, expectedChecksum })
      });
      const result = await response.json() as GroupImportPreview & {
        error?: string; applied?: { added: number; updated: number; progress: number; cancelled: number }
      };
      if (!response.ok) throw new Error(result.error || "Không import được dữ liệu nhóm.");
      if (action === "preview") setPreview(result);
      else {
        setMessage(`Đã import: ${result.applied?.added ?? 0} công việc mới, ${result.applied?.updated ?? 0} công việc cập nhật, ${result.applied?.progress ?? 0} báo cáo tiến độ; ${result.applied?.cancelled ?? 0} công việc được hủy.`);
        try { await onImported(); }
        catch { setError("Import đã thành công nhưng chưa tải lại được dữ liệu trên màn hình. Hãy tải lại trang."); }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không đọc được kết quả import.");
    } finally {
      setActivity("");
      onBusyChange(false);
    }
  };
  const visible = preview?.changes.filter((change) => filter === "all" || change.kind !== "unchanged") ?? [];
  const pageCount = Math.max(1, Math.ceil(visible.length / 10));
  const hasChanges = Boolean(preview && preview.stats.added + preview.stats.updated > 0);

  return (
    <Widget className="min-w-0">
      <WidgetHeader icon="upload" mobileCompact={false} title="Import riêng · Tháo lắp TB HTĐK" subtitle="Cập nhật WO và tiến độ từ Google Sheet vào web, kể cả khi đã có báo cáo" />
      <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
        Dán dữ liệu Excel của nhóm vào tab <strong className="break-all text-[var(--foreground)]">{preview?.sheetName || GROUP_IMPORT_SHEET}</strong>,
        giữ tiêu đề ở dòng 2 và dữ liệu từ dòng 3. Đọc và xem trước thay đổi, sau đó xác nhận import.
      </p>
      <details className="mt-3 rounded-[var(--radius-field)] border border-[var(--line)] p-3 text-sm leading-6">
        <summary className="focus-ring cursor-pointer font-semibold">Cấu trúc Sheet và quy tắc cập nhật</summary>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>A:M giữ cấu trúc mẫu ban đầu: Stt, Task Name, WO, Tagname, Nhóm, Đơn vị chủ quản, Section, Duration, Priority, Start, Finish, Resource Names, Nhóm trưởng.</li>
          <li>Từ N trở đi: cột ngày tiến độ (ví dụ 07/09/2026), Cancel, Ghi chú; có thể thêm Lý do hủy và Chế độ tiến độ. Total, %Complete, Còn lại không dùng để ghi tiến độ.</li>
          <li>Nhóm điền “Tháo/Lắp TB ĐK”. Resource Names phải khớp tên nhân sự của nhóm trên web. Tagname + WO là khóa đối chiếu; WO mới được ghi nhận là phát sinh.</li>
          <li>Tiến độ nhận 50%, 0,5 hoặc 50; số 1 được hiểu là 100%, muốn nhập một phần trăm hãy điền 1%. Ô trống giữ nguyên; nhập 0 để ghi nhận 0%.</li>
          <li>Cancel = X hoặc Hủy phải có Lý do hủy hoặc Ghi chú. Để trống Cancel không mở lại WO đã hủy. WO không có trong Sheet được giữ nguyên.</li>
          <li>Ghi chú được cập nhật cho ngày tiến độ mới nhất có dữ liệu trên mỗi dòng; ghi chú trống và ảnh cũ được giữ nguyên. Các ngày có số liệu được đối chiếu và cập nhật, có lưu lịch sử chỉnh sửa.</li>
        </ul>
      </details>
      {demoMode ? <Alert className="mt-3" tone="warning">Hãy kết thúc Demo Mode trước khi import dữ liệu nhóm.</Alert> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" disabled={busy || demoMode} onClick={() => void downloadTemplate()}>
          {activity === "template" ? "Đang tải mẫu Excel" : "Tải mẫu Excel của nhóm"}
        </Button>
        <Button disabled={busy || demoMode} onClick={() => void run("preview")} variant="secondary">
          {activity === "preview" ? "Đang đối chiếu dữ liệu" : "Đọc và xem trước import nhóm"}
        </Button>
        <Button disabled={busy || demoMode || !preview?.checksum || preview.hasBlockingErrors || !hasChanges} onClick={() => void run("apply")}>
          {activity === "apply" ? "Đang import dữ liệu nhóm" : "Xác nhận import nhóm"}
        </Button>
      </div>
      <div aria-live="polite" aria-atomic="true">
        {message ? <Alert className="mt-3" tone="success">{message}</Alert> : null}
        {error ? <Alert className="mt-3" tone="danger">{error}</Alert> : null}
      </div>
      {preview ? (
        <div className="mt-4 space-y-3 border-t border-[var(--line)] pt-4">
          <Badge tone={preview.hasBlockingErrors ? "danger" : hasChanges ? "warning" : "success"}>
            {preview.hasBlockingErrors ? "Cần sửa Sheet trước khi import" : hasChanges ? "Sẵn sàng kiểm tra và import" : "Dữ liệu đã khớp, không cần import lại"}
          </Badge>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {([
              ["Công việc trong Sheet", preview.stats.total], ["Công việc mới", preview.stats.added],
              ["Công việc cập nhật", preview.stats.updated], ["Không thay đổi", preview.stats.unchanged],
              ["Chuyển sang hủy", preview.stats.cancelled], ["Báo cáo tiến độ cập nhật", preview.stats.progress],
              ["Vắng khỏi Sheet · giữ nguyên", preview.stats.missing]
            ] as const).map(([label, value]) => (
              <div className="metric-card min-w-0 rounded-[var(--radius-field)] py-2 pl-3 pr-8" key={label}>
                <p className="break-words text-sm text-[var(--text-muted)]">{label}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
              </div>
            ))}
          </div>
          {preview.errors.length ? (
            <div className="rounded-[var(--radius-field)] border border-[var(--line)] p-3">
              <p className="font-semibold text-[var(--danger-strong)]">{preview.errors.length} lỗi · Chưa ghi dữ liệu nào</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
                {preview.errors.map((issue, index) => <li className="break-words" key={index}>Dòng {issue.row}: {issue.message}</li>)}
              </ul>
            </div>
          ) : null}
          <label className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            Hiển thị
            <select className="focus-ring min-h-11 max-w-full rounded-[var(--radius-field)] border border-[var(--line)] bg-[var(--surface)] p-2" value={filter}
              onChange={(event) => { setFilter(event.target.value as "changes" | "all"); setPage(0); }}>
              <option value="changes">Các dòng thay đổi</option><option value="all">Tất cả dòng hợp lệ</option>
            </select>
          </label>
          <div className="divide-y divide-[var(--line)]">
            {visible.slice(page * 10, (page + 1) * 10).map((change) => (
              <article className="min-w-0 py-3 text-sm leading-6" key={change.sheetRow}>
                <div className="flex flex-wrap items-start gap-2">
                  <Badge tone={change.kind === "new" ? "info" : change.kind === "updated" ? "warning" : "neutral"}>
                    {change.kind === "new" ? "Phát sinh" : change.kind === "updated" ? "Cập nhật" : "Giữ nguyên"}
                  </Badge>
                  {change.cancelled ? <Badge tone="danger">Hủy công việc</Badge> : null}
                  <span>Dòng {change.sheetRow}</span>
                </div>
                <p className="mt-1 break-all font-mono font-semibold">{change.tagname} · WO {change.wo}</p>
                <p className="break-words">{change.taskName}</p>
                {change.fields.length ? <p className="break-words text-[var(--text-muted)]">Thay đổi: {change.fields.join(", ")}.</p> : null}
                {change.details?.length ? <details className="mt-1"><summary className="focus-ring cursor-pointer font-semibold">Thông tin công việc sẽ import</summary>
                  <dl className="mt-2 space-y-2">{change.details.map((detail) => <div className="min-w-0 break-words" key={detail.label}>
                    <dt className="font-semibold">{detail.label}</dt>
                    {change.kind !== "new" ? <dd>Trước: {detail.before || "Trống"}</dd> : null}
                    <dd>Sau: {detail.after || "Trống"}</dd>
                  </div>)}</dl>
                </details> : null}
                {change.reports.length ? <details className="mt-1"><summary className="focus-ring cursor-pointer font-semibold">{change.reports.length} ngày tiến độ cập nhật</summary>
                  <ul className="mt-1 list-disc pl-5">{change.reports.map((report) => <li className="break-words" key={report.date}>{report.date}: {report.before === null ? "Chưa báo cáo" : `${report.before}%`} → {report.after}%{report.note ? <p>Ghi chú: {report.note}</p> : null}</li>)}</ul>
                </details> : null}
              </article>
            ))}
          </div>
          {pageCount > 1 ? <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Trang trước</Button>
            <span className="text-sm">Trang {page + 1}/{pageCount}</span>
            <Button variant="secondary" disabled={page + 1 >= pageCount} onClick={() => setPage(page + 1)}>Trang sau</Button>
          </div> : null}
          {preview.missingTasks.length ? <details className="text-sm leading-6"><summary className="focus-ring cursor-pointer font-semibold">{preview.missingTasks.length} công việc vắng khỏi Sheet, giữ nguyên trên web</summary>
            <ul className="mt-2 list-disc pl-5">{preview.missingTasks.map((task, index) => <li className="break-words" key={index}>{task.tagname} · WO {task.wo} · {task.taskName}</li>)}</ul>
          </details> : null}
        </div>
      ) : null}
    </Widget>
  );
};
