import { describe, expect, it } from "vitest";
import {
  createDemoProgressRows,
  DEMO_PROGRESS_NOTE,
  type DemoProgressTaskCandidate,
  pickDemoProgressTasks
} from "@/lib/demoProgress";

const task = (
  id: string,
  overrides: Partial<DemoProgressTaskCandidate> = {}
): DemoProgressTaskCandidate => ({
  id,
  assignedTo: `${id}-worker`,
  reporterId: `${id}-reporter`,
  donVi: "UREA",
  nhomTruong: "Nhóm trưởng A",
  priority: 2,
  startDate: "2026-08-01",
  finishDate: "2026-08-31",
  tagname: id,
  progressMode: "continuous",
  isCancelled: false,
  ...overrides
});

describe("demo progress generator", () => {
  it("chỉ chọn task đang có lịch trong ngày và chưa có record demo", () => {
    const selected = pickDemoProgressTasks(
      [
        task("eligible"),
        task("existing"),
        task("cancelled", { isCancelled: true }),
        task("future", { startDate: "2026-09-01", finishDate: "2026-09-30" }),
        task("no-reporter", { assignedTo: null, reporterId: null })
      ],
      new Set(["existing"]),
      "2026-08-24",
      36
    );

    expect(selected.map((item) => item.id)).toEqual(["eligible"]);
  });

  it("phân bổ lần lượt giữa các cụm đơn vị và nhóm trưởng", () => {
    const selected = pickDemoProgressTasks(
      [
        task("urea-1"),
        task("urea-2"),
        task("utility-1", { donVi: "UTILITY", nhomTruong: "Nhóm trưởng B" }),
        task("amonia-1", { donVi: "AMONIA", nhomTruong: "Nhóm trưởng C" })
      ],
      new Set(),
      "2026-08-24",
      3
    );

    expect(new Set(selected.map((item) => item.donVi))).toEqual(
      new Set(["AMONIA", "UREA", "UTILITY"])
    );
  });

  it("chỉ tạo row progress gắn trial_run_id và tôn trọng chế độ phần trăm", () => {
    const rows = createDemoProgressRows(
      [
        task("continuous"),
        task("binary", { progressMode: "binary", reporterId: null })
      ],
      {
        reportDate: "2026-08-24",
        trialRunId: "trial-1",
        submittedBy: "admin-1",
        submittedAt: "2026-08-24T08:00:00.000Z"
      }
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      task_id: "continuous",
      user_id: "continuous-reporter",
      report_date: "2026-08-24",
      percent: 25,
      note: DEMO_PROGRESS_NOTE,
      trial_run_id: "trial-1"
    });
    expect(rows[1]).toMatchObject({
      task_id: "binary",
      user_id: "binary-worker",
      percent: 100,
      trial_run_id: "trial-1"
    });
    expect(rows.every((row) => !("wo" in row) && !("task_name" in row))).toBe(true);
  });
});
