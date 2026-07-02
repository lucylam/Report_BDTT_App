import { describe, expect, it } from "vitest";
import { getTaskPercent, normalizePercent } from "@/lib/progress";
import type { ProgressRecord } from "@/types/domain";

describe("normalizePercent", () => {
  it("normalizes to an integer from 0 to 100", () => {
    expect(normalizePercent(0)).toBe(0);
    expect(normalizePercent(12)).toBe(12);
    expect(normalizePercent(13)).toBe(13);
    expect(normalizePercent(37.4)).toBe(37);
    expect(normalizePercent(37.5)).toBe(38);
    expect(normalizePercent(-5)).toBe(0);
    expect(normalizePercent(110)).toBe(100);
    expect(normalizePercent(100)).toBe(100);
  });

  it("handles non-number values", () => {
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
    percent: 37,
    note: "",
    submittedAt: "2025-08-22T05:00:00.000Z"
  };

  it("returns percent for the matching task and report date", () => {
    expect(getTaskPercent([record], "task-1", "2025-08-22")).toBe(37);
  });

  it("returns 0 when no report exists", () => {
    expect(getTaskPercent([record], "task-2", "2025-08-22")).toBe(0);
    expect(getTaskPercent([record], "task-1", "2025-08-23")).toBe(0);
  });
});
