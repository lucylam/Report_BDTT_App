import type { ExportCellValue } from "@/lib/excel/exporter";

export interface SheetSnapshotStats {
  readonly totalTasks: number;
  readonly newTasks: number;
  readonly changedTasks: number;
  readonly changedAssignments: number;
  readonly changedReports: number;
  readonly cancelledTasks: number;
  readonly adHocTasks: number;
}

const normalizeCell = (value: ExportCellValue | undefined): string =>
  value === undefined || value === null ? "" : String(value).trim();

const normalizeRow = (row: readonly ExportCellValue[]): string[] =>
  Array.from({ length: 33 }, (_, index) => normalizeCell(row[index]));

const rowKey = (row: readonly ExportCellValue[]): string =>
  `${normalizeCell(row[3]).toUpperCase()}|${normalizeCell(row[2]).toUpperCase()}`;

const getCancelCell = (row: readonly ExportCellValue[]): string => {
  const totalIndex = row.findIndex(
    (value, index) => index >= 13 && normalizeCell(value).startsWith("=MAX(N")
  );
  return normalizeCell(row[totalIndex >= 0 ? totalIndex + 3 : 30]);
};

export const compareSheetSnapshot = (
  currentRows: readonly (readonly ExportCellValue[])[],
  existingRows: readonly (readonly ExportCellValue[])[],
  adHocTaskCount: number
): SheetSnapshotStats => {
  const existingByKey = new Map(
    existingRows.filter((row) => rowKey(row) !== "|").map((row) => [rowKey(row), normalizeRow(row)])
  );
  let newTasks = 0;
  let changedTasks = 0;
  let changedAssignments = 0;
  let changedReports = 0;
  let cancelledTasks = 0;

  currentRows.forEach((row) => {
    const normalized = normalizeRow(row);
    const previous = existingByKey.get(rowKey(row));
    if (!previous) {
      newTasks += 1;
    } else if (JSON.stringify(previous) !== JSON.stringify(normalized)) {
      changedTasks += 1;
      if (previous[11] !== normalized[11]) changedAssignments += 1;
      if (JSON.stringify(previous.slice(13)) !== JSON.stringify(normalized.slice(13))) {
        changedReports += 1;
      }
    }
    if (getCancelCell(normalized).toUpperCase() === "X") cancelledTasks += 1;
  });

  return {
    totalTasks: currentRows.length,
    newTasks,
    changedTasks,
    changedAssignments,
    changedReports,
    cancelledTasks,
    adHocTasks: adHocTaskCount
  };
};
