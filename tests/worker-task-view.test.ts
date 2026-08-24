import { describe, expect, it } from "vitest";
import { matchesWorkerTaskDate } from "@/components/worker/taskView";
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
