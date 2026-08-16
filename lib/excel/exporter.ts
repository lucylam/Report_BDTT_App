import * as XLSX from "xlsx";
import { REPORT_DATES, dateToExcelSerial } from "@/lib/date";
import { getTaskPercent } from "@/lib/progress";
import { toProgressModeCell } from "@/lib/progressMode";
import type { AppData, Task } from "@/types/domain";

export type ExportCellValue = string | number;

export interface SheetRangeValues {
  readonly range: string;
  readonly clearRange: string;
  readonly values: ExportCellValue[][];
}

export const DATA_BASE_HEADERS = [
  "Stt",
  "Task Name",
  "WO",
  "Tagname",
  "Nhóm",
  "Đơn vị chủ quản",
  "Section",
  "Duration",
  "Priority",
  "Start",
  "Finish",
  "Resource Names",
  "Nhóm trưởng"
] as const;

const getReporterLabel = (data: AppData, task: Task): string => {
  const reporter = data.profiles.find((profile) => profile.id === task.reporterId);
  return reporter?.fullName || reporter?.username || "";
};

const createBaseValues = (task: Task): ExportCellValue[] => [
  task.stt,
  task.taskName,
  task.wo,
  task.tagname,
  task.nhom,
  task.donVi,
  task.section,
  task.duration,
  task.priority,
  task.startDate,
  task.finishDate,
  task.resourceName,
  task.nhomTruong
];

const createBaseRow = (task: Task): Record<string, ExportCellValue> =>
  Object.fromEntries(
    DATA_BASE_HEADERS.map((header, index) => [header, createBaseValues(task)[index] ?? ""])
  );

const getLatestNote = (data: AppData, taskId: string): string =>
  [...data.progress]
    .filter((record) => record.taskId === taskId && record.note.trim())
    .sort((left, right) =>
      (right.submittedAt ?? "").localeCompare(left.submittedAt ?? "")
    )[0]?.note ?? "";

const getSheetNote = (data: AppData, task: Task): string => {
  const reporter = getReporterLabel(data, task);
  const note = getLatestNote(data, task.id);
  const parts = [reporter ? `Người báo cáo: ${reporter}` : "", note].filter(Boolean);
  return parts.join(" | ");
};

const createExportRow = (data: AppData, task: Task): Record<string, ExportCellValue> => {
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
  row["Ghi chú"] = getSheetNote(data, task);
  row["Chế độ tiến độ"] = toProgressModeCell(task.progressMode);
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

const createProgressValues = (
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
    getSheetNote(data, task)
  ];
};

export const buildExportRows = (data: AppData): Array<Record<string, ExportCellValue>> =>
  data.tasks.map((task) => createExportRow(data, task));

export const buildExportSheetValues = (data: AppData): ExportCellValue[][] => {
  const rows = buildExportRows(data);
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  return [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ""))];
};

export const buildProgressSheetRangeValues = (data: AppData): SheetRangeValues => {
  const values = data.tasks.map((task, index) => createProgressValues(data, task, index));
  const lastRow = Math.max(getExcelRowNumber(data.tasks.length - 1), 3);
  return { range: "N3", clearRange: `N3:AF${lastRow}`, values };
};

export const buildFullDataSheetRangeValues = (
  data: AppData,
  existingRowCount = 0
): SheetRangeValues => {
  const orderedTasks = [...data.tasks].sort(
    (left, right) => left.stt - right.stt || left.tagname.localeCompare(right.tagname, "vi")
  );
  const values = orderedTasks.map((task, index) => [
    ...createBaseValues(task),
    ...createProgressValues(data, task, index),
    toProgressModeCell(task.progressMode)
  ]);
  const lastRow = Math.max(values.length, existingRowCount, 1) + 2;
  return { range: "A3", clearRange: `A3:AG${lastRow}`, values };
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
    XLSX.writeFile(workbook, "bdtt-progress-export.xlsx", { compression: true });
  } catch (error) {
    console.error("[downloadExportWorkbook]", error);
    throw new Error("Không export được file Excel.");
  }
};
