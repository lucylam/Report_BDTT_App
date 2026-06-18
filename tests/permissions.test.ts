import { describe, expect, it } from "vitest";
import { getOrgScopeKey } from "@/lib/org2026";
import {
  canViewProfile,
  canViewTask,
  getScopedAppData,
  hasFullOrgScope,
  isDataAdminAccount
} from "@/lib/permissions";
import type {
  AppData,
  AuthAccount,
  OrgRole,
  Profile,
  ProgressRecord,
  Task,
  UserRole
} from "@/types/domain";

const makeAccount = (
  overrides: Partial<AuthAccount> & { readonly username: string }
): AuthAccount => ({
  id: `user-${overrides.username}`,
  email: `${overrides.username}@example.com`,
  employeeCode: "",
  fullName: overrides.username.toUpperCase(),
  resourceName: overrides.username.toUpperCase(),
  role: "worker" as UserRole,
  orgGroup: "Nhóm A",
  subgroup: "",
  orgRole: "member" as OrgRole,
  orgTitle: "",
  orgAssignment: "",
  managedGroups: [],
  managedSubgroups: [],
  isPlaceholder: false,
  canLogin: true,
  password: "x",
  mustChangePassword: false,
  ...overrides
});

const makeProfile = (
  overrides: Partial<Profile> & { readonly id: string }
): Profile => ({
  email: "",
  username: overrides.id,
  employeeCode: "",
  fullName: "",
  resourceName: "",
  nhom: "",
  nhomTruong: "",
  role: "worker" as UserRole,
  orgGroup: "Nhóm A",
  subgroup: "",
  orgRole: "member" as OrgRole,
  orgTitle: "",
  orgAssignment: "",
  managedGroups: [],
  managedSubgroups: [],
  isPlaceholder: false,
  canLogin: true,
  mustChangePassword: false,
  ...overrides
});

describe("hasFullOrgScope", () => {
  it("data admin và top manager có toàn quyền xem", () => {
    expect(hasFullOrgScope(makeAccount({ username: "vinhlpp" }))).toBe(true);
    expect(hasFullOrgScope(makeAccount({ username: "kiaq" }))).toBe(true);
    expect(hasFullOrgScope(makeAccount({ username: "VINHLPP " }))).toBe(true);
  });

  it("tổ trưởng và supervisor có toàn quyền xem", () => {
    expect(
      hasFullOrgScope(makeAccount({ username: "a", orgRole: "toTruong" }))
    ).toBe(true);
    expect(
      hasFullOrgScope(makeAccount({ username: "b", orgRole: "supervisor" }))
    ).toBe(true);
  });

  it("worker thường không có toàn quyền", () => {
    expect(hasFullOrgScope(makeAccount({ username: "worker1" }))).toBe(false);
    expect(hasFullOrgScope(null)).toBe(false);
  });
});

describe("isDataAdminAccount", () => {
  it("chỉ đúng với username vinhlpp (không phân biệt hoa thường)", () => {
    expect(isDataAdminAccount(makeAccount({ username: "vinhlpp" }))).toBe(true);
    expect(isDataAdminAccount(makeAccount({ username: "kiaq" }))).toBe(false);
    expect(isDataAdminAccount(null)).toBe(false);
  });
});

describe("canViewProfile", () => {
  it("ai cũng xem được chính mình", () => {
    const account = makeAccount({ username: "worker1" });
    const ownProfile = makeProfile({ id: account.id });
    expect(canViewProfile(account, ownProfile)).toBe(true);
  });

  it("worker không xem được người khác", () => {
    const account = makeAccount({ username: "worker1" });
    const other = makeProfile({ id: "user-other" });
    expect(canViewProfile(account, other)).toBe(false);
  });

  it("admin xem được profile trong nhóm mình quản lý", () => {
    const admin = makeAccount({
      username: "nhomtruong1",
      role: "admin",
      managedGroups: ["Nhóm A"]
    });
    const inGroup = makeProfile({ id: "user-x", orgGroup: "Nhóm A" });
    const outGroup = makeProfile({ id: "user-y", orgGroup: "Nhóm B" });
    expect(canViewProfile(admin, inGroup)).toBe(true);
    expect(canViewProfile(admin, outGroup)).toBe(false);
  });

  it("nhóm trưởng xem được PNT/admin trong nhóm mình quản lý", () => {
    const groupLead = makeAccount({
      username: "lead-a",
      role: "admin",
      orgRole: "nhomTruong",
      managedGroups: ["Nhóm A"]
    });
    const pnt = makeProfile({
      id: "user-pnt-a",
      role: "admin",
      orgGroup: "Nhóm A",
      orgRole: "pnt",
      subgroup: "PN1"
    });
    const member = makeProfile({
      id: "user-member-a",
      role: "worker",
      orgGroup: "Nhóm A",
      orgRole: "member",
      subgroup: "PN1"
    });
    const outsidePnt = makeProfile({
      id: "user-pnt-b",
      role: "admin",
      orgGroup: "Nhóm B",
      orgRole: "pnt",
      subgroup: "PN1"
    });

    expect(canViewProfile(groupLead, pnt)).toBe(true);
    expect(canViewProfile(groupLead, member)).toBe(true);
    expect(canViewProfile(groupLead, outsidePnt)).toBe(false);
  });

  it("admin xem được profile trong subgroup mình quản lý", () => {
    const admin = makeAccount({
      username: "nhompho1",
      role: "admin",
      managedSubgroups: [getOrgScopeKey("Nhóm B", "PN1")]
    });
    const inSubgroup = makeProfile({
      id: "user-x",
      orgGroup: "Nhóm B",
      subgroup: "PN1"
    });
    const outSubgroup = makeProfile({
      id: "user-y",
      orgGroup: "Nhóm B",
      subgroup: "PN2"
    });
    expect(canViewProfile(admin, inSubgroup)).toBe(true);
    expect(canViewProfile(admin, outSubgroup)).toBe(false);
  });
});

