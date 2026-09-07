import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkerStatusTable } from "@/components/admin/WorkerStatusTable";
import { createProfilesFromAccounts, createSeedAccounts } from "@/lib/accounts";
import { getActiveTasksByReporter, getReportablePersonnel, hasSubmittedReportForDate } from "@/lib/reportingPersonnel";
import { calculateMetrics, calculateCumulativeMetrics } from "@/lib/progress";
import { buildExcelDashboard } from "@/lib/dashboard";
import type { AppData, Profile, Task } from "@/types/domain";

const template = createProfilesFromAccounts(createSeedAccounts())[0];
const profile = (id: string, extra: Partial<Profile> = {}): Profile => ({
  ...template, id, username: id, fullName: id, isPlaceholder: false, canLogin: true, ...extra
});
const task = (id: string, reporterId: string | null, extra: Partial<Task> = {}): Task => ({
  id, stt: 1, taskName: id, wo: id, tagname: id, nhom: "Nhóm", donVi: "", section: "", duration: "1",
  priority: 2, startDate: "2026-09-07", finishDate: "2026-09-07", resourceName: "worker", nhomTruong: "leader",
  assignedTo: "worker", reporterId, isCancelled: false, cancelReason: "", ...extra
});
const data: AppData = {
  accounts: [], profiles: [profile("worker"), profile("reporter-1"), profile("reporter-2"), profile("supervisor"), profile("cancelled-only")],
  tasks: [task("one", "reporter-1"), task("two", "reporter-1"), task("three", "reporter-2"), task("cancelled", "cancelled-only", { isCancelled: true })],
  progress: [{ taskId: "one", userId: "reporter-1", submittedBy: "supervisor", reportDate: "2026-09-07", percent: 50, note: "" }],
  offlineQueue: [], dailySnapshots: [], activeUserId: null
};

describe("reporting personnel scope", () => {
  it("renders the personnel report table using only reporting personnel", () => {
    const markup = renderToStaticMarkup(createElement(WorkerStatusTable, { data }));
    expect(markup).toContain("Nhân sự báo cáo");
    expect(markup).toContain("reporter-1");
    expect(markup).toContain("reporter-2");
    expect(markup).not.toContain(">supervisor<");
    expect(markup).not.toContain(">worker<");
    expect(markup).not.toContain(">cancelled-only<");
  });
  it("counts each designated reporter once, excluding assignees, observers and cancelled-only reporters", () => {
    expect(getReportablePersonnel(data.profiles, data.tasks).map((person) => person.id)).toEqual(["reporter-1", "reporter-2"]);
    expect(getActiveTasksByReporter(data.tasks).get("reporter-1")?.map((item) => item.id)).toEqual(["one", "two"]);
  });
  it("uses the same denominator in daily, cumulative and executive metrics", () => {
    expect(calculateMetrics(data, "2026-09-07").unsubmittedWorkers).toBe(1);
    expect(calculateCumulativeMetrics(data, "2026-09-07").unsubmittedWorkers).toBe(1);
    expect(buildExcelDashboard(data).executive).toMatchObject({ totalWorkers: 2, submittedWorkers: 1 });
    expect(calculateMetrics(data, "2026-09-08").unsubmittedWorkers).toBe(2);
  });
  it("does not mistake admin submitting on behalf of a reporter for an extra reporting person", () => {
    const reporters = getReportablePersonnel(data.profiles, data.tasks);
    expect(reporters.some((person) => person.id === "supervisor")).toBe(false);
    expect(hasSubmittedReportForDate({ activeTasks: [data.tasks[0]], progress: data.progress, profileId: "reporter-1", reportDate: "2026-09-07" })).toBe(true);
  });
  it("does not count a report on an unrelated or cancelled task as submission for current duties", () => {
    const input = { activeTasks: [data.tasks[2]], progress: [{ ...data.progress[0], userId: "reporter-2" }], profileId: "reporter-2", reportDate: "2026-09-07" };
    expect(hasSubmittedReportForDate(input)).toBe(false);
    expect(hasSubmittedReportForDate({ ...input, activeTasks: [] })).toBe(false);
  });
  it("keeps the legacy assigned-to fallback when no reporter has been specified", () => {
    expect(getReportablePersonnel(data.profiles, [task("legacy", null)]).map((person) => person.id)).toEqual(["worker"]);
    expect(getReportablePersonnel(data.profiles, [task("unassigned", null, { assignedTo: null })])).toEqual([]);
  });
  it("excludes disabled and placeholder accounts even if assigned reporting duties", () => {
    const profiles = [profile("reporter-1", { canLogin: false }), profile("reporter-2", { isPlaceholder: true })];
    expect(getReportablePersonnel(profiles, data.tasks)).toEqual([]);
  });
  it("respects the data scope of a group-filtered screen", () => {
    const scoped = { ...data, tasks: [data.tasks[2]] };
    expect(buildExcelDashboard(scoped).executive).toMatchObject({ totalWorkers: 1, submittedWorkers: 0 });
    expect(calculateMetrics(scoped, "2026-09-07").unsubmittedWorkers).toBe(1);
  });
});
