import { excelSerialToDate } from "@/lib/date";
import type { ExportCellValue } from "@/lib/excel/exporter";
import { ORG_GROUPS } from "@/lib/org2026";
import { createTaskReporterPeople, resolveTaskReporterId } from "@/lib/taskReporter";
import type { OrgRole, ProgressMode } from "@/types/domain";

export const GROUP_IMPORT_SHEET = "IMPORT_THAO_LAP";
export const GROUP_IMPORT_NAME = ORG_GROUPS.thaoLap;
export const GROUP_IMPORT_MIGRATION = "20260907000100_bdtt_thao_lap_import.sql";

export interface ImportProfile {
  readonly id: string;
  readonly username: string;
  readonly resource_name: string | null;
  readonly org_group: string | null;
  readonly subgroup: string | null;
  readonly org_role: OrgRole | null;
  readonly is_active: boolean;
}

export interface ImportTaskFields {
  readonly task_name: string;
  readonly wo: string;
  readonly tagname: string;
  readonly nhom: string;
  readonly don_vi: string;
  readonly section: string;
  readonly duration: string;
  readonly priority: number;
  readonly start_date: string;
  readonly finish_date: string;
  readonly resource_name: string;
  readonly nhom_truong: string;
  readonly assigned_to: string;
  readonly reporter_id: string;
  readonly progress_mode: ProgressMode;
  readonly is_cancelled: boolean;
  readonly cancel_reason: string;
}

export interface ImportDbTask extends Omit<ImportTaskFields, "assigned_to" | "reporter_id"> {
  readonly id: string;
  readonly stt: number;
  readonly assigned_to: string | null;
  readonly reporter_id: string | null;
  readonly task_source: "plan" | "ad_hoc";
  readonly updated_at: string;
  readonly trial_run_id: string | null;
}

export interface ImportDbProgress {
  readonly id: string;
  readonly task_id: string;
  readonly user_id: string;
  readonly report_date: string;
  readonly percent: number;
  readonly note: string | null;
  readonly submitted_at: string;
}

export interface GroupImportState {
  readonly version: string;
  readonly trialActive: boolean;
  readonly profiles: readonly ImportProfile[];
  readonly tasks: readonly ImportDbTask[];
  readonly progress: readonly ImportDbProgress[];
}

// Match the application's existing seed + DB override rules, including older
// profiles whose organization columns have not been populated yet.
export const resolveGroupImportState = (state: GroupImportState): GroupImportState => {
  const people = createTaskReporterPeople(state.profiles);
  return { ...state, profiles: state.profiles.map((profile) => {
    const person = people.find((candidate) => candidate.id === profile.id);
    return person ? { ...profile, org_group: person.orgGroup, subgroup: person.subgroup, org_role: person.orgRole } : profile;
  }) };
};

export interface ImportedReport {
  readonly report_date: string;
  readonly percent: number;
  // A blank Sheet note preserves the existing report note.
  readonly note: string | null;
}

export interface GroupImportRow extends ImportTaskFields {
  readonly id: string | null;
  readonly sheetRow: number;
  readonly reports: readonly ImportedReport[];
}

export interface GroupImportChange {
  readonly sheetRow: number;
  readonly tagname: string;
  readonly wo: string;
  readonly taskName: string;
  readonly kind: "new" | "updated" | "unchanged";
  readonly fields: readonly string[];
  readonly details?: readonly { readonly label: string; readonly before: string; readonly after: string }[];
  readonly reports: readonly { readonly date: string; readonly before: number | null; readonly after: number; readonly note?: string }[];
  readonly cancelled: boolean;
}

export interface GroupImportPreview {
  readonly checksum?: string;
  readonly sheetName: string;
  readonly groupName: string;
  readonly hasBlockingErrors: boolean;
  readonly errors: readonly { readonly row: number; readonly message: string }[];
  readonly stats: {
    readonly total: number;
    readonly added: number;
    readonly updated: number;
    readonly unchanged: number;
    readonly cancelled: number;
    readonly progress: number;
    readonly missing: number;
  };
  readonly changes: readonly GroupImportChange[];
  readonly missingTasks: readonly { readonly wo: string; readonly tagname: string; readonly taskName: string }[];
}

const text = (value: unknown): string => value == null ? "" : String(value).trim();
const normalize = (value: unknown): string => text(value).normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase()
  .replace(/[^a-z0-9%]+/g, " ").trim();
const GROUP_ALIASES = [GROUP_IMPORT_NAME, "Tháo lắp TB HTĐK", "Tháo lắp TB điều khiển"].map(normalize);
export const isImportGroupName = (value: unknown): boolean => GROUP_ALIASES.includes(normalize(value));
const keyOf = (task: { readonly tagname: string; readonly wo: string }): string =>
  `${task.tagname.trim().toUpperCase()}|${task.wo.trim().toUpperCase()}`;

