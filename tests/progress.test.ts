import { describe, expect, it } from "vitest";
import { getTaskPercent, normalizePercent } from "@/lib/progress";
import type { ProgressRecord } from "@/types/domain";

describe("normalizePercent", () => {
  it("làm tròn về các mốc 0/25/50/75/100", () => {
    expect(normalizePercent(0)).toBe(0);
    expect(normalizePercent(12)).toBe(0);
    expect(normalizePercent(13)).toBe(25);
    expect(normalizePercent(37)).toBe(25);
    expect(normalizePercent(38)).toBe(50);
    expect(normalizePercent(62)).toBe(50);
    expect(normalizePercent(63)).toBe(75);
    expect(normalizePercent(87)).toBe(75);
    expect(normalizePercent(88)).toBe(100);
    expect(normalizePercent(100)).toBe(100);
  });

  it("xử lý giá trị không phải số", () => {
    expect(normalizePercent("75")).toBe(75);
    expect(normalizePercent(null)).toBe(0);
    expect(normalizePercent(undefined)).toBe(0);
    expect(normalizePercent("abc")).toBe(0);
  });
});

describe("getTaskPercent", () => {
  const record: ProgressRecord = {
    taskId: "task-1",
    userId: "user-1",
    reportDate: "2025-08-22",
    percent: 50,
    note: "",
    submittedAt: "2025-08-22T05:00:00.000Z"
  };

  it("trả về percent của đúng task và ngày báo cáo", () => {
    expect(getTaskPercent([record], "task-1", "2025-08-22")).toBe(50);
  });

  it("trả về 0 khi chưa có báo cáo", () => {
    expect(getTaskPercent([record], "task-2", "2025-08-22")).toBe(0);
    expect(getTaskPercent([record], "task-1", "2025-08-23")).toBe(0);
  });
});
