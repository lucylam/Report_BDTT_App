import { describe, expect, it } from "vitest";
import { scheduleAreas, scheduleEvents, schedulePhases } from "@/lib/bdttSchedule";

describe("lịch dừng và khởi động Nhà máy", () => {
  it("dùng đúng phạm vi và ba giai đoạn trong Đính kèm 03", () => {
    const dates = scheduleEvents.map((event) => event.d).sort();

    expect(dates[0]).toBe("2026-09-19");
    expect(dates.at(-1)).toBe("2026-10-02");
    expect(schedulePhases.map((phase) => phase.key)).toEqual(["dung", "pssr", "khoidong"]);
    expect(scheduleAreas).toEqual(["Tổng thể", "Ammonia", "Urê", "Phụ trợ"]);
  });

  it("giữ đủ các mốc tổng thể để đối chiếu PDF", () => {
    expect(scheduleEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({ p: "dung", x: "Tổng thể", d: "2026-09-19", h: "20:00" }),
      expect.objectContaining({ p: "pssr", x: "Tổng thể", d: "2026-09-26", h: "15:00" }),
      expect.objectContaining({ p: "khoidong", x: "Tổng thể", d: "2026-09-29", h: "13:00" })
    ]));
  });

  it("không còn dữ liệu của lịch cũ", () => {
    expect(scheduleEvents.some((event) => event.d < "2026-09-19")).toBe(false);
    expect(scheduleEvents.some((event) => event.x === ("Đường Gantt" as never))).toBe(false);
  });
});
