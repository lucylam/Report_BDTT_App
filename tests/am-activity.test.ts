import { describe, expect, it } from "vitest";
import {
  createAmActivity,
  getAmActivityKpis,
  getAmStatusMeta,
  getNextReportStatus
} from "@/lib/amActivity";
import { AM_ASSIGNEE_FULL_NAMES, getAmAssigneeOptions } from "@/lib/amPersonnel";

describe("AM activity workflow", () => {
  it("chỉ trả về đúng 4 nhân sự thực hiện AM theo thứ tự cấu hình", () => {
    const people = [
      { id: "5", username: "other", fullName: "Người Khác", orgTitle: "", canLogin: true },
      { id: "3", username: "quangtn", fullName: "Trần Nhựt Quang", orgTitle: "", canLogin: true },
      { id: "1", username: "duyenlh", fullName: "Lê Hữu Duyên", orgTitle: "", canLogin: true },
      { id: "4", username: "tungtp", fullName: "Trịnh Phước Tùng", orgTitle: "", canLogin: true },
      { id: "2", username: "sonld", fullName: "Lê Đình Sơn", orgTitle: "", canLogin: true }
    ];

    expect(getAmAssigneeOptions(people).map((person) => person.fullName)).toEqual(
      AM_ASSIGNEE_FULL_NAMES
    );
  });

  it("tạo nhiệm vụ mới ở trạng thái đã giao", () => {
    const activity = createAmActivity({
      requestContent: "Lắp mái che LT3041",
      locationTag: "LT3041",
      assigneeIds: ["user-1", "user-2"],
      scheduledDate: "2026-07-16",
      createdBy: "admin-1"
    });

    expect(activity.status).toBe("assigned");
    expect(activity.requestContent).toBe("Lắp mái che LT3041");
    expect(activity.assigneeIds).toEqual(["user-1", "user-2"]);
    expect(activity.beforePhotos).toEqual([]);
    expect(activity.afterPhotos).toEqual([]);
  });

  it("đổi trạng thái theo ảnh trước và ảnh sau", () => {
    expect(getNextReportStatus(["data:image/jpeg;base64,a"], [], "assigned")).toBe(
      "inProgress"
    );
    expect(
      getNextReportStatus(
        ["data:image/jpeg;base64,a"],
        ["data:image/jpeg;base64,b"],
        "inProgress"
      )
    ).toBe("inProgress");
    expect(getNextReportStatus([], [], "needsRevision")).toBe("needsRevision");
    expect(
      getNextReportStatus(
        ["data:image/jpeg;base64,a"],
        ["data:image/jpeg;base64,b"],
        "approved"
      )
    ).toBe("approved");
  });

  it("tính KPI và label báo cáo", () => {
    const base = createAmActivity({
      requestContent: "Kiểm tra máng cáp",
      locationTag: "AMO",
      assigneeIds: ["user-1"],
      scheduledDate: "2026-07-16",
      createdBy: "admin-1"
    });
    const activities = [
      base,
      { ...base, id: "am-2", status: "inProgress" as const },
      { ...base, id: "am-3", status: "submitted" as const },
      { ...base, id: "am-4", status: "approved" as const },
      { ...base, id: "am-5", status: "needsRevision" as const }
    ];

    expect(getAmActivityKpis(activities)).toMatchObject({
      total: 5,
      assigned: 1,
      inProgress: 1,
      submitted: 1,
      needsRevision: 1,
      approved: 1
    });
    expect(getAmStatusMeta("submitted")).toMatchObject({
      label: "Chờ duyệt",
      tone: "info"
    });
  });
});
