import { describe, expect, it } from "vitest";
import { deduplicateTaskReportHistory } from "@/lib/taskReportHistory";
import type { TaskReportHistoryItem } from "@/types/domain";

const createItem = (
  overrides: Partial<TaskReportHistoryItem>
): TaskReportHistoryItem => ({
  id: "event-a",
  taskId: "task-1",
  reportDate: "2026-09-15",
  percent: 25,
  note: "A",
  photoPaths: [],
  actorId: "profile-1",
  actorName: "Người báo cáo",
  createdAt: "2026-09-15T01:00:00.000Z",
  ...overrides
});

describe("deduplicateTaskReportHistory", () => {
  it("giữ nguyên chuỗi A rồi B của cùng một task", () => {
    const result = deduplicateTaskReportHistory([
      createItem({ id: "event-b", percent: 50, note: "B", createdAt: "2026-09-15T06:00:00.000Z" }),
      createItem({ id: "event-a" })
    ]);

    expect(result.map((item) => [item.percent, item.note])).toEqual([
      [25, "A"],
      [50, "B"]
    ]);
  });

  it("gộp snapshot hiện tại khi nó trùng với sự kiện vừa ghi", () => {
    const result = deduplicateTaskReportHistory([
      createItem({ id: "event-b", percent: 50, note: "B", createdAt: "2026-09-15T06:00:00.000Z" }),
      createItem({ id: "progress-b", percent: 50, note: "B", createdAt: "2026-09-15T06:00:01.000Z" })
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("event-b");
  });

  it("không gộp hai thao tác báo cáo thật dù nội dung giống nhau", () => {
    const result = deduplicateTaskReportHistory([
      createItem({ id: "event-1" }),
      createItem({ id: "event-2", createdAt: "2026-09-15T01:01:00.000Z" })
    ]);

    expect(result.map((item) => item.id)).toEqual(["event-1", "event-2"]);
  });
});
