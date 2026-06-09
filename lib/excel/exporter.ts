import * as XLSX from "xlsx";
import { REPORT_DATES, dateToExcelSerial } from "@/lib/date";
import { getTaskPercent } from "@/lib/progress";
import type { AppData, Task } from "@/types/domain";

export type ExportCellValue = string | number;

const createBaseRow = (task: Task): Record<string, string | number> => {
  return {
    Stt: task.stt,
    "Task Name": task.taskName,
    WO: task.wo,
    Tagname: task.tagname,
    "Nhóm": task.nhom,
    "Đơn vị chủ quản": task.donVi,
    Section: task.section,
    Duration: task.duration,
    Priority: task.priority,
    Start: task.startDate,
    Finish: task.finishDate,
    "Resource Names": task.resourceName,
    "Nhóm trưởng": task.nhomTruong
  };
};

const getLatestNote = (data: AppData, taskId: string): string => {
  return (
    [...data.progress]
      .filter((record) => record.taskId === taskId && record.note.trim())
      .sort((left, right) =>
        (right.submittedAt ?? "").localeCompare(left.submittedAt ?? "")
      )[0]?.note ?? ""
  );
};

const createExportRow = (
  data: AppData,
  task: Task
): Record<string, string | number> => {
  const row = createBaseRow(task);
  let total = 0;

  REPORT_DATES.forEach((date) => {
    const percent = getTaskPercent(data.progress, task.id, date);
    const fraction = percent / 100;
    row[String(dateToExcelSerial(date))] = percent === 0 ? "" : fraction;
    total = Math.max(total, fraction);
  });

  row.Total = total;
  row["%Complete"] = total;
  row["Còn lại"] = 1 - total;
  row.Cancel = task.isCancelled ? "X" : "";
  row["Lý do Cancel"] = task.isCancelled ? task.cancelReason : "";
  row["Ghi chú"] = getLatestNote(data, task.id);
  return row;
};

export const buildExportRows = (data: AppData): Array<Record<string, ExportCellValue>> => {
  return data.tasks.map((task) => createExportRow(data, task));
};

export const buildExportSheetValues = (data: AppData): ExportCellValue[][] => {
  const rows = buildExportRows(data);
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  return [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ""))];
};

export const buildExportWorkbook = (data: AppData): XLSX.WorkBook => {
  const rows = buildExportRows(data);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "DATA");
  return workbook;
};

export const downloadExportWorkbook = (data: AppData): void => {
  try {
    const workbook = buildExportWorkbook(data);
    XLSX.writeFile(workbook, "bdtt-progress-export.xlsx", {
      compression: true
    });
  } catch (error) {
    console.error("[downloadExportWorkbook]", error);
    throw new Error("Không export được file Excel.");
  }
};
