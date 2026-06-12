import { describe, expect, it } from "vitest";
import {
  dateToExcelSerial,
  excelSerialToDate,
  minutesUntilNoon
} from "@/lib/date";

describe("excelSerialToDate / dateToExcelSerial", () => {
  it("chuyển đổi serial Excel sang ISO date đúng", () => {
    // 2025-08-22 = serial 45891 (gốc Excel 1900)
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
    // 13:00 giờ VN = 06:00 UTC
    expect(minutesUntilNoon(new Date("2026-06-12T06:00:00.000Z"))).toBe(0);
  });

  it("đếm ngược đúng trước 12:00 trưa giờ Việt Nam", () => {
    // 11:30 giờ VN = 04:30 UTC
    expect(minutesUntilNoon(new Date("2026-06-12T04:30:00.000Z"))).toBe(30);
  });
});
