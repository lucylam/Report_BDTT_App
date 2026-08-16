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

const cell = (value: ExportCellValue | undefined): string =>
  value === undefined || value === null ? "" : String(value).trim();

const comparable = (value: string): string =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase();

const normalizeResource = (value: string): string =>
  comparable(value).replace(/[^a-z0-9]+/g, " ").trim();

const normalizeDate = (value: ExportCellValue | undefined): string => {
  if (typeof value === "number" && Number.isFinite(value)) return excelSerialToDate(value);
  const source = cell(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(source)) return source;
  const match = source.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (!match) return "";
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return `${year}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
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
    [0, "Stt"],
    [1, "Task Name"],
    [2, "WO"],
    [3, "Tagname"],
    [11, "Resource Names"]
  ] as const;
  const missingColumns = required
    .filter(([index, label]) => comparable(cell(headers[index])) !== comparable(label))
    .map(([, label]) => label);

  const unmapped = new Set<string>();
  const incompleteRows: number[] = [];
  const tasks = values.slice(1).flatMap((row, index): BootstrapTaskRow[] => {
    const tagname = cell(row[3]);
    if (!tagname) return [];
    const resourceName = cell(row[11]);
    if (!cell(row[1]) || !cell(row[2]) || !resourceName) incompleteRows.push(index + 3);
    const assignedTo = findProfile(profiles, resourceName);
    if (resourceName && !assignedTo) unmapped.add(resourceName);
    return [{
      stt: Number(row[0]) || index + 1,
      taskName: cell(row[1]),
      wo: cell(row[2]),
      tagname,
      nhom: cell(row[4]),
      donVi: cell(row[5]),
      section: cell(row[6]),
      duration: cell(row[7]),
      priority: toPriority(row[8]),
      startDate: normalizeDate(row[9]),
      finishDate: normalizeDate(row[10]),
      resourceName,
      nhomTruong: cell(row[12]),
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
