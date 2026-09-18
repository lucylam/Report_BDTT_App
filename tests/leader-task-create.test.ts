import { describe, expect, it } from "vitest";
import { createProfilesFromAccounts, createSeedAccounts } from "@/lib/accounts";
import {
  getLeaderTaskLocations,
  getMissingLeaderTaskCreateFields,
  inferLeaderTaskOrg
} from "@/lib/leaderTaskCreate";

const validInput = {
  taskName: "Kiểm tra van điều khiển",
  tagname: "FV-101",
  wo: "WO-2026-001",
  donVi: "PNT",
  section: "Section A",
  startDate: "2026-08-22",
  finishDate: "2026-08-23",
  priority: 2,
  progressMode: "continuous",
  assigneeUsername: "worker",
  reporterUsername: "reporter"
} as const;

describe("getMissingLeaderTaskCreateFields", () => {
  it("accepts a create-task payload with every required field", () => {
    expect(getMissingLeaderTaskCreateFields(validInput)).toEqual([]);
  });

  it("reports every blank required text field", () => {
    expect(
      getMissingLeaderTaskCreateFields({
        ...validInput,
        taskName: " ",
        tagname: "",
        wo: undefined,
        donVi: null,
        section: "\t",
        startDate: "",
        finishDate: " ",
        assigneeUsername: "",
        reporterUsername: undefined
      })
    ).toEqual([
      "Tên công việc",
      "WorkOrder",
      "Đơn vị chủ quản",
      "Section",
      "Ngày bắt đầu",
      "Ngày kết thúc",
      "Người thực hiện",
      "Người báo cáo"
    ]);
  });

  it("cho phép để trống Tagname", () => {
    expect(getMissingLeaderTaskCreateFields({ ...validInput, tagname: "" })).toEqual([]);
  });

  it("rejects an invalid priority or progress mode", () => {
    expect(
      getMissingLeaderTaskCreateFields({
        ...validInput,
        priority: 4,
        progressMode: "unknown"
      })
    ).toEqual(["Mức ưu tiên", "Chế độ tiến độ"]);
  });
});

describe("inferLeaderTaskOrg", () => {
  const profiles = createProfilesFromAccounts(createSeedAccounts());
  const leader = profiles.find((profile) => profile.username === "minhvq")!;
  const pn5 = profiles.find((profile) => profile.username === "minhnc")!;
  const pn2 = profiles.find((profile) => profile.username === "tulb")!;
  const otherGroup = profiles.find((profile) => profile.username === "hieunv")!;

  it("lấy Nhóm, PN và Nhóm trưởng từ người thực hiện và người báo cáo", () => {
    expect(inferLeaderTaskOrg(pn5, leader, profiles)).toEqual({
      orgGroup: "TB HT Điều khiển",
      subgroup: "PN5",
      leaderName: "Võ Quang Minh"
    });
    expect(inferLeaderTaskOrg(leader, leader, profiles)).toEqual({
      orgGroup: "TB HT Điều khiển",
      subgroup: "",
      leaderName: "Võ Quang Minh"
    });
  });

  it("không gán nhầm khi hai người thuộc Nhóm hoặc PN khác nhau", () => {
    expect(inferLeaderTaskOrg(pn5, otherGroup, profiles)).toBeNull();
    expect(inferLeaderTaskOrg(pn5, pn2, profiles)).toBeNull();
  });

  it("vẫn suy ra Nhóm và PN khi danh sách hiển thị thiếu hồ sơ Nhóm trưởng", () => {
    expect(inferLeaderTaskOrg(pn5, pn5, [pn5])).toEqual({
      orgGroup: "TB HT Điều khiển",
      subgroup: "PN5",
      leaderName: null
    });
  });
});

describe("getLeaderTaskLocations", () => {
  it("chỉ đưa vào dropdown các cặp Đơn vị và Section đang có", () => {
    expect(getLeaderTaskLocations([
      { donVi: "UREA", section: "21000" },
      { donVi: "AMONIA", section: "4400" },
      { donVi: "UREA", section: "21000" },
      { donVi: " UREA ", section: " 22000 " },
      { donVi: "UTILITY", section: "" }
    ])).toEqual([
      { unit: "AMONIA", sections: ["4400"] },
      { unit: "UREA", sections: ["21000", "22000"] }
    ]);
  });
});
