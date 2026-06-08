import * as XLSX from "xlsx";
import type { ImportPreview, Profile, Task } from "@/types/domain";

const REQUIRED_HEADERS = [
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

type RequiredHeader = (typeof REQUIRED_HEADERS)[number];

type DataRow = Record<RequiredHeader, unknown>;

const normalizeHeader = (value: string): string => value.trim().toLowerCase();

const getString = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const getNumber = (value: unknown): number => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const normalizeResourceName = (value: string): string => {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
};

const getResourceNameSuffix = (value: string): string => {
  const parts = value.split("_");
  return normalizeResourceName(parts[parts.length - 1] ?? value);
};

const normalizePriority = (value: unknown): 1 | 2 | 3 => {
  const numberValue = Number(value);
  if (numberValue === 1) return 1;
  if (numberValue === 3) return 3;
  return 2;
};

const normalizeTaskDate = (value: unknown): string => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const text = getString(value);
  const match = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!match) return "";

  const day = match[1]?.padStart(2, "0") ?? "01";
  const month = match[2]?.padStart(2, "0") ?? "01";
  const rawYear = match[3] ?? "2025";
  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
  return `${year}-${month}-${day}`;
};

const createTaskId = (stt: number, tagname: string): string => {
  const safeTag = tagname.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `task-${stt}-${safeTag}`.replace(/-+$/g, "");
};

const findAssignedProfile = (
  profiles: readonly Profile[],
  resourceName: string
): string | null => {
  const normalizedResource = normalizeResourceName(resourceName);
  const resourceSuffix = getResourceNameSuffix(resourceName);
  return (
    profiles.find((profile) => {
      const profileResource = normalizeResourceName(profile.resourceName);
      return (
        profileResource === normalizedResource ||
        profileResource === resourceSuffix ||
        normalizedResource.endsWith(`_${profileResource}`)
      );
    })?.id ?? null
  );
};

const getHeaderMap = (worksheet: XLSX.WorkSheet): Map<string, string> => {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    header: 1,
    blankrows: false
  });
  const headerRow = rows.find((row) => {
    const values = Object.values(row).map((value) => getString(value));
    return values.includes("Stt") && values.includes("Tagname");
  });

  const map = new Map<string, string>();
  if (!headerRow) return map;

  Object.values(headerRow).forEach((header) => {
    const text = getString(header);
    if (text) map.set(normalizeHeader(text), text);
  });
  return map;
};

const isDataRow = (row: Partial<DataRow>): row is DataRow => {
  return Boolean(getString(row.Tagname));
};

export const parseDataSheet = (
  workbook: XLSX.WorkBook,
  existingProfiles: readonly Profile[]
): ImportPreview => {
  const worksheet = workbook.Sheets.DATA;
  if (!worksheet) {
    return {
      tasks: [],
      profiles: [...existingProfiles],
      rowCount: 0,
      unmappedResourceNames: [],
      missingColumns: ["DATA sheet"]
    };
  }

  const headerMap = getHeaderMap(worksheet);
  const missingColumns = REQUIRED_HEADERS.filter(
    (header) => !headerMap.has(normalizeHeader(header))
  );

  if (missingColumns.length > 0) {
    return {
      tasks: [],
      profiles: [...existingProfiles],
      rowCount: 0,
      unmappedResourceNames: [],
      missingColumns
    };
  }

  const rows = XLSX.utils.sheet_to_json<Partial<DataRow>>(worksheet, {
    range: 1,
    defval: ""
  });

  const unmapped = new Set<string>();
  const tasks = rows.filter(isDataRow).map((row) => {
    const stt = getNumber(row.Stt);
    const tagname = getString(row.Tagname);
    const resourceName = getString(row["Resource Names"]);
    const assignedTo = findAssignedProfile(existingProfiles, resourceName);
    if (!assignedTo && resourceName) unmapped.add(resourceName);

    return {
      id: createTaskId(stt, tagname),
      stt,
      taskName: getString(row["Task Name"]),
      wo: getString(row.WO),
      tagname,
      nhom: getString(row["Nhóm"]),
      donVi: getString(row["Đơn vị chủ quản"]),
      section: getString(row.Section),
      duration: getString(row.Duration),
      priority: normalizePriority(row.Priority),
      startDate: normalizeTaskDate(row.Start),
      finishDate: normalizeTaskDate(row.Finish),
      resourceName,
      nhomTruong: getString(row["Nhóm trưởng"]),
      assignedTo,
      isCancelled: false,
      cancelReason: ""
    } satisfies Task;
  });

  return {
    tasks,
    profiles: [...existingProfiles],
    rowCount: tasks.length,
    unmappedResourceNames: Array.from(unmapped).sort(),
    missingColumns: []
  };
};

export const parseExcelFile = async (
  file: File,
  existingProfiles: readonly Profile[]
): Promise<ImportPreview> => {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    return parseDataSheet(workbook, existingProfiles);
  } catch (error) {
    console.error("[parseExcelFile]", error);
    throw new Error("Không đọc được file Excel. Kiểm tra lại định dạng .xlsx.");
  }
};
