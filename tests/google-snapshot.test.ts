import { describe, expect, it } from "vitest";
import { compareSheetSnapshot } from "@/lib/google/snapshot";

const makeRow = (resource: string, report: string, cancelled = ""): string[] => {
  const row = Array.from({ length: 33 }, () => "");
  row[2] = "WO-1";
  row[3] = "TAG-1";
  row[11] = resource;
  row[13] = report;
  row[30] = cancelled;
  return row;
};

describe("Google Sheet outbound snapshot", () => {
  it("đếm task mới, thay đổi phân công, báo cáo và hủy", () => {
    const previous = makeRow("A", "");
    const changed = makeRow("B", "0.5", "X");
    const added = makeRow("C", "");
    added[2] = "WO-2";
    added[3] = "TAG-2";

    const stats = compareSheetSnapshot([changed, added], [previous], 1);
    expect(stats).toMatchObject({
      totalTasks: 2,
      newTasks: 1,
      changedTasks: 1,
      changedAssignments: 1,
      changedReports: 1,
      cancelledTasks: 1,
      adHocTasks: 1
    });
  });

  it("nhận diện cột Cancel khi số ngày báo cáo ngắn hơn 14 ngày", () => {
    const row = makeRow("A", "");
    row[24] = "=MAX(N3:X3)";
    row[27] = "X";
    row[30] = "";

    expect(compareSheetSnapshot([row], [], 0).cancelledTasks).toBe(1);
  });
});
