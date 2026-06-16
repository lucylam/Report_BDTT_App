import { describe, expect, it } from "vitest";
import { buildExcelDashboard } from "@/lib/dashboard";
import type { AppData, Profile, ProgressPercent, ProgressRecord, Task } from "@/types/domain";

const reportDate = "2025-08-22";

const makeTask = (overrides: Partial<Task> & { readonly id: string }): Task => {
  const { id, ...rest } = overrides;
  return {
    id,
    stt: 1,
    taskName: `Task ${id}`,
    wo: `WO-${id}`,
    tagname: `TAG-${id}`,
    nhom: "TB Đo lường",
    donVi: "UTILITY",
    section: "41000",
    duration: "1",
    priority: 1,
    startDate: "2025-08-16",
    finishDate: "2025-08-22",
    resourceName: "AMLL_CÙ MINH THÀNH",
    nhomTruong: "TB ĐO_NGUYỄN THANH HẢI",
    assignedTo: "user-1",
    isCancelled: false,
    cancelReason: "",
    ...rest
  };
};

const makeProgress = (
  taskId: string,
  percent: ProgressPercent,
  date = reportDate
): ProgressRecord => ({
  taskId,
  userId: "user-1",
  reportDate: date,
  percent,
  note: "",
  submittedAt: `${date}T00:00:00.000Z`
});

const makeProfile = (id: string): Profile => ({
  id,
  email: `${id}@example.com`,
  username: id.replace("user-", ""),
  employeeCode: id,
  fullName: id.toUpperCase(),
  resourceName: id.toUpperCase(),
  nhom: "TB Đo lường",
  nhomTruong: "",
  role: "worker",
  orgGroup: "TB Đo lường",
  subgroup: "PN1",
  orgRole: "member",
  orgTitle: "Worker",
  orgAssignment: "",
  managedGroups: [],
  managedSubgroups: [],
  isPlaceholder: false,
  canLogin: true,
  mustChangePassword: false
});

const makeData = (
  tasks: readonly Task[],
  progress: readonly ProgressRecord[],
  profiles: readonly Profile[] = []
): AppData => ({
  accounts: [],
  profiles: [...profiles],
  tasks: [...tasks],
  progress: [...progress],
  dailySnapshots: [],
  offlineQueue: [],
  activeUserId: null
});

