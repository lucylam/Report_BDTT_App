import { describe, expect, it } from "vitest";
import {
  calculateCumulativeMetrics,
  getTaskCumulativePercent,
  getTaskPercent,
  normalizePercent
} from "@/lib/progress";
import type { AppData, ProgressRecord, Task } from "@/types/domain";

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

  it("uses the latest submission when report ownership changed", () => {
    const replacement: ProgressRecord = {
      ...record,
      userId: "user-2",
      percent: 75,
      submittedBy: "leader-1",
      submittedAt: "2025-08-22T06:00:00.000Z"
    };
    expect(getTaskPercent([record, replacement], "task-1", "2025-08-22")).toBe(75);
  });
});

describe("cumulative progress", () => {
  const createTask = (id: string): Task => ({
    id,
    stt: 1,
    taskName: `Task ${id}`,
    wo: `WO-${id}`,
    tagname: `TAG-${id}`,
    nhom: "TB Đo lường",
    donVi: "UTILITY",
    section: "A",
    duration: "1 day",
    priority: 2,
    startDate: "2025-08-20",
    finishDate: "2025-08-21",
    resourceName: "AMLL_NGUYEN VAN A",
    nhomTruong: "NGUYEN THANH HAI",
    assignedTo: null,
    isCancelled: false,
    cancelReason: ""
  });

  const progress: ProgressRecord[] = [
    {
      taskId: "task-1",
      userId: "user-1",
      reportDate: "2025-08-20",
      percent: 25,
      note: ""
    },
    {
      taskId: "task-1",
      userId: "user-1",
      reportDate: "2025-08-23",
      percent: 100,
      note: ""
    },
    {
      taskId: "task-2",
      userId: "user-2",
      reportDate: "2025-08-24",
      percent: 50,
      note: ""
    }
  ];

  it("lấy mức cao nhất của task mà không giới hạn ngày", () => {
    expect(getTaskCumulativePercent(progress, "task-1")).toBe(100);
    expect(getTaskCumulativePercent(progress, "task-2")).toBe(50);
  });

  it("tính KPI Tổng quan từ toàn bộ lịch sử và chỉ dùng ngày hiện tại cho trễ hạn", () => {
    const data: AppData = {
      accounts: [],
      profiles: [],
      tasks: [createTask("task-1"), createTask("task-2")],
      progress,
      dailySnapshots: [],
      offlineQueue: [],
      activeUserId: null
    };

    expect(calculateCumulativeMetrics(data, "2025-08-22")).toMatchObject({
      completed: 1,
      inProgress: 1,
      notStarted: 0,
      overdue: 1,
      overallPercent: 75
    });
  });
});
