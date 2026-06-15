import { describe, expect, it } from "vitest";
import {
  isSameProgressUpdate,
  isSameWorkerProgressUpdate,
  mergeProgressWithDrafts
} from "@/components/worker/progressDrafts";
import type { ProgressRecord } from "@/types/domain";

const committedProgress: readonly ProgressRecord[] = [
  {
    taskId: "task-1",
    userId: "worker-1",
    reportDate: "2025-08-22",
    percent: 25,
    note: "old note",
    photoPath: "old-photo",
    submittedAt: "2025-08-22T08:00:00+07:00"
  },
  {
    taskId: "task-2",
    userId: "worker-1",
    reportDate: "2025-08-22",
    percent: 0,
    note: ""
  }
];

describe("progress drafts", () => {
  it("merge bản nháp vào progress hiển thị mà không sửa record đã commit", () => {
    const merged = mergeProgressWithDrafts(
      committedProgress,
      {
        "task-1": {
          percent: 75,
          note: "draft note",
          photoPath: undefined
        }
      },
      "worker-1",
      "2025-08-22"
    );

    expect(committedProgress[0]?.percent).toBe(25);
    expect(merged).toHaveLength(2);
    expect(merged.find((record) => record.taskId === "task-1")).toMatchObject({
      taskId: "task-1",
      userId: "worker-1",
      reportDate: "2025-08-22",
      percent: 75,
      note: "draft note"
    });
  });

  it("so sánh draft với progress đã commit để biết khi nào cần gửi", () => {
    expect(
      isSameProgressUpdate(committedProgress[0] ?? null, {
        percent: 25,
        note: "old note",
        photoPath: "old-photo"
      })
    ).toBe(true);

    expect(
      isSameProgressUpdate(committedProgress[0] ?? null, {
        percent: 50,
        note: "old note",
        photoPath: "old-photo"
      })
    ).toBe(false);
  });

  it("so sánh hai bản nháp để không xóa nhầm thay đổi mới", () => {
    expect(
      isSameWorkerProgressUpdate(
        { percent: 50, note: "A" },
        { percent: 50, note: "A", photoPath: undefined }
      )
    ).toBe(true);

    expect(
      isSameWorkerProgressUpdate(
        { percent: 50, note: "A" },
        { percent: 50, note: "B" }
      )
    ).toBe(false);
  });
});
