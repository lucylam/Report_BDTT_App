import { describe, expect, it } from "vitest";
import { ORG_GROUPS } from "@/lib/org2026";
import { resolveTaskReporterId, type TaskReporterPerson } from "@/lib/taskReporter";

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
