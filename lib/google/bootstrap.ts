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
  const missingColumns = required
    .filter(([index, label]) => comparable(cell(headers[index])) !== comparable(label))
    .map(([, label]) => label);

  const unmapped = new Set<string>();
  const incompleteRows: number[] = [];
  const tasks = values.slice(1).flatMap((row, index): BootstrapTaskRow[] => {
    const hasData = row.slice(0, 13).some((value) => Boolean(cell(value)));
    if (!hasData) return [];

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
      tagname,
      resourceName,
      nhomTruong,
      startDate,
      finishDate,
      nhom,
      duration,
      wo,
      taskName
    ];
    if (requiredValues.some((value) => !value)) incompleteRows.push(index + 3);
    if (!tagname) return [];

    const assignedTo = findProfile(profiles, resourceName);
    if (resourceName && !assignedTo) unmapped.add(resourceName);
    return [{
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
    }];
  });

  const counts = new Map<string, number>();
  tasks.forEach((task) => {
    const key = `${task.tagname.trim().toUpperCase()}|${task.wo.trim().toUpperCase()}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return {
    tasks,
    rowCount: tasks.length,
    duplicateKeys: Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([key]) => key),
    unmappedResourceNames: Array.from(unmapped).sort((a, b) => a.localeCompare(b, "vi")),
    missingColumns,
    incompleteRows,
    progressModeHeaderMissing:
      comparable(cell(headers[32])) !== comparable("Chế độ tiến độ")
  };
};