describe("canViewTask", () => {
  const baseTask: Task = {
    id: "task-1",
    stt: 1,
    wo: "WO-1",
    tagname: "TAG-1",
    taskName: "Bảo dưỡng van",
    nhom: "Nhóm A",
    donVi: "Xưởng 1",
    section: "",
    duration: "1d",
    priority: 1,
    startDate: "",
    finishDate: "",
    resourceName: "WORKER1",
    nhomTruong: "",
    assignedTo: "user-x",
    isCancelled: false,
    cancelReason: ""
  };

  it("admin nhóm xem được task giao cho người trong nhóm", () => {
    const admin = makeAccount({
      username: "nhomtruong1",
      role: "admin",
      managedGroups: ["Nhóm A"]
    });
    const profiles = [makeProfile({ id: "user-x", orgGroup: "Nhóm A" })];
    expect(canViewTask(admin, baseTask, profiles)).toBe(true);
  });

  it("task chưa giao thì worker thường không xem được", () => {
    const account = makeAccount({ username: "worker1" });
    expect(
      canViewTask(account, { ...baseTask, assignedTo: "" }, [])
    ).toBe(false);
  });
});

describe("getScopedAppData", () => {
  const makeProgress = (taskId: string, userId: string): ProgressRecord => ({
    taskId,
    userId,
    reportDate: "2025-08-22",
    percent: 50,
    note: "",
    submittedAt: "2025-08-22T08:00:00+07:00"
  });

  const makeTaskForAssignee = (id: string, assignedTo: string, nhom = "Nhóm A"): Task => ({
    id,
    stt: 1,
    wo: `WO-${id}`,
    tagname: `TAG-${id}`,
    taskName: `Task ${id}`,
    nhom,
    donVi: "UTILITY",
    section: "",
    duration: "1d",
    priority: 1,
    startDate: "",
    finishDate: "",
    resourceName: assignedTo.toUpperCase(),
    nhomTruong: "",
    assignedTo,
    isCancelled: false,
    cancelReason: ""
  });

  it("scope nhóm trưởng giữ cả PNT, thành viên và task/progress của họ", () => {
    const groupLead = makeAccount({
      username: "lead-a",
      role: "admin",
      orgRole: "nhomTruong",
      managedGroups: ["Nhóm A"]
    });
    const pnt = makeProfile({
      id: "user-pnt-a",
      role: "admin",
      orgGroup: "Nhóm A",
      orgRole: "pnt",
      subgroup: "PN1"
    });
    const member = makeProfile({
      id: "user-member-a",
      role: "worker",
      orgGroup: "Nhóm A",
      orgRole: "member",
      subgroup: "PN1"
    });
    const outsidePnt = makeProfile({
      id: "user-pnt-b",
      role: "admin",
      orgGroup: "Nhóm B",
      orgRole: "pnt",
      subgroup: "PN1"
    });
    const pntTask = makeTaskForAssignee("task-pnt", pnt.id);
    const memberTask = makeTaskForAssignee("task-member", member.id);
    const outsideTask = makeTaskForAssignee("task-out", outsidePnt.id, "Nhóm B");
    const data: AppData = {
      accounts: [],
      profiles: [pnt, member, outsidePnt],
      tasks: [pntTask, memberTask, outsideTask],
      progress: [
        makeProgress(pntTask.id, pnt.id),
        makeProgress(memberTask.id, member.id),
        makeProgress(outsideTask.id, outsidePnt.id)
      ],
      dailySnapshots: [],
      offlineQueue: [],
      activeUserId: null
    };

    const scoped = getScopedAppData(data, groupLead);

    expect(scoped.profiles.map((profile) => profile.id).sort()).toEqual([
      member.id,
      pnt.id
    ]);
    expect(scoped.tasks.map((task) => task.id).sort()).toEqual([
      memberTask.id,
      pntTask.id
    ]);
    expect(scoped.progress.map((record) => record.userId).sort()).toEqual([
      member.id,
      pnt.id
    ]);
  });
});
