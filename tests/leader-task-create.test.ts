import { describe, expect, it } from "vitest";
import { getMissingLeaderTaskCreateFields } from "@/lib/leaderTaskCreate";

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
      "Tagname",
      "WorkOrder",
      "Đơn vị chủ quản",
      "Section",
      "Ngày bắt đầu",
      "Ngày kết thúc",
      "Người thực hiện",
      "Người báo cáo"
    ]);
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