describe("buildExcelDashboard", () => {
  it("tính đúng đã thực hiện và còn lại theo dạng thập phân Excel", () => {
    const data = makeData(
      [makeTask({ id: "done" }), makeTask({ id: "half" }), makeTask({ id: "none" })],
      [makeProgress("done", 100), makeProgress("half", 50)]
    );

    const dashboard = buildExcelDashboard(data, reportDate);

    expect(dashboard.overall).toMatchObject({
      done: 1.5,
      remaining: 1.5,
      total: 3,
      percent: 50
    });
  });

  it("lấy tiến độ lũy kế lớn nhất đến ngày báo cáo và bỏ qua ngày tương lai", () => {
    const data = makeData(
      [makeTask({ id: "task-1" })],
      [
        makeProgress("task-1", 25, "2025-08-20"),
        makeProgress("task-1", 75, "2025-08-22"),
        makeProgress("task-1", 100, "2025-08-23")
      ]
    );

    const dashboard = buildExcelDashboard(data, reportDate);

    expect(dashboard.overall.done).toBe(0.75);
    expect(dashboard.overall.remaining).toBe(0.25);
    expect(dashboard.overall.percent).toBe(75);
  });

  it("group đúng theo đơn vị chủ quản, nhóm trưởng và prefix resource", () => {
    const leadA = "HTĐK_VÕ QUANG MINH";
    const leadB = "TBCH_LÝ NGỌC LĨNH";
    const data = makeData(
      [
        makeTask({
          id: "utility",
          donVi: "UTILITY",
          nhomTruong: leadA,
          resourceName: "HTĐK_VÕ QUANG MINH"
        }),
        makeTask({
          id: "urea",
          donVi: "UREA",
          nhomTruong: leadB,
          resourceName: "TBCH_LÝ NGỌC LĨNH"
        })
      ],
      [makeProgress("utility", 100), makeProgress("urea", 50)]
    );

    const dashboard = buildExcelDashboard(data, reportDate);
    const utility = dashboard.byOwnerUnit.find((row) => row.name === "UTILITY");
    const ureaLeadRow = dashboard.byOwnerUnitAndLead.find((row) => row.name === "UREA");
    const htdk = dashboard.resourceGroups.find((group) => group.key === "HTĐK");

    expect(utility?.done).toBe(1);
    expect(ureaLeadRow?.values[leadB]).toBe(50);
    expect(htdk?.rows).toHaveLength(1);
    expect(htdk?.rows[0]?.name).toBe("HTĐK_VÕ QUANG MINH");
  });

  it("task hủy xuất hiện trong status nhưng không làm lệch completion totals", () => {
    const lead = "TB ĐO_NGUYỄN THANH HẢI";
    const data = makeData(
      [
        makeTask({ id: "active", nhomTruong: lead }),
        makeTask({ id: "cancelled", nhomTruong: lead, isCancelled: true })
      ],
      [makeProgress("active", 100), makeProgress("cancelled", 100)]
    );

    const dashboard = buildExcelDashboard(data, reportDate);
    const leadStatus = dashboard.leadStatus.find((row) => row.name === lead);

    expect(dashboard.overall.total).toBe(1);
    expect(dashboard.overall.percent).toBe(100);
    expect(leadStatus).toMatchObject({ completed: 1, cancelled: 1, total: 2 });
  });

  it("tạo đúng summary điều hành từ record progress và worker báo cáo trong ngày", () => {
    const data = makeData(
      [
        makeTask({ id: "done", donVi: "UTILITY" }),
        makeTask({ id: "doing", donVi: "UREA" }),
        makeTask({ id: "none", donVi: "UREA" })
      ],
      [
        makeProgress("done", 100, reportDate),
        makeProgress("doing", 50, reportDate)
      ],
      [makeProfile("user-1"), makeProfile("user-2")]
    );

    const dashboard = buildExcelDashboard(data, reportDate);

    expect(dashboard.executive).toMatchObject({
      activeTasks: 3,
      completedTasks: 1,
      inProgressTasks: 1,
      notStartedTasks: 1,
      unfinishedTasks: 2,
      updatedTasks: 2,
      submittedWorkers: 1,
      totalWorkers: 2
    });
    expect(dashboard.attentionOwnerUnits[0]?.name).toBe("UREA");
    expect(dashboard.attentionLeads[0]?.notStarted).toBe(1);
  });

  it("gộp các biến thể tên nhóm trưởng và resource prefix khác dấu/gạch dưới", () => {
    const lead = "TB ĐO_NGUYỄN THANH HẢI";
    const data = makeData(
      [
        makeTask({
          id: "accented",
          donVi: "UTILITY",
          nhomTruong: lead,
          resourceName: "HTĐK_LÊ BÁ TỨ"
        }),
        makeTask({
          id: "plain",
          donVi: "UTILITY",
          nhomTruong: "TB DO_NGUYEN THANH HAI",
          resourceName: "HTDK_LE BA TU"
        })
      ],
      [makeProgress("accented", 100), makeProgress("plain", 50)]
    );

    const dashboard = buildExcelDashboard(data, reportDate);
    const leadStatus = dashboard.leadStatus.find((row) => row.name === lead);
    const unitLead = dashboard.byOwnerUnitAndLead.find((row) => row.name === "UTILITY");
    const htdk = dashboard.resourceGroups.find((group) => group.key === "HTĐK");

    expect(dashboard.leadNames).toEqual([lead]);
    expect(leadStatus).toMatchObject({ completed: 1, inProgress: 1, total: 2 });
    expect(unitLead?.values[lead]).toBe(75);
    expect(htdk?.rows).toHaveLength(1);
    expect(htdk?.rows[0]).toMatchObject({ total: 2, percent: 75 });
  });
});
