import { excelSerialToDate } from "@/lib/date";
import type { ExportCellValue } from "@/lib/excel/exporter";
import { normalizeProgressMode } from "@/lib/progressMode";
import type { ProgressMode } from "@/types/domain";

export interface BootstrapProfile {
  readonly id: string;
  readonly username: string;
  readonly resourceName: string;
}

export interface BootstrapTaskRow {
  readonly stt: number;
  readonly taskName: string;
  readonly wo: string;
  readonly tagname: string;
  readonly nhom: string;
  readonly donVi: string;
  readonly section: string;
  readonly duration: string;
  readonly priority: 1 | 2 | 3;
  readonly startDate: string;
  readonly finishDate: string;
  readonly resourceName: string;
  readonly nhomTruong: string;
  readonly assignedTo: string | null;
  readonly progressMode: ProgressMode;
}

export interface BootstrapPreview {
  readonly tasks: BootstrapTaskRow[];
  readonly rowCount: number;
  readonly duplicateKeys: string[];
  readonly unmappedResourceNames: string[];
  readonly missingColumns: string[];
  readonly incompleteRows: number[];
  readonly progressModeHeaderMissing: boolean;
  readonly issues: BootstrapSheetIssue[];
}

export interface BootstrapSheetIssue {
  readonly type: "missing_column" | "duplicate_key" | "unmapped_resource" | "incomplete_row" | "empty_sheet";
  readonly rows: number[];
  readonly cells: string[];
  readonly message: string;
}

export interface BootstrapLockState {
  readonly isLocked: boolean;
  readonly canReinitialize: boolean;
  readonly message: string;
}

export const getBootstrapLockState = (
  taskCount: number,
  progressCount: number
): BootstrapLockState => {
  const safeTaskCount = Math.max(0, Math.floor(taskCount));
  const safeProgressCount = Math.max(0, Math.floor(progressCount));
  if (safeProgressCount > 0) {
    return {
      isLocked: true,
      canReinitialize: false,
      message: `Đã có ${safeProgressCount} báo cáo tiến độ. Chức năng khởi tạo lại đã được khóa.`
    };
  }
  if (safeTaskCount > 0) {
    return {
      isLocked: false,
      canReinitialize: true,
      message: `Database có ${safeTaskCount} task nhưng chưa có báo cáo tiến độ. Có thể thay thế kế hoạch từ Google Sheet.`
    };
  }
  return {
    isLocked: false,
    canReinitialize: false,
    message: "Database chưa có task kế hoạch. Có thể khởi tạo từ Google Sheet."
  };
};

const cell = (value: ExportCellValue | undefined): string =>
  value === undefined || value === null ? "" : String(value).trim();

const columnLetter = (zeroBasedIndex: number): string => {
  let value = zeroBasedIndex + 1;
  let result = "";
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
};

const cellAddress = (columnIndex: number, row: number): string =>
  `${columnLetter(columnIndex)}${row}`;

const comparable = (value: string): string =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase();

const normalizeResource = (value: string): string =>
  comparable(value).replace(/[^a-z0-9]+/g, " ").trim();

