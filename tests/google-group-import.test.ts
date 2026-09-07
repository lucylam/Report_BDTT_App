import { describe, expect, it } from "vitest";
import { DATA_BASE_HEADERS } from "@/lib/excel/exporter";
import { GROUP_IMPORT_NAME, parseImportDate, parseImportPercent, planGroupImport, type GroupImportState, type ImportDbTask } from "@/lib/google/groupImport";
import { buildGroupImportTemplate } from "@/lib/google/groupImportTemplate";

const headers = [...DATA_BASE_HEADERS, "07/09/2026", "08/09/2026", "Cancel", "Ghi chú", "Lý do hủy", "Chế độ tiến độ"];
const row = (overrides: Record<number, string | number> = {}): (string | number)[] => {
  const cells: (string | number)[] = [1, "Tháo thiết bị", "WO-01", "TAG-01", GROUP_IMPORT_NAME, "XĐK", "PN1", "8 hours", 2, "07/09/2026", "08/09/2026", "Đinh Văn Triển", "Phạm Quyết Chiến", "50%", "", "", "", "", "0-100"];
  Object.entries(overrides).forEach(([index, value]) => { cells[Number(index)] = value; });
  return cells;
};
const task: ImportDbTask = {
  id: "task-1", stt: 5, task_name: "Tháo thiết bị", wo: "WO-01", tagname: "TAG-01", nhom: GROUP_IMPORT_NAME,
  don_vi: "XĐK", section: "PN1", duration: "8 hours", priority: 2, start_date: "2026-09-07", finish_date: "2026-09-08",
  resource_name: "Đinh Văn Triển", nhom_truong: "Phạm Quyết Chiến", assigned_to: "person-1", reporter_id: "person-1",
  progress_mode: "continuous", is_cancelled: false, cancel_reason: "", task_source: "plan", updated_at: "2026-09-07T01:00:00Z", trial_run_id: null
};
const state: GroupImportState = {
  version: "v1", trialActive: false, tasks: [task], progress: [],
  profiles: [{ id: "person-1", username: "triendv", resource_name: "Đinh Văn Triển", org_group: GROUP_IMPORT_NAME, subgroup: "PN1", org_role: "pnt", is_active: true },
    { id: "person-2", username: "other", resource_name: "Người nhóm khác", org_group: "TB Đo lường", subgroup: "PN1", org_role: "pnt", is_active: true }]
};
const previousReport = { id: "report-1", task_id: task.id, user_id: "person-1", report_date: "2026-09-07", percent: 50, note: "Ghi chú cũ", submitted_at: "2026-09-07T02:00:00Z" };

