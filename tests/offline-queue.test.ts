import { describe, expect, it } from "vitest";
import { normalizeOfflineQueue } from "@/lib/appDataMigration";

describe("normalizeOfflineQueue", () => {
  it("treats legacy items without kind as progress queue items", () => {
    expect(
      normalizeOfflineQueue([
        {
          id: "legacy-1",
          taskId: "task-1",
          userId: "user-worker",
          reportDate: "2026-07-08",
          percent: 37,
          note: "manual",
          photoPath: "data:image/jpeg;base64,/9j/4AAQ",
          queuedAt: "2026-07-08T01:00:00.000Z"
        }
      ])
    ).toEqual([
      {
        kind: "progress",
        id: "legacy-1",
        taskId: "task-1",
        userId: "user-worker",
        reportDate: "2026-07-08",
        percent: 37,
        note: "manual",
        photoPath: "data:image/jpeg;base64,/9j/4AAQ",
        photoPaths: ["data:image/jpeg;base64,/9j/4AAQ"],
        queuedAt: "2026-07-08T01:00:00.000Z"
      }
    ]);
  });

  it("preserves cancel task queue items", () => {
    expect(
      normalizeOfflineQueue([
        {
          kind: "cancelTask",
          id: "cancel-1",
          taskId: "task-1",
          userId: "user-worker",
          cancelReason: "missing material",
          queuedAt: "2026-07-08T01:00:00.000Z"
        }
      ])
    ).toEqual([
      {
        kind: "cancelTask",
        id: "cancel-1",
        taskId: "task-1",
        userId: "user-worker",
        cancelReason: "missing material",
        queuedAt: "2026-07-08T01:00:00.000Z"
      }
    ]);
  });

  it("drops invalid queue items", () => {
    expect(
      normalizeOfflineQueue([
        { taskId: "task-1", userId: "user-worker", percent: 101 },
        { kind: "cancelTask", taskId: "task-1", userId: "user-worker" }
      ])
    ).toEqual([]);
  });
});