const normalizeDate = (value: ExportCellValue | undefined): string => {
  if (typeof value === "number" && Number.isFinite(value)) return excelSerialToDate(value);
  const source = cell(value).replace(/^(?:mon|tue|wed|thu|fri|sat|sun)\s+/i, "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(source)) return source;
  const match = source.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (match) {
    const year = match[3].length === 2 ? `20${match[3]}` : match[3];
    return `${year}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  }

  const namedMonthMatch = source.match(/^(\d{1,2})[\s/-]([a-z]{3})[\s/-](\d{2,4})$/i);
  if (!namedMonthMatch) return "";
  const month = [
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec"
  ].indexOf(namedMonthMatch[2].toLowerCase()) + 1;
  if (month === 0) return "";
  const year = namedMonthMatch[3].length === 2
    ? `20${namedMonthMatch[3]}`
    : namedMonthMatch[3];
  return `${year}-${String(month).padStart(2, "0")}-${namedMonthMatch[1].padStart(2, "0")}`;
};

const toPriority = (value: ExportCellValue | undefined): 1 | 2 | 3 => {
  const number = Number(value);
  return number === 1 || number === 3 ? number : 2;
};

const findProfile = (
  profiles: readonly BootstrapProfile[],
  resourceName: string
): string | null => {
  const resource = normalizeResource(resourceName);
  if (!resource) return null;
  return (
    profiles.find((profile) => {
      const profileResource = normalizeResource(profile.resourceName);
      return profileResource === resource || resource.endsWith(` ${profileResource}`);
    })?.id ?? null
  );
};

export const parseBootstrapSheet = (
  values: readonly (readonly ExportCellValue[])[],
  profiles: readonly BootstrapProfile[]
): BootstrapPreview => {
  const headers = values[0] ?? [];
  const required = [
    [1, "Task Name"],
    [2, "WO"],
    [3, "Tagname"],
    [4, "Nhóm"],
    [7, "Duration"],
    [9, "Start"],
    [10, "Finish"],
    [11, "Resource Names"],
    [12, "Nhóm trưởng"]
  ] as const;
  const missingColumnDefinitions = required.filter(
    ([index, label]) => comparable(cell(headers[index])) !== comparable(label)
  );
  const missingColumns = missingColumnDefinitions.map(([, label]) => label);

  const unmapped = new Set<string>();
  const incompleteRows: number[] = [];
  const issues: BootstrapSheetIssue[] = missingColumnDefinitions.map(([index, label]) => ({
    type: "missing_column",
    rows: [2],
    cells: [cellAddress(index, 2)],
    message: `Tiêu đề phải là “${label}”.`
  }));
  const taskRows = values.slice(1).flatMap((row, index): { readonly task: BootstrapTaskRow; readonly sheetRow: number }[] => {
    const hasData = row.slice(0, 13).some((value) => Boolean(cell(value)));
    if (!hasData) return [];

    const sheetRow = index + 3;

    const taskName = cell(row[1]);
    const wo = cell(row[2]);
    const tagname = cell(row[3]);
    const nhom = cell(row[4]);
    const duration = cell(row[7]);
    const startDate = normalizeDate(row[9]);
    const finishDate = normalizeDate(row[10]);
    const resourceName = cell(row[11]);
    const nhomTruong = cell(row[12]);
    const requiredValues = [
      { column: 1, label: "Task Name", value: taskName },
      { column: 2, label: "WO", value: wo },
      { column: 3, label: "Tagname", value: tagname },
      { column: 4, label: "Nhóm", value: nhom },
      { column: 7, label: "Duration", value: duration },
      { column: 9, label: "Start (trống hoặc sai định dạng)", value: startDate },
      { column: 10, label: "Finish (trống hoặc sai định dạng)", value: finishDate },
      { column: 11, label: "Resource Names", value: resourceName },
      { column: 12, label: "Nhóm trưởng", value: nhomTruong }
    ];
    const missingValues = requiredValues.filter((item) => !item.value);
    if (missingValues.length > 0) {
      incompleteRows.push(sheetRow);
      const addresses = missingValues.map((item) => cellAddress(item.column, sheetRow));
      issues.push({
        type: "incomplete_row",
        rows: [sheetRow],
        cells: addresses,
        message: `Thiếu hoặc sai: ${missingValues.map((item) => item.label).join(", ")}.`
      });
    }
    if (!tagname) return [];

    const assignedTo = findProfile(profiles, resourceName);
    if (resourceName && !assignedTo) {
      unmapped.add(resourceName);
      issues.push({
        type: "unmapped_resource",
        rows: [sheetRow],
        cells: [cellAddress(11, sheetRow)],
        message: `Resource “${resourceName}” chưa khớp tài khoản trên web.`
      });
    }
    return [{ task: {
      stt: Number(row[0]) || index + 1,
      taskName,
      wo,
      tagname,
      nhom,
      donVi: cell(row[5]),
      section: cell(row[6]),
      duration,
      priority: toPriority(row[8]),
      startDate,
      finishDate,
      resourceName,
      nhomTruong,
      assignedTo,
      progressMode: normalizeProgressMode(row[32])
    }, sheetRow }];
  });
  const tasks = taskRows.map((item) => item.task);
  if (tasks.length === 0 && issues.length === 0) {
    issues.push({
      type: "empty_sheet",
      rows: [3],
      cells: ["A3:AG3"],
      message: "Sheet chưa có dòng công việc để khởi tạo."
    });
  }

  const rowsByWo = new Map<string, number[]>();
  taskRows.forEach(({ task, sheetRow }) => {
    const wo = task.wo.trim().toUpperCase();
    rowsByWo.set(wo, [...(rowsByWo.get(wo) ?? []), sheetRow]);
  });
  const duplicateEntries = Array.from(rowsByWo.entries()).filter(([, rows]) => rows.length > 1);
  duplicateEntries.forEach(([wo, rows]) => {
    issues.push({
      type: "duplicate_key",
      rows,
      cells: rows.map((row) => cellAddress(2, row)),
      message: `WO “${wo}” bị trùng. Tagname được phép trùng nhưng WO phải duy nhất.`
    });
  });

  return {
    tasks,
    rowCount: tasks.length,
    duplicateKeys: duplicateEntries.map(([key]) => key),
    unmappedResourceNames: Array.from(unmapped).sort((a, b) => a.localeCompare(b, "vi")),
    missingColumns,
    incompleteRows,
    progressModeHeaderMissing:
      comparable(cell(headers[32])) !== comparable("Chế độ tiến độ"),
    issues
  };
};
