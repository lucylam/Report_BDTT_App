import { getOperationalReportDate } from "@/lib/date";
import { DATA_BASE_HEADERS, type ExportCellValue } from "@/lib/excel/exporter";
import { GROUP_IMPORT_NAME, isImportGroupTask, type GroupImportState } from "@/lib/google/groupImport";

export const buildGroupImportTemplate = (state: GroupImportState): ExportCellValue[][] => {
  const tasks = state.tasks.filter((task) => isImportGroupTask(task, state.profiles));
  const taskIds = new Set(tasks.map((task) => task.id));
  const reports = state.progress.filter((report) => taskIds.has(report.task_id));
  const dates = Array.from(new Set([...reports.map((report) => report.report_date), getOperationalReportDate()])).sort();
  const latest = new Map<string, (typeof reports)[number]>();
  reports.forEach((report) => {
    const key = `${report.task_id}|${report.report_date}`;
    const previous = latest.get(key);
    if (!previous || report.submitted_at > previous.submitted_at || (report.submitted_at === previous.submitted_at && report.id > previous.id)) latest.set(key, report);
  });
  return [
    ["Dòng 2 là tiêu đề. Tiến độ: 50% hoặc 50; ô trống giữ nguyên. Cancel = X phải kèm Lý do hủy. WO vắng khỏi Sheet giữ nguyên."],
    [...DATA_BASE_HEADERS, ...dates, "Cancel", "Ghi chú", "Lý do hủy", "Chế độ tiến độ"],
    ...tasks.map((task, index) => [
      index + 1, task.task_name, task.wo, task.tagname, GROUP_IMPORT_NAME, task.don_vi ?? "", task.section ?? "", task.duration,
      task.priority, task.start_date, task.finish_date, task.resource_name, task.nhom_truong,
      ...dates.map((date) => {
        const report = latest.get(`${task.id}|${date}`);
        return report ? `${report.percent}%` : "";
      }), task.is_cancelled ? "X" : "", "", task.cancel_reason ?? "", task.progress_mode === "binary" ? "0/100" : "0-100"
    ])
  ];
};