export const isImportGroupTask = (task: ImportDbTask, profiles: readonly ImportProfile[]): boolean => {
  if (task.trial_run_id) return false;
  const assignee = profiles.find((profile) => profile.id === task.assigned_to);
  return assignee ? assignee.org_group === GROUP_IMPORT_NAME : !task.assigned_to && isImportGroupName(task.nhom);
};

export const parseImportDate = (value: unknown): string => {
  let source = text(value).replace(/^(?:mon|tue|wed|thu|fri|sat|sun)\s+/i, "");
  if (typeof value === "number" || /^\d{5}$/.test(source)) {
    const serial = Number(value);
    if (!Number.isInteger(serial) || serial < 36526 || serial > 73050) return "";
    source = excelSerialToDate(serial);
  }
  const dmy = source.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
  if (dmy) source = `${dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const named = source.match(/^(\d{1,2})[\s/-]([a-z]{3})[\s/-](\d{2}|\d{4})$/i);
  if (named) {
    const month = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(named[2].toLowerCase()) + 1;
    source = `${named[3].length === 2 ? `20${named[3]}` : named[3]}-${String(month).padStart(2, "0")}-${named[1].padStart(2, "0")}`;
  }
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(source)) return "";
  const date = new Date(`${source}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === source ? source : "";
};

export const parseImportPercent = (value: unknown): number | null => {
  const source = text(value).replace(",", ".");
  if (!/^\d+(?:\.\d+)?\s*%?$/.test(source)) return null;
  const number = Number(source.replace(/\s*%$/, ""));
  // Google Sheets UNFORMATTED_VALUE returns percentage cells as fractions.
  const percent = source.endsWith("%") ? number : number <= 1 ? number * 100 : number;
  const rounded = Math.round(percent);
  return percent >= 0 && percent <= 100 && Math.abs(percent - rounded) < 0.000001 ? rounded : null;
};

const FIELD_LABELS: Record<keyof ImportTaskFields, string> = {
  task_name: "Nội dung", wo: "WO", tagname: "Tagname", nhom: "Nhóm", don_vi: "Đơn vị",
  section: "Section", duration: "Duration", priority: "Priority", start_date: "Start", finish_date: "Finish",
  resource_name: "Resource Names", nhom_truong: "Nhóm trưởng", assigned_to: "Người thực hiện",
  reporter_id: "Người báo cáo", progress_mode: "Chế độ tiến độ", is_cancelled: "Trạng thái hủy", cancel_reason: "Lý do hủy"
};

