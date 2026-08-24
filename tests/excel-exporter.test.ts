import { describe, expect, it } from "vitest";
import { createDemoData } from "@/lib/demoData";
import { buildFullDataSheetRangeValues } from "@/lib/excel/exporter";

describe("Google Sheet export report dates", () => {
  it("đặt cột tiến độ theo Start/Finish và vẫn giữ snapshot A:AG", () => {
    const demo = createDemoData();
    const task = {
      ...demo.tasks[0],
      startDate: "2026-09-15",
      finishDate: "2026-09-25",
      progressMode: "continuous" as const
    };
    const result = buildFullDataSheetRangeValues({
      ...demo,
      tasks: [task],
      progress: []
    });
    const row = result.values[0];

    expect(row).toHaveLength(33);
    expect(row[24]).toBe("=MAX(N3:X3)");
    expect(row[25]).toBe("=Y3");
    expect(row[26]).toBe("=1-Z3");
    expect(row.slice(29, 32)).toEqual(["", "", ""]);
    expect(row[32]).toBe("0-100");
  });
});
