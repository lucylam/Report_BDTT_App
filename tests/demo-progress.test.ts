import { describe, expect, it } from "vitest";
import {
  OFFICIAL_DEMO_NOTE,
  applyOfficialDemoProgress,
  clearOfficialDemoProgress,
  isOfficialDemoProgress
} from "@/lib/demoProgress";
import type { AppData, ProgressRecord, Task } from "@/types/domain";

const reportDate = "2025-08-22";

const makeTask = (overrides: Partial<Task> & { readonly id: string }): Task => {
  const { id, ...rest } = overrides;
  return {
    id,
    stt: 1,
    taskName: `Task ${id}`,
    wo: `WO-${id}`,
    tagname: `TAG-${id}`,
    nhom: "DK- AMLL",
    donVi: "UTILITY",
    section: "41000",
    duration: "1",
    priority: 1,
    startDate: "2025-08-16",
    finishDate: reportDate,
    resourceName: "AMLL_CU MINH THANH",
    nhomTruong: "TB DO_NGUYEN THANH HAI",
    assignedTo: "user-worker",
    isCancelled: false,
    cancelReason: "",
    ...rest
  };
};

const makeData = (
  tasks: readonly Task[],
  progress: readonly ProgressRecord[] = []
): AppData => ({
  accounts: [],
  profiles: [],
  tasks: [...tasks],
  progress: [...progress],
  dailySnapshots: [],
  offlineQueue: [],
  activeUserId: null
});

describe("official demo progress", () => {
  it("tạo record demo có marker và không đè record thật đã có", () => {
    const data = makeData(
      [makeTask({ id: "real" }), makeTask({ id: "demo-1" }), makeTask({ id: "demo-2" })],
      [
        {
          taskId: "real",
          userId: "user-worker",
          reportDate,
          percent: 75,
          note: "Tiến độ thật",
          submittedAt: `${reportDate}T08:00:00+07:00`
        }
      ]
    );

    const result = applyOfficialDemoProgress(data, reportDate, 10);
    const demoRecords = result.data.progress.filter(isOfficialDemoProgress);

    expect(result.created).toBe(2);
    expect(result.data.progress.find((record) => record.taskId === "real")?.note).toBe(
      "Tiến độ thật"
    );
    expect(demoRecords).toHaveLength(2);
    expect(demoRecords.every((record) => record.note === OFFICIAL_DEMO_NOTE)).toBe(true);
    expect(demoRecords.map((record) => record.taskId).sort()).toEqual(["demo-1", "demo-2"]);
  });

  it("bấm tạo nhiều lần giữ demo cũ và chỉ bổ sung task chưa có progress", () => {
    const data = makeData([
      makeTask({ id: "demo-1" }),
      makeTask({ id: "demo-2" }),
      makeTask({ id: "demo-3" }),
      makeTask({ id: "demo-4" }),
      makeTask({ id: "demo-5" })
    ]);

    const first = applyOfficialDemoProgress(data, reportDate, 3);
    const second = applyOfficialDemoProgress(first.data, reportDate, 3);
    const third = applyOfficialDemoProgress(second.data, reportDate, 3);

    expect(first.created).toBe(3);
    expect(second.created).toBe(2);
    expect(second.cleared).toBe(0);
    expect(second.data.progress.filter(isOfficialDemoProgress)).toHaveLength(5);
    expect(third.created).toBe(0);
    expect(third.data.progress.filter(isOfficialDemoProgress)).toHaveLength(5);
  });

  it("clear chỉ xóa record demo và giữ nguyên record thật", () => {
    const data = makeData(
      [makeTask({ id: "real" }), makeTask({ id: "demo" })],
      [
        {
          taskId: "real",
          userId: "user-worker",
          reportDate,
          percent: 50,
          note: "Record thật",
          submittedAt: `${reportDate}T08:00:00+07:00`
        },
        {
          taskId: "demo",
          userId: "user-worker",
          reportDate,
          percent: 100,
          note: OFFICIAL_DEMO_NOTE,
          submittedAt: `${reportDate}T09:00:00+07:00`
        }
      ]
    );

    const result = clearOfficialDemoProgress(data);

    expect(result.cleared).toBe(1);
    expect(result.data.progress).toHaveLength(1);
    expect(result.data.progress[0]).toMatchObject({
      taskId: "real",
      note: "Record thật"
    });
  });
});
