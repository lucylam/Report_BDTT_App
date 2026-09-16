import { describe, expect, it } from "vitest";
import { createProfilesFromAccounts, createSeedAccounts } from "@/lib/accounts";
import {
  buildTaskOrgScopes,
  getTaskOrgGroups,
  getTaskSubgroups,
  matchesTaskOrgScope
} from "@/components/admin/tasks/taskTableModel";
import { ORG_GROUPS } from "@/lib/org2026";
import { resolveTaskReporterId, type TaskReporterPerson } from "@/lib/taskReporter";
import type { Task } from "@/types/domain";

const people: TaskReporterPerson[] = [
  { id: "htdk-leader", orgGroup: ORG_GROUPS.htDieuKhien, subgroup: "", orgRole: "nhomTruong" },
  { id: "htdk-pnt", orgGroup: ORG_GROUPS.htDieuKhien, subgroup: "PN1", orgRole: "pnt" },
  { id: "htdk-member", orgGroup: ORG_GROUPS.htDieuKhien, subgroup: "PN1", orgRole: "member" },
  { id: "dl-leader", orgGroup: ORG_GROUPS.doLuong, subgroup: "", orgRole: "nhomTruong" },
  { id: "dl-deputy", orgGroup: ORG_GROUPS.doLuong, subgroup: "", orgRole: "nhomPho" },
  { id: "dl-pnt", orgGroup: ORG_GROUPS.doLuong, subgroup: "PN4", orgRole: "pnt" },
  { id: "dl-member", orgGroup: ORG_GROUPS.doLuong, subgroup: "PN4", orgRole: "member" },
  { id: "hc-leader", orgGroup: ORG_GROUPS.hauCan, subgroup: "", orgRole: "nhomTruong" },
  { id: "hc-member", orgGroup: ORG_GROUPS.hauCan, subgroup: "", orgRole: "member" }
];

describe("resolveTaskReporterId", () => {
  it("gán mọi task TB HTĐK cho Võ Quang Minh báo cáo", () => {
    expect(resolveTaskReporterId("htdk-pnt", people)).toBe("htdk-leader");
    expect(resolveTaskReporterId("htdk-member", people)).toBe("htdk-leader");
    expect(resolveTaskReporterId("htdk-leader", people)).toBe("htdk-leader");
  });

  it("gán task của thành viên phân nhóm cho Phân nhóm trưởng", () => {
    expect(resolveTaskReporterId("dl-member", people)).toBe("dl-pnt");
    expect(resolveTaskReporterId("dl-pnt", people)).toBe("dl-pnt");
  });

  it("giữ nhóm phó tự báo cáo và dùng nhóm trưởng cho thành viên chưa phân nhóm", () => {
    expect(resolveTaskReporterId("dl-deputy", people)).toBe("dl-deputy");
    expect(resolveTaskReporterId("hc-member", people)).toBe("hc-leader");
  });

  it("giữ assignee làm fallback khi chưa có dữ liệu cơ cấu", () => {
    expect(resolveTaskReporterId("unknown", people)).toBe("unknown");
    expect(resolveTaskReporterId(null, people)).toBeNull();
  });
});

describe("bộ lọc Nhóm và Phân nhóm của WorkOrder", () => {
  it("phân WO theo người thực hiện, kể cả WO của nhóm phó và WO tra bằng resource", () => {
    const profiles = createProfilesFromAccounts(createSeedAccounts());
    const voMinhHoang = profiles.find((profile) => profile.username === "hoangvm");
    const tranChiBang = profiles.find((profile) => profile.username === "bangtc");
    const phanTrungKien = profiles.find((profile) => profile.username === "kienpt");
    if (!voMinhHoang || !tranChiBang || !phanTrungKien) {
      throw new Error("Thiếu nhân sự mẫu để thử bộ lọc");
    }
    const task = (id: string, assignedTo: string | null, resourceName: string): Task => ({
      id,
      stt: 1,
      taskName: id,
      wo: id,
      tagname: id,
      nhom: "DK-AMLL",
      donVi: "UREA",
      section: "21000",
      duration: "1",
      priority: 2,
      startDate: "2026-09-20",
      finishDate: "2026-09-21",
      resourceName,
      nhomTruong: "NGUYỄN THANH HẢI",
      assignedTo,
      isCancelled: false,
      cancelReason: ""
    });
    const scopes = buildTaskOrgScopes([
      task("pn8", voMinhHoang.id, voMinhHoang.resourceName),
      task("pn12", tranChiBang.id, tranChiBang.resourceName),
      task("htdk", null, phanTrungKien.resourceName)
    ], profiles);

    expect(scopes.get("pn8")).toEqual({ orgGroup: ORG_GROUPS.doLuong, subgroup: "PN8" });
    expect(scopes.get("pn12")).toEqual({ orgGroup: ORG_GROUPS.doLuong, subgroup: "PN12" });
    expect(scopes.get("htdk")).toEqual({ orgGroup: ORG_GROUPS.htDieuKhien, subgroup: "PN1" });
    expect(getTaskOrgGroups(scopes)).toEqual([ORG_GROUPS.htDieuKhien, ORG_GROUPS.doLuong].sort((a, b) => a.localeCompare(b, "vi")));
    expect(getTaskSubgroups(scopes, "all")).toEqual([]);
    expect(getTaskSubgroups(scopes, ORG_GROUPS.doLuong)).toEqual(["PN8", "PN12"]);
    expect(matchesTaskOrgScope(scopes.get("pn8"), ORG_GROUPS.doLuong, "PN8")).toBe(true);
    expect(matchesTaskOrgScope(scopes.get("pn12"), ORG_GROUPS.doLuong, "PN8")).toBe(false);
    expect(matchesTaskOrgScope(scopes.get("htdk"), ORG_GROUPS.doLuong, "all")).toBe(false);
  });
});