export const planGroupImport = (
  values: readonly (readonly ExportCellValue[])[],
  state: GroupImportState,
  sheetName = GROUP_IMPORT_SHEET
): { readonly preview: GroupImportPreview; readonly rows: readonly GroupImportRow[] } => {
  const headers = values[0] ?? [];
  const errors: { row: number; message: string }[] = [];
  const fail = (row: number, message: string): void => { errors.push({ row, message }); };
  const requiredHeaders = ["Stt", "Task Name", "WO", "Tagname", "Nhóm", "Đơn vị chủ quản", "Section", "Duration", "Priority", "Start", "Finish", "Resource Names", "Nhóm trưởng"];
  requiredHeaders.forEach((label, index) => {
    if (normalize(headers[index]) !== normalize(label)) fail(2, `Cột ${index + 1} phải có tiêu đề “${label}”.`);
  });
  const findColumn = (name: string): number => {
    const matches = headers.flatMap((header, index) => normalize(header) === normalize(name) ? [index] : []);
    if (matches.length > 1) fail(2, `Trùng cột “${name}”.`);
    return matches[0] ?? -1;
  };
  const cancelColumn = findColumn("Cancel");
  const noteColumn = findColumn("Ghi chú");
  const reasonColumn = findColumn("Lý do hủy");
  const modeColumn = findColumn("Chế độ tiến độ");
  if (cancelColumn < 0) fail(2, "Thiếu cột Cancel (X = hủy; để trống = giữ trạng thái hiện có).");
  const dates: { index: number; date: string }[] = [];
  const ignoredHeaders = ["Total", "%Complete", "Còn lại", "Cancel", "Ghi chú", "Lý do hủy", "Chế độ tiến độ"].map(normalize);
  headers.slice(13).forEach((header, offset) => {
    const date = parseImportDate(header);
    if (date) {
      if (dates.some((entry) => entry.date === date)) fail(2, `Trùng ngày tiến độ ${date}.`);
      dates.push({ index: offset + 13, date });
    } else if (text(header) && !ignoredHeaders.includes(normalize(header))) {
      fail(2, `Cột “${text(header)}” không được nhận diện. Ngày tiến độ cần đủ ngày/tháng/năm.`);
    }
  });
  if (!dates.length) fail(2, "Cần ít nhất một cột tiến độ có tiêu đề ngày, ví dụ 07/09/2026.");
  if (values.length > 10001) fail(2, "Mỗi lần import tối đa 10.000 công việc.");
  const people = state.profiles.filter((profile) => profile.is_active).map((profile) => ({
    id: profile.id, orgGroup: profile.org_group ?? "", subgroup: profile.subgroup ?? "", orgRole: profile.org_role ?? "member" as OrgRole
  }));
  const groupProfiles = state.profiles.filter((profile) => profile.is_active && profile.org_group === GROUP_IMPORT_NAME);
  const dbByKey = new Map<string, ImportDbTask[]>();
  state.tasks.forEach((task) => dbByKey.set(keyOf(task), [...(dbByKey.get(keyOf(task)) ?? []), task]));
  const latestReports = new Map<string, ImportDbProgress>();
  state.progress.forEach((report) => {
    const key = `${report.task_id}|${report.report_date}`;
    const previous = latestReports.get(key);
    if (!previous || report.submitted_at > previous.submitted_at || (report.submitted_at === previous.submitted_at && report.id > previous.id)) latestReports.set(key, report);
  });
  const seen = new Set<string>();
  const rows: GroupImportRow[] = [];
  const changes: GroupImportChange[] = [];
  let progressCount = 0;
  let cancelCount = 0;
  values.slice(1, 10001).forEach((cells, offset) => {
    const sheetRow = offset + 3;
    if (!cells.some((value) => text(value))) return;
    const errorCount = errors.length;
    const tagname = text(cells[3]);
    const wo = text(cells[2]);
    const key = keyOf({ tagname, wo });
    if (!tagname || !wo || !text(cells[1])) fail(sheetRow, "Thiếu Task Name, WO hoặc Tagname.");
    if (seen.has(key)) fail(sheetRow, `Trùng Tagname + WO: ${tagname} / ${wo}.`);
    seen.add(key);
    if (!isImportGroupName(cells[4])) fail(sheetRow, `Nhóm phải là “${GROUP_IMPORT_NAME}”; không được import nhóm khác.`);
    const candidates = dbByKey.get(key) ?? [];
    if (candidates.length > 1) fail(sheetRow, "Database có nhiều công việc cùng Tagname + WO; cần xử lý trùng trước.");
    const existing = candidates[0];
    if (existing && !isImportGroupTask(existing, state.profiles)) fail(sheetRow, "Tagname + WO đã thuộc nhóm khác hoặc dữ liệu demo.");
    const resource = normalize(cells[11]);
    const matches = groupProfiles.filter((profile) => resource && [profile.resource_name, profile.username].some((name) => normalize(name) === resource));
    if (matches.length !== 1) fail(sheetRow, "Resource Names phải khớp duy nhất một nhân sự đang hoạt động của nhóm Tháo/Lắp TB ĐK.");
    const assignee = matches[0];
    const resolvedReporter = resolveTaskReporterId(assignee?.id, people);
    const reporter = existing?.assigned_to === assignee?.id && groupProfiles.some((profile) => profile.id === existing?.reporter_id)
      ? existing!.reporter_id! : resolvedReporter ?? "";
    const start = parseImportDate(cells[9]);
    const finish = parseImportDate(cells[10]);
    if (!start || !finish || finish < start) fail(sheetRow, "Start/Finish phải là ngày hợp lệ; Finish không trước Start.");
    if (!text(cells[7]) || !text(cells[12])) fail(sheetRow, "Thiếu Duration hoặc Nhóm trưởng.");
    const priority = text(cells[8]) ? Number(cells[8]) : 2;
    if (![1, 2, 3].includes(priority)) fail(sheetRow, "Priority chỉ nhận 1, 2 hoặc 3.");
    const modeText = text(cells[modeColumn]);
    let mode = existing?.progress_mode ?? "continuous";
    if (modeText) {
      if (["0/100", "binary"].includes(modeText.toLowerCase())) mode = "binary";
      else if (["0-100", "continuous"].includes(modeText.toLowerCase())) mode = "continuous";
      else fail(sheetRow, "Chế độ tiến độ chỉ nhận 0/100 hoặc 0-100.");
    }
    if (mode === "binary" && existing && state.progress.some((report) => report.task_id === existing.id && report.percent !== 0 && report.percent !== 100)) {
      fail(sheetRow, "Đã có tiến độ trung gian; không thể đổi chế độ sang 0/100.");
    }
    const cancel = text(cells[cancelColumn]);
    if (cancel && normalize(cancel) !== "x" && normalize(cancel) !== "huy") fail(sheetRow, "Cancel chỉ nhận X, Hủy hoặc để trống.");
    const isCancelled = Boolean(cancel) || Boolean(existing?.is_cancelled);
    const note = text(cells[noteColumn]);
    const reason = text(cells[reasonColumn]) || (cancel ? note : "") || existing?.cancel_reason || "";
    if (cancel && reason.length < 3) fail(sheetRow, "WO hủy phải có Lý do hủy hoặc Ghi chú từ 3 ký tự.");
    // Empty dated cells are not zero and must never erase a previous report.
    const reports: ImportedReport[] = [];
    const reportChanges: GroupImportChange["reports"][number][] = [];
    const lastFilledDate = dates.filter(({ index }) => text(cells[index])).map(({ date }) => date).sort().at(-1);
    dates.forEach(({ index, date }) => {
      if (!text(cells[index])) return;
      const percent = parseImportPercent(cells[index]);
      if (percent === null || (mode === "binary" && percent !== 0 && percent !== 100)) {
        fail(sheetRow, `Tiến độ ${date} không hợp lệ (${mode === "binary" ? "chỉ 0% hoặc 100%" : "số nguyên 0–100%"}).`);
        return;
      }
      const previous = existing ? latestReports.get(`${existing.id}|${date}`) : undefined;
      const reportNote = date === lastFilledDate ? note : "";
      if (previous?.percent === percent && (!reportNote || reportNote === text(previous.note))) return;
      reports.push({ report_date: date, percent, note: reportNote || null });
      reportChanges.push({ date, before: previous?.percent ?? null, after: percent, ...(reportNote ? { note: reportNote } : {}) });
    });
    cells.forEach((value, index) => {
      if (index >= 13 && text(value) && !text(headers[index])) fail(sheetRow, `Cột ${index + 1} có dữ liệu nhưng thiếu tiêu đề.`);
    });
    if (errors.length !== errorCount || !assignee) return;
    const fields: ImportTaskFields = {
      task_name: text(cells[1]), tagname: existing?.tagname ?? tagname, wo: existing?.wo ?? wo,
      nhom: existing?.nhom ?? GROUP_IMPORT_NAME, don_vi: text(cells[5]), section: text(cells[6]), duration: text(cells[7]), priority,
      start_date: start, finish_date: finish, resource_name: assignee.resource_name || text(cells[11]), nhom_truong: text(cells[12]),
      assigned_to: assignee.id, reporter_id: reporter, progress_mode: mode, is_cancelled: isCancelled,
      cancel_reason: isCancelled ? reason : ""
    };
    const changedKeys = (Object.keys(FIELD_LABELS) as (keyof ImportTaskFields)[])
      .filter((field) => !existing || (existing[field] ?? "") !== fields[field]);
    const changedFields = existing ? changedKeys.map((field) => FIELD_LABELS[field]) : [];
    const displayField = (field: keyof ImportTaskFields, value: unknown): string => {
      if (field === "assigned_to" || field === "reporter_id") return state.profiles.find((profile) => profile.id === value)?.resource_name || text(value);
      if (field === "is_cancelled") return value ? "Đã hủy" : "Còn thực hiện";
      if (field === "progress_mode") return value === "binary" ? "0/100" : "0-100";
      return text(value);
    };
    const kind = !existing ? "new" : changedFields.length || reports.length ? "updated" : "unchanged";
    const cancelled = isCancelled && !existing?.is_cancelled;
    if (cancelled) cancelCount += 1;
    progressCount += reports.length;
    changes.push({ sheetRow, tagname, wo, taskName: fields.task_name, kind, fields: changedFields,
      details: changedKeys.map((field) => ({ label: FIELD_LABELS[field], before: existing ? displayField(field, existing[field]) : "", after: displayField(field, fields[field]) })),
      reports: reportChanges, cancelled });
    if (kind !== "unchanged") rows.push({ ...fields, id: existing?.id ?? null, sheetRow, reports });
  });
  if (!seen.size) fail(3, "Sheet không có công việc. Không thay đổi dữ liệu web.");
  const missingTasks = state.tasks.filter((task) => isImportGroupTask(task, state.profiles) && !seen.has(keyOf(task)))
    .map((task) => ({ wo: task.wo, tagname: task.tagname, taskName: task.task_name }));
  return {
    rows,
    preview: {
      sheetName, groupName: GROUP_IMPORT_NAME, hasBlockingErrors: errors.length > 0, errors, changes, missingTasks,
      stats: { total: seen.size, added: changes.filter((change) => change.kind === "new").length,
        updated: changes.filter((change) => change.kind === "updated").length,
        unchanged: changes.filter((change) => change.kind === "unchanged").length,
        cancelled: cancelCount, progress: progressCount, missing: missingTasks.length }
    }
  };
};
