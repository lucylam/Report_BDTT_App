import { describe, expect, it } from "vitest";
import {
  getTaskAssigneeOptions,
  matchesWorkerTaskAssignee,
  matchesWorkerTaskDate,
  matchesWorkerTaskPriority
} from "@/components/worker/taskView";
import type { Task } from "@/types/domain";

const createTask = (startDate: string, finishDate: string): Task => ({
  id: "task-1",
  stt: 1,
  taskName: "Kiểm tra thiết bị",
  wo: "WO-1",
  tagname: "04PT-0001",
  nhom: "TB Đo lường",
  donVi: "Đo lường",
  section: "A",
  duration: "2 days",
  priority: 2,
  startDate,
  finishDate,
  resourceName: "Nguyễn Văn A",
  nhomTruong: "Nguyễn Văn B",
  assignedTo: null,
  isCancelled: false,
  cancelReason: ""
});

describe("Worker task date filter", () => {
  it("hiển thị task kéo dài hai ngày ở cả ngày bắt đầu và ngày kết thúc", () => {
    const task = createTask("2026-09-15", "2026-09-16");

    expect(matchesWorkerTaskDate(task, "2026-09-15")).toBe(true);
    expect(matchesWorkerTaskDate(task, "2026-09-16")).toBe(true);
    expect(matchesWorkerTaskDate(task, "2026-09-14")).toBe(false);
    expect(matchesWorkerTaskDate(task, "2026-09-17")).toBe(false);
  });

  it("không giới hạn task khi chọn Tất cả ngày", () => {
    expect(matchesWorkerTaskDate(createTask("2026-09-15", "2026-09-16"), "")).toBe(true);
  });
});

describe("Worker task priority filter", () => {
  const task = createTask("2026-09-15", "2026-09-16");

  it("không giới hạn task khi chọn Tất cả mức", () => {
    expect(matchesWorkerTaskPriority(task, "")).toBe(true);
  });

  it("chỉ hiển thị task đúng mức ưu tiên đã chọn", () => {
    expect(matchesWorkerTaskPriority(task, "2")).toBe(true);
    expect(matchesWorkerTaskPriority(task, "1")).toBe(false);
    expect(matchesWorkerTaskPriority(task, "3")).toBe(false);
  });
});

describe("Worker task assignee filter", () => {
  it("lọc theo Resource Name và không phân biệt dấu, hoa thường", () => {
    const task = createTask("2026-09-15", "2026-09-16");

    expect(matchesWorkerTaskAssignee(task, "nguyen van a")).toBe(true);
    expect(matchesWorkerTaskAssignee(task, "Nguyễn Văn B")).toBe(false);
    expect(matchesWorkerTaskAssignee(task, "")).toBe(true);
  });

  it("tạo danh sách người thực hiện duy nhất và có thứ tự", () => {
    const first = createTask("2026-09-15", "2026-09-16");
    const second = { ...first, id: "task-2", resourceName: "Trần Văn C" };
    const duplicate = { ...first, id: "task-3", resourceName: "nguyen van a" };

    expect(getTaskAssigneeOptions([second, duplicate, first])).toEqual([
      "nguyen van a",
      "Trần Văn C"
    ]);
  });
});