describe("Tháo lắp incremental import", () => {
  it("updates existing progress and adds independent new WO as separate rows", () => {
    const result = planGroupImport([headers, row(), row({ 2: "WO-02" })], state);
    expect(result.preview.errors).toEqual([]);
    expect(result.preview.stats).toMatchObject({ added: 1, updated: 1, progress: 2 });
    expect(result.rows.map((item) => item.id)).toEqual(["task-1", null]);
  });
  it("repeated imports do not write tasks or reports again", () => {
    const result = planGroupImport([headers, row()], { ...state, progress: [previousReport] });
    expect(result.rows).toEqual([]);
    expect(result.preview.stats).toMatchObject({ unchanged: 1, progress: 0 });
  });
  it("does not erase absent WO or blank progress and notes", () => {
    const result = planGroupImport([headers, row({ 13: "" })], {
      ...state, tasks: [task, { ...task, id: "task-2", wo: "WO-02" }], progress: [previousReport]
    });
    expect(result.rows).toEqual([]);
    expect(result.preview.stats.missing).toBe(1);
    expect(result.preview.missingTasks[0].wo).toBe("WO-02");
  });
  it("accepts explicit zero as a correction, preserving blank notes", () => {
    const result = planGroupImport([headers, row({ 13: 0 })], { ...state, progress: [previousReport] });
    expect(result.rows[0].reports).toEqual([{ report_date: "2026-09-07", percent: 0, note: null }]);
    expect(result.preview.changes[0].reports[0]).toMatchObject({ before: 50, after: 0 });
  });
  it("adds today's note only to the last filled date and retains older notes", () => {
    const result = planGroupImport([headers, row({ 14: "75%", 16: "Cập nhật hôm nay" })], { ...state, progress: [previousReport] });
    expect(result.rows[0].reports).toEqual([{ report_date: "2026-09-08", percent: 75, note: "Cập nhật hôm nay" }]);
  });
  it("cancels only explicitly flagged tasks and requires a reason", () => {
    expect(planGroupImport([headers, row({ 15: "X" })], state).preview.hasBlockingErrors).toBe(true);
    const result = planGroupImport([headers, row({ 15: "X", 17: "Không còn thực hiện" })], state);
    expect(result.rows[0]).toMatchObject({ is_cancelled: true, cancel_reason: "Không còn thực hiện" });
    expect(result.preview.stats.cancelled).toBe(1);
  });
  it("does not reopen a cancelled WO when Cancel is blank", () => {
    const result = planGroupImport([headers, row({ 13: "" })], { ...state, tasks: [{ ...task, is_cancelled: true, cancel_reason: "Bỏ công việc" }] });
    expect(result.preview.errors).toEqual([]);
    expect(result.rows).toEqual([]);
  });
  it.each([
    ["another group label", { 4: "TB Đo lường" }],
    ["an assignee outside the group", { 11: "Người nhóm khác" }],
    ["an unknown resource", { 11: "Không tồn tại" }],
    ["a missing key", { 3: "" }],
    ["an invalid date", { 9: "31/02/2026" }],
    ["reversed dates", { 10: "06/09/2026" }],
    ["out-of-range percent", { 13: "101%" }],
    ["a fractional percentage", { 13: "23.5%" }],
    ["a formula error", { 13: "#REF!" }],
    ["an unknown cancel flag", { 15: "yes" }],
    ["binary intermediate progress", { 18: "0/100" }]
  ])("blocks %s without applying a partial row", (_name, overrides) => {
    const result = planGroupImport([headers, row(overrides)], state);
    expect(result.preview.hasBlockingErrors).toBe(true);
    expect(result.rows).toEqual([]);
  });
  it("rejects key collisions with another group even if Sheet claims this group", () => {
    const result = planGroupImport([headers, row()], { ...state, tasks: [{ ...task, assigned_to: "person-2" }] });
    expect(result.preview.errors.some((issue) => issue.message.includes("nhóm khác"))).toBe(true);
  });
  it("rejects duplicate case-insensitive keys in Sheet and database", () => {
    expect(planGroupImport([headers, row(), row({ 2: "wo-01", 3: "tag-01" })], state).preview.hasBlockingErrors).toBe(true);
    expect(planGroupImport([headers, row()], { ...state, tasks: [task, { ...task, id: "duplicate" }] }).preview.hasBlockingErrors).toBe(true);
  });
  it("rejects empty Sheets, shifted headers, undated totals, and duplicate date columns", () => {
    expect(planGroupImport([headers], state).preview.hasBlockingErrors).toBe(true);
    expect(planGroupImport([headers.slice(1), row()], state).preview.hasBlockingErrors).toBe(true);
    expect(planGroupImport([[...DATA_BASE_HEADERS, "Total", "Cancel"], row()], state).preview.hasBlockingErrors).toBe(true);
    const duplicateDates = [...headers]; duplicateDates[14] = "2026-09-07";
    expect(planGroupImport([duplicateDates, row()], state).preview.hasBlockingErrors).toBe(true);
  });
  it("maps progress by date headers even when reordered and ignores summary formulas", () => {
    const extended = [...headers, "Total", "%Complete", "Còn lại"];
    const result = planGroupImport([extended, [...row(), 0.5, 0.5, 0.5]], state);
    expect(result.preview.errors).toEqual([]);
    expect(result.rows[0].reports).toHaveLength(1);
  });
  it("uses the latest report across authors when determining changes", () => {
    const result = planGroupImport([headers, row()], { ...state, progress: [
      { ...previousReport, id: "old", percent: 20, user_id: "another" },
      { ...previousReport, submitted_at: "2026-09-07T03:00:00Z" }
    ] });
    expect(result.rows).toEqual([]);
  });
  it("keeps existing delegated reporter and supports resource usernames", () => {
    const result = planGroupImport([headers, row({ 11: "triendv" })], state);
    expect(result.rows[0].reporter_id).toBe("person-1");
  });
  it("exports a template that round-trips without changing existing data", () => {
    const templateState = { ...state, progress: [previousReport] };
    const template = buildGroupImportTemplate(templateState);
    const result = planGroupImport(template.slice(1), templateState);
    expect(result.preview.errors).toEqual([]);
    expect(result.rows).toEqual([]);
    expect(template[2][4]).toBe(GROUP_IMPORT_NAME);
  });
});

describe("Sheet dates and percentage conventions", () => {
  it.each([["50%", 50], [0.5, 50], [50, 50], [1, 100], ["1%", 1], ["0,25", 25], [0, 0], ["100%", 100]])("parses %s as %s", (value, expected) => {
    expect(parseImportPercent(value)).toBe(expected);
  });
  it.each(["", "#N/A", -1, "Infinity", "1e2", "12.5%", 101])("rejects invalid percent %s", (value) => expect(parseImportPercent(value)).toBeNull());
  it("parses valid date forms and rejects impossible dates", () => {
    expect(parseImportDate("Sat 19-09-26")).toBe("2026-09-19");
    expect(parseImportDate("20-Sep-2026")).toBe("2026-09-20");
    expect(parseImportDate(46272)).toBe("2026-09-07");
    expect(parseImportDate("31/02/2026")).toBe("");
    expect(parseImportDate("07/09")).toBe("");
  });
});
