import { describe, expect, it } from "vitest";
import { buildExcelDashboard } from "@/lib/dashboard";
import { createProfilesFromAccounts, createSeedAccounts } from "@/lib/accounts";
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
  date = reportDate,
  userId = "user-1"
): ProgressRecord => ({
  taskId,
  userId,
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

    const dashboard = buildExcelDashboard(data);

    expect(dashboard.overall).toMatchObject({
      done: 1.5,
      remaining: 1.5,
      total: 3,
      percent: 50
    });
    expect(dashboard.nominalOverall).toMatchObject({
      done: 1.5,
      remaining: 1.5,
      total: 3,
      percent: 50
    });
  });

  it("lấy tiến độ lũy kế lớn nhất trong toàn bộ các ngày báo cáo", () => {
    const data = makeData(
      [makeTask({ id: "task-1" })],
      [
        makeProgress("task-1", 25, "2025-08-20"),
        makeProgress("task-1", 75, "2025-08-22"),
        makeProgress("task-1", 100, "2025-08-23")
      ]
    );

    const dashboard = buildExcelDashboard(data);

    expect(dashboard.overall.done).toBe(1);
    expect(dashboard.overall.remaining).toBe(0);
    expect(dashboard.overall.percent).toBe(100);
  });

  it("group đúng theo đơn vị chủ quản, nhóm trưởng và cột E của Google Sheet", () => {
    const leadA = "HTĐK_VÕ QUANG MINH";
    const leadB = "TBCH_LÝ NGỌC LĨNH";
    const data = makeData(
      [
        makeTask({
          id: "utility",
          donVi: "UTILITY",
          nhom: "DK-DCS",
          nhomTruong: leadA,
          resourceName: "VÕ QUANG MINH"
        }),
        makeTask({
          id: "urea",
          donVi: "UREA",
          nhom: "DK-VALVE",
          nhomTruong: leadB,
          resourceName: "LÝ NGỌC LĨNH"
        })
      ],
      [makeProgress("utility", 100), makeProgress("urea", 50)]
    );

    const dashboard = buildExcelDashboard(data);
    const utility = dashboard.byOwnerUnit.find((row) => row.name === "UTILITY");
    const ureaLeadRow = dashboard.byOwnerUnitAndLead.find((row) => row.name === "UREA");
    const dcs = dashboard.resourceGroups.find((group) => group.title === "DK-DCS");

    expect(utility?.done).toBe(1);
    expect(ureaLeadRow?.values[leadB]).toBe(50);
    expect(ureaLeadRow?.totals[leadB]).toBe(1);
    expect(dcs?.rows).toHaveLength(1);
    expect(dcs?.rows[0]?.name).toBe("VÕ QUANG MINH");
  });

  it("tổng hợp đủ năm cấp Nhóm, Phân nhóm, nhóm chuyên môn, Đơn vị và Section", () => {
    const leadA = "HTĐK_VÕ QUANG MINH";
    const leadB = "TBCH_LÝ NGỌC LĨNH";
    const data = makeData(
      [
        makeTask({
          id: "five-levels-a",
          assignedTo: "user-1",
          nhomTruong: leadA,
          nhom: "DK-DCS",
          donVi: "UTILITY",
          section: "41000"
        }),
        makeTask({
          id: "five-levels-b",
          assignedTo: "user-2",
          nhomTruong: leadB,
          nhom: "DK-VALVE",
          donVi: "UREA",
          section: "21000"
        })
      ],
      [
        makeProgress("five-levels-a", 100),
        makeProgress("five-levels-b", 50, reportDate, "user-2")
      ],
      [
        {
          ...makeProfile("user-1"),
          orgGroup: "TB HT Điều khiển",
          subgroup: "PN1"
        },
        {
          ...makeProfile("user-2"),
          orgGroup: "TB Chấp hành",
          subgroup: "PN1"
        },
        {
          ...makeProfile("leader-pn1"),
          fullName: "Phan Trung Kiên",
          orgGroup: "TB HT Điều khiển",
          orgRole: "pnt",
          subgroup: "PN1"
        }
      ]
    );

    const dashboard = buildExcelDashboard(data);

    expect(dashboard.byLead).toEqual([
      expect.objectContaining({ name: leadA, total: 1, percent: 100 }),
      expect.objectContaining({ name: leadB, total: 1, percent: 50 })
    ]);
    expect(dashboard.bySubgroup).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "TB HT Điều khiển · PN1", total: 1, percent: 100 }),
      expect.objectContaining({ name: "TB Chấp hành · PN1", total: 1, percent: 50 })
    ]));
    expect(dashboard.subgroupsByLead).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: "HT Điều khiển",
        context: leadA.replace("_", " "),
        rowLabels: { PN1: "PN1 · Phan Trung Kiên" },
        rows: [expect.objectContaining({ name: "PN1", total: 1, percent: 100 })]
      }),
      expect.objectContaining({
        name: "TB Chấp hành",
        context: leadB.replace("_", " "),
        rows: [expect.objectContaining({ name: "PN1", total: 1, percent: 50 })]
      })
    ]));
    expect(dashboard.bySpecialtyGroup).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "DK-DCS", total: 1, percent: 100 }),
      expect.objectContaining({ name: "DK-VALVE", total: 1, percent: 50 })
    ]));
    expect(dashboard.byOwnerUnit).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "UTILITY", total: 1, percent: 100 }),
      expect.objectContaining({ name: "UREA", total: 1, percent: 50 })
    ]));
    expect(dashboard.bySection).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "41000", total: 1, percent: 100 }),
      expect.objectContaining({ name: "21000", total: 1, percent: 50 })
    ]));
    expect(dashboard.sectionsByOwnerUnit).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: "UTILITY",
        rows: [expect.objectContaining({ name: "41000", total: 1, percent: 100 })]
      }),
      expect.objectContaining({
        name: "UREA",
        rows: [expect.objectContaining({ name: "21000", total: 1, percent: 50 })]
      })
    ]));
    expect(dashboard.bySectionAndLead.find((row) => row.name === "41000")?.totals[leadA]).toBe(1);
  });

  it("hiển thị tên Nhóm trưởng cho WO do chính Nhóm trưởng thực hiện", () => {
    const profiles = createProfilesFromAccounts(createSeedAccounts());
    const leader = profiles.find((profile) => profile.username === "minhvq");
    const pn5 = profiles.find((profile) => profile.username === "minhnc");
    expect(leader).toBeDefined();
    expect(pn5).toBeDefined();
    if (!leader || !pn5) throw new Error("Thiếu hồ sơ Nhóm HT Điều khiển");

    const lead = "HTĐK_VÕ QUANG MINH";
    const data = makeData(
      [
        makeTask({
          id: "leader-task",
          nhomTruong: lead,
          assignedTo: leader.id,
          reporterId: pn5.id,
          resourceName: leader.resourceName
        }),
        makeTask({
          id: "pn5-task",
          nhomTruong: lead,
          assignedTo: pn5.id,
          resourceName: pn5.resourceName
        }),
        makeTask({
          id: "unknown-task",
          nhomTruong: lead,
          assignedTo: "missing-user",
          resourceName: "KHÔNG CÓ HỒ SƠ"
        })
      ],
      [makeProgress("leader-task", 100), makeProgress("pn5-task", 50)],
      profiles
    );

    const dashboard = buildExcelDashboard(data);
    const rows = dashboard.subgroupsByLead.find((group) => group.name === "HT Điều khiển")?.rows;
    expect(rows).toHaveLength(3);
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Võ Quang Minh", total: 1, percent: 100 }),
      expect.objectContaining({ name: "PN5", total: 1, percent: 50 }),
      expect.objectContaining({ name: "Chưa phân loại", total: 1, percent: 0 })
    ]));
    expect(dashboard.bySubgroup).toContainEqual(
      expect.objectContaining({ name: "TB HT Điều khiển · Võ Quang Minh", total: 1 })
    );
  });

  it("phân đúng WO của Võ Minh Hoàng, Đàm Trung Hiếu và Trần Chí Bằng về PN", () => {
    const profiles = createProfilesFromAccounts(createSeedAccounts());
    const voMinhHoang = profiles.find((profile) => profile.username === "hoangvm");
    const damTrungHieu = profiles.find((profile) => profile.username === "hieudt2");
    const tranChiBang = profiles.find((profile) => profile.username === "bangtc");
    expect(voMinhHoang).toBeDefined();
    expect(damTrungHieu).toBeDefined();
    expect(tranChiBang).toBeDefined();
    if (!voMinhHoang || !damTrungHieu || !tranChiBang) {
      throw new Error("Thiếu seed Nhóm TB Đo lường");
    }

    const lead = "TB ĐO_NGUYỄN THANH HẢI";
    const data = makeData(
      [
        makeTask({
          id: "do-luong-pn8-deputy",
          assignedTo: voMinhHoang.id,
          reporterId: voMinhHoang.id,
          resourceName: voMinhHoang.resourceName,
          nhomTruong: lead
        }),
        makeTask({
          id: "do-luong-pn11",
          assignedTo: damTrungHieu.id,
          reporterId: damTrungHieu.id,
          resourceName: damTrungHieu.resourceName,
          nhomTruong: lead
        }),
        makeTask({
          id: "do-luong-pn12",
          assignedTo: tranChiBang.id,
          reporterId: tranChiBang.id,
          resourceName: tranChiBang.resourceName,
          nhomTruong: lead
        })
      ],
      [],
      profiles
    );

    const dashboard = buildExcelDashboard(data);

    expect(dashboard.bySubgroup).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "TB Đo lường · PN8", total: 1 }),
      expect.objectContaining({ name: "TB Đo lường · PN11", total: 1 }),
      expect.objectContaining({ name: "TB Đo lường · PN12", total: 1 })
    ]));
    expect(dashboard.subgroupsByLead).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: "TB Đo lường",
        rowLabels: expect.objectContaining({
          PN8: "PN8 · Trịnh Phước Tùng",
          PN11: "PN11 · Đàm Trung Hiếu",
          PN12: "PN12 · Trần Chí Bằng"
        })
      })
    ]));
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

    const dashboard = buildExcelDashboard(data);
    const leadStatus = dashboard.leadStatus.find((row) => row.name === lead);

    expect(dashboard.overall.total).toBe(1);
    expect(dashboard.overall.percent).toBe(100);
    expect(leadStatus).toMatchObject({ completed: 1, cancelled: 1, total: 2 });
  });

  it("Biểu đồ 01 tính tiến độ danh nghĩa trên tất cả WO và đếm trạng thái riêng", () => {
    const data = makeData(
      [
        makeTask({ id: "done" }),
        makeTask({ id: "doing" }),
        makeTask({ id: "remaining" }),
        makeTask({ id: "cancelled", isCancelled: true })
      ],
      [
        makeProgress("done", 100),
        makeProgress("doing", 25),
        makeProgress("cancelled", 50)
      ]
    );

    const dashboard = buildExcelDashboard(data);

    expect(dashboard.nominalOverall).toMatchObject({
      done: 1.75,
      remaining: 2.25,
      total: 4,
      percent: 44
    });
    expect(dashboard.executive).toMatchObject({
      totalTasks: 4,
      activeTasks: 3,
      completedTasks: 1,
      inProgressTasks: 1,
      notStartedTasks: 1,
      cancelledTasks: 1,
      overallPercent: 44
    });
    expect(dashboard.overall).toMatchObject({ total: 3, percent: 42 });
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

    const dashboard = buildExcelDashboard(data);

    expect(dashboard.executive).toMatchObject({
      activeTasks: 3,
      completedTasks: 1,
      inProgressTasks: 1,
      notStartedTasks: 1,
      unfinishedTasks: 2,
      updatedTasks: 2,
      submittedWorkers: 1,
      totalWorkers: 1
    });
    expect(dashboard.attentionOwnerUnits[0]?.name).toBe("UREA");
    expect(dashboard.attentionLeads[0]?.notStarted).toBe(1);
  });

  it("gộp các biến thể tên nhóm trưởng, nhóm cột E và tên resource", () => {
    const lead = "TB ĐO_NGUYỄN THANH HẢI";
    const data = makeData(
      [
        makeTask({
          id: "accented",
          donVi: "UTILITY",
          nhom: "DK-DCS",
          nhomTruong: lead,
          resourceName: "LÊ BÁ TỨ"
        }),
        makeTask({
          id: "plain",
          donVi: "UTILITY",
          nhom: "dk dcs",
          nhomTruong: "TB DO_NGUYEN THANH HAI",
          resourceName: "LE BA TU"
        })
      ],
      [makeProgress("accented", 100), makeProgress("plain", 50)]
    );

    const dashboard = buildExcelDashboard(data);
    const leadStatus = dashboard.leadStatus.find((row) => row.name === lead);
    const unitLead = dashboard.byOwnerUnitAndLead.find((row) => row.name === "UTILITY");
    const dcs = dashboard.resourceGroups.find((group) => group.title === "DK-DCS");

    expect(dashboard.leadNames).toEqual([lead]);
    expect(leadStatus).toMatchObject({ completed: 1, inProgress: 1, total: 2 });
    expect(unitLead?.values[lead]).toBe(75);
    expect(unitLead?.totals[lead]).toBe(2);
    expect(dcs?.rows).toHaveLength(1);
    expect(dcs?.rows[0]).toMatchObject({ total: 2, percent: 75 });
  });

  it("không tạo Nhóm riêng từ người phụ trách ngoài bốn Nhóm trưởng chính", () => {
    const lead = "TBCH_LÝ NGỌC LĨNH";
    const data = makeData(
      [
        makeTask({ id: "tbch", nhomTruong: "Lý Ngọc Lĩnh", assignedTo: "user-cung" }),
        makeTask({
          id: "hau-can-vinh",
          nhom: "Hậu cần & Tổng hợp",
          nhomTruong: "Lâm Phùng Phước Vinh",
          assignedTo: "user-vinh"
        })
      ],
      [makeProgress("tbch", 50), makeProgress("hau-can-vinh", 100)],
      [
        {
          ...makeProfile("user-cung"),
          orgGroup: "TB Chấp hành",
          subgroup: "PN1"
        },
        {
          ...makeProfile("user-vinh"),
          username: "vinhlpp",
          fullName: "Lâm Phùng Phước Vinh",
          resourceName: "Lâm Phùng Phước Vinh",
          orgGroup: "Hậu cần & Tổng hợp",
          subgroup: ""
        }
      ]
    );

    const dashboard = buildExcelDashboard(data);

    expect(dashboard.overall).toMatchObject({ total: 2, percent: 75 });
    expect(dashboard.leadNames).toEqual([lead]);
    expect(dashboard.byLead).toEqual([
      expect.objectContaining({ name: lead, total: 1, percent: 50 })
    ]);
    expect(dashboard.leadStatus.map((row) => row.name)).not.toContain(
      "Lâm Phùng Phước Vinh"
    );
    expect(dashboard.subgroupsByLead).toEqual([
      expect.objectContaining({
        name: "TB Chấp hành",
        rows: [expect.objectContaining({ name: "PN1", total: 1, percent: 50 })]
      })
    ]);
  });

  it("tạo đủ bảy chart chuyên môn và dữ liệu lọc Đơn vị–Section", () => {
    const leadA = "HTĐK_VÕ QUANG MINH";
    const leadB = "TBCH_LÝ NGỌC LĨNH";
    const data = makeData(
      [
        makeTask({ id: "dcs", nhom: "DK-DCS", resourceName: "LÊ BÁ TỨ", nhomTruong: leadA }),
        makeTask({ id: "plc", nhom: "DK-PLC", resourceName: "LÊ BÁ TỨ", nhomTruong: leadA }),
        makeTask({
          id: "valve",
          nhom: "DK-VALVE",
          resourceName: "HỮU VĂN CƯNG",
          nhomTruong: "Lý Ngọc Lĩnh",
          donVi: "UREA",
          section: "21000"
        }),
        makeTask({ id: "thao-lap", nhom: "DK-T.CA", resourceName: "ĐINH VĂN TRIỂN" }),
        makeTask({ id: "amll", nhom: "DK- AMLL", resourceName: "CÙ MINH THÀNH" }),
        makeTask({ id: "bently", nhom: "DK-BENT", resourceName: "NGUYỄN VĂN NGÀ" }),
        makeTask({ id: "nhiet", nhom: "DK-NHIET", resourceName: "ĐÀM TRUNG HIẾU" }),
        makeTask({ id: "pi", nhom: "DK-HC", resourceName: "TRẦN CHÍ BẰNG" })
      ],
      [
        makeProgress("dcs", 100),
        makeProgress("plc", 50),
        makeProgress("valve", 75)
      ]
    );

    const dashboard = buildExcelDashboard(data);

    expect(dashboard.operationalGroups.map((group) => group.title)).toEqual([
      "Nhóm thiết bị Hệ thống điều khiển",
      "Nhóm thiết bị Chấp hành",
      "Nhóm Tháo lắp TBĐK",
      "Nhóm TB Đo - Áp, Mức, Lưu lượng",
      "Nhóm TB Đo - Bently",
      "Nhóm TB Đo - Nhiệt độ",
      "Nhóm TB Đo - PI"
    ]);
    expect(dashboard.operationalGroups[0]?.rows).toEqual([
      expect.objectContaining({ name: "LÊ BÁ TỨ", total: 2, percent: 75 })
    ]);
    expect(dashboard.byUnitSectionAndLead).toEqual(expect.arrayContaining([
      expect.objectContaining({
        unit: "UREA",
        section: "21000",
        values: expect.objectContaining({ [leadB]: 75 }),
        totals: expect.objectContaining({ [leadB]: 1 })
      })
    ]));
  });

  it("theo dõi sáu tag Van và pipeline lũy kế của Hữu Văn Cưng", () => {
    const data = makeData(
      [
        makeTask({
          id: "voting-75",
          tagname: "06HV-1005",
          nhom: "DK-VALVE",
          resourceName: "HỮU VĂN CƯNG",
          nhomTruong: "Lý Ngọc Lĩnh"
        }),
        makeTask({
          id: "voting-100",
          tagname: "06HV-1008",
          nhom: "DK-VALVE",
          resourceName: "HỮU VĂN CƯNG",
          nhomTruong: "Lý Ngọc Lĩnh"
        }),
        makeTask({
          id: "other-valve",
          tagname: "TAG-KHÁC",
          nhom: "DK-VALVE",
          resourceName: "HỮU VĂN CƯNG",
          nhomTruong: "Lý Ngọc Lĩnh"
        })
      ],
      [
        makeProgress("voting-75", 75),
        makeProgress("voting-100", 100),
        makeProgress("other-valve", 25)
      ]
    );

    const dashboard = buildExcelDashboard(data);

    expect(dashboard.votingValveRows).toHaveLength(6);
    expect(dashboard.votingValveRows[0]).toMatchObject({
      name: "06HV-1005",
      total: 1,
      percent: 75
    });
    expect(dashboard.votingValveRows[5]).toMatchObject({
      name: "04TV-2577",
      total: 0,
      percent: 0
    });
    expect(dashboard.valveMilestones).toEqual([
      expect.objectContaining({
        label: "Đã tháo nguồn, tháo khí",
        threshold: 10,
        count: 3,
        total: 3,
        percent: 100
      }),
      expect.objectContaining({ threshold: 20, count: 3, total: 3, percent: 100 }),
      expect.objectContaining({ threshold: 30, count: 2, total: 3, percent: 67 }),
      expect.objectContaining({ threshold: 50, count: 2, total: 3, percent: 67 }),
      expect.objectContaining({ threshold: 70, count: 2, total: 3, percent: 67 }),
      expect.objectContaining({ threshold: 90, count: 1, total: 3, percent: 33 })
    ]);
  });

  it("tạo card động cho mọi nhóm có dữ liệu ở cột E", () => {
    const data = makeData(
      [
        makeTask({ id: "valve", nhom: "DK-VALVE", resourceName: "NGÔ THANH LÂM" }),
        makeTask({ id: "bent", nhom: "DK-BENT", resourceName: "TRẦN NHỰT QUANG" }),
        makeTask({ id: "bent-2", nhom: "DK-BENT", resourceName: "DƯƠNG QUỐC THẠNH" }),
        makeTask({ id: "plc", nhom: "DK-PLC", resourceName: "PHAN TRUNG KIÊN" }),
        makeTask({ id: "plc-2", nhom: "DK-PLC", resourceName: "LÊ BÁ TỨ" }),
        makeTask({ id: "plc-3", nhom: "DK-PLC", resourceName: "TRỊNH VĂN KIỀU" })
      ],
      []
    );

    const dashboard = buildExcelDashboard(data);

    expect(dashboard.resourceGroups.map((group) => group.title)).toEqual([
      "DK-PLC",
      "DK-BENT",
      "DK-VALVE"
    ]);
    expect(dashboard.resourceGroups.map((group) => group.rows.length)).toEqual([3, 2, 1]);
  });

  it("khong dem progress cua user ngoai danh sach worker vao KPI worker bao cao", () => {
    const data = makeData(
      [makeTask({ id: "task-1" }), makeTask({ id: "task-2" })],
      [
        makeProgress("task-1", 50, reportDate, "user-1"),
        makeProgress("task-2", 25, reportDate, "unknown-db-user"),
        makeProgress("task-2", 75, reportDate, "admin-user")
      ],
      [makeProfile("user-1")]
    );

    const dashboard = buildExcelDashboard(data);

    expect(dashboard.executive.submittedWorkers).toBe(1);
    expect(dashboard.executive.totalWorkers).toBe(1);
  });

  it("không tính nhân sự không có trách nhiệm báo cáo vào tổng hoặc đã gửi", () => {
    const data = makeData(
      [makeTask({ id: "task-1", assignedTo: "user-1" })],
      [],
      [
        makeProfile("user-1"),
        {
          ...makeProfile("leader-1"),
          role: "admin",
          orgRole: "nhomTruong"
        }
      ]
    );

    const dashboard = buildExcelDashboard(data);

    expect(dashboard.executive.submittedWorkers).toBe(0);
    expect(dashboard.executive.totalWorkers).toBe(1);
  });

});
