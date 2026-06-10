import * as XLSX from "xlsx";
import { REPORT_DATES, dateToExcelSerial } from "@/lib/date";
import { getTaskPercent } from "@/lib/progress";
import type { AppData, Task } from "@/types/domain";

export type ExportCellValue = string | number;

export interface SheetRangeValues {
  readonly range: string;
  readonly clearRange: string;
  readonly values: ExportCellValue[][];
}

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
  row["Ghi chú"] = getLatestNote(data, task.id);
  return row;
};

const getExcelRowNumber = (taskIndex: number): number => taskIndex + 3;

const createProgressFraction = (
  data: AppData,
  task: Task,
  reportDate: string
): ExportCellValue => {
  const percent = getTaskPercent(data.progress, task.id, reportDate);
  return percent === 0 ? "" : percent / 100;
};

const createProgressRangeRow = (
  data: AppData,
  task: Task,
  taskIndex: number
): ExportCellValue[] => {
  const excelRow = getExcelRowNumber(taskIndex);
  return [
    ...REPORT_DATES.map((date) => createProgressFraction(data, task, date)),
    `=MAX(N${excelRow}:AA${excelRow})`,
    `=AB${excelRow}`,
    `=1-AB${excelRow}`,
    task.isCancelled ? "X" : "",
    getLatestNote(data, task.id)
  ];
};

export const buildExportRows = (data: AppData): Array<Record<string, ExportCellValue>> => {
  return data.tasks.map((task) => createExportRow(data, task));
};

export const buildExportSheetValues = (data: AppData): ExportCellValue[][] => {
  const rows = buildExportRows(data);
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  return [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ""))];
};

export const buildProgressSheetRangeValues = (data: AppData): SheetRangeValues => {
  const values = data.tasks.map((task, index) =>
    createProgressRangeRow(data, task, index)
  );
  const lastRow = Math.max(getExcelRowNumber(data.tasks.length - 1), 3);
  return {
    range: "N3",
    clearRange: `N3:AF${lastRow}`,
    values
  };
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
