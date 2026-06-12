import { describe, expect, it } from "vitest";
import { getOrgScopeKey } from "@/lib/org2026";
import {
  canViewProfile,
  canViewTask,
  hasFullOrgScope,
  isDataAdminAccount
} from "@/lib/permissions";
import type { AuthAccount, OrgRole, Profile, Task, UserRole } from "@/types/domain";

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
