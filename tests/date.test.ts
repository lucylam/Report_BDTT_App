import { describe, expect, it } from "vitest";
import {
  dateToExcelSerial,
  excelSerialToDate,
  getAvailableReportDates,
  getCurrentReportDate,
  getRecentReportDates,
  minutesUntilNoon
} from "@/lib/date";

describe("excelSerialToDate / dateToExcelSerial", () => {
  it("chuyển đổi serial Excel sang ISO date đúng", () => {
    expect(excelSerialToDate(45891)).toBe("2025-08-22");
  });

  it("roundtrip không lệch ngày", () => {
    const dates = ["2025-08-16", "2025-08-29", "2026-01-01", "2026-12-31"];
    dates.forEach((date) => {
      expect(excelSerialToDate(dateToExcelSerial(date))).toBe(date);
    });
  });
});

describe("minutesUntilNoon", () => {
  it("trả về 0 sau 12:00 trưa giờ Việt Nam", () => {
    expect(minutesUntilNoon(new Date("2026-06-12T06:00:00.000Z"))).toBe(0);
  });

  it("đếm ngược đúng trước 12:00 trưa giờ Việt Nam", () => {
    expect(minutesUntilNoon(new Date("2026-06-12T04:30:00.000Z"))).toBe(30);
  });
});

describe("report date", () => {
  it("lấy ngày theo múi giờ nhà máy", () => {
    expect(getCurrentReportDate(new Date("2026-07-17T16:59:00.000Z"))).toBe("2026-07-17");
    expect(getCurrentReportDate(new Date("2026-07-17T17:01:00.000Z"))).toBe("2026-07-18");
  });

  it("tạo cửa sổ lịch sử và giữ ngày dữ liệu thực tế", () => {
    expect(getRecentReportDates("2026-07-17", 3)).toEqual([
      "2026-07-15",
      "2026-07-16",
      "2026-07-17"
    ]);
    expect(getAvailableReportDates(["2026-07-01"], "2026-07-17")).toContain("2026-07-01");
  });
});
