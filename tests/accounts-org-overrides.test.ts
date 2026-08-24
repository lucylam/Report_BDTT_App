import { describe, expect, it } from "vitest";
import {
  applyAccountProfileOverrides,
  createSeedAccounts
} from "@/lib/accounts";
import {
  ORG_2026_SEEDS,
  ORG_GROUPS,
  getOrgScopeKey
} from "@/lib/org2026";

describe("sơ đồ tổ chức chính thức", () => {
  it("phản ánh các thay đổi vai trò và phân nhóm mới", () => {
    const profilesByUsername = new Map(
      ORG_2026_SEEDS.map((profile) => [
        profile.username ?? profile.email.split("@")[0],
        profile
      ])
    );

    expect(profilesByUsername.get("mainh")).toMatchObject({
      role: "worker",
      orgRole: "member",
      orgGroup: ORG_GROUPS.hauCan,
      subgroup: ""
    });
    expect(profilesByUsername.get("vinhlpp")).toMatchObject({
      role: "admin",
      orgRole: "member",
      orgGroup: ORG_GROUPS.hauCan,
      subgroup: "",
      managedGroups: [],
      managedSubgroups: []
    });
    expect(profilesByUsername.get("hautv")).toMatchObject({
      role: "admin",
      orgRole: "nhomPho",
      orgGroup: ORG_GROUPS.chapHanh,
      subgroup: ""
    });
    expect(profilesByUsername.get("loitt")).toMatchObject({
      role: "admin",
      orgRole: "pnt",
      orgGroup: ORG_GROUPS.chapHanh,
      subgroup: "PN6"
    });
    expect(profilesByUsername.get("vunv")).toMatchObject({
      role: "admin",
      orgRole: "pnt",
      orgGroup: ORG_GROUPS.chapHanh,
      subgroup: "PN7"
    });
    expect(profilesByUsername.get("hieutt")).toMatchObject({
      role: "admin",
      orgRole: "pnt",
      orgGroup: ORG_GROUPS.chapHanh,
      subgroup: "PN12"
    });
  });

  it("không trùng username trong cơ cấu chính thức", () => {
    const usernames = ORG_2026_SEEDS.map(
      (profile) => profile.username ?? profile.email.split("@")[0]
    );

    expect(new Set(usernames).size).toBe(usernames.length);
  });
});

describe("applyAccountProfileOverrides", () => {
  it("cập nhật vai trò PNT và tính lại đúng phạm vi phân nhóm", () => {
    const accounts = applyAccountProfileOverrides(createSeedAccounts(), [
      {
        username: "nhatpm",
        role: "admin",
        org_group: ORG_GROUPS.doLuong,
        subgroup: "PN3",
        org_role: "pnt"
      }
    ]);
    const account = accounts.find((item) => item.username === "nhatpm");

    expect(account).toMatchObject({
      role: "admin",
      orgGroup: ORG_GROUPS.doLuong,
      subgroup: "PN3",
      orgRole: "pnt",
      managedGroups: [],
      managedSubgroups: [getOrgScopeKey(ORG_GROUPS.doLuong, "PN3")]
    });
  });

  it("hạ vai trò về thành viên và xóa phạm vi quản lý cũ", () => {
    const accounts = applyAccountProfileOverrides(createSeedAccounts(), [
      {
        username: "cunghv",
        role: "worker",
        org_group: ORG_GROUPS.htDieuKhien,
        subgroup: "PN2",
        org_role: "member"
      }
    ]);
    const account = accounts.find((item) => item.username === "cunghv");

    expect(account).toMatchObject({
      role: "worker",
      orgGroup: ORG_GROUPS.htDieuKhien,
      subgroup: "PN2",
      orgRole: "member",
      managedGroups: [],
      managedSubgroups: []
    });
  });

  it("giữ cơ cấu seed khi database chưa có metadata tổ chức", () => {
    const seedAccount = createSeedAccounts().find((item) => item.username === "linhln");
    const accounts = applyAccountProfileOverrides(createSeedAccounts(), [
      {
        username: "linhln",
        role: "admin",
        org_group: null,
        subgroup: null,
        org_role: null
      }
    ]);
    const account = accounts.find((item) => item.username === "linhln");

    expect(account).toEqual(seedAccount);
  });

  it("giữ quyền admin cho vinhlpp khi vai trò tổ chức là thành viên", () => {
    const accounts = applyAccountProfileOverrides(createSeedAccounts(), [
      {
        username: "vinhlpp",
        role: "admin",
        org_group: ORG_GROUPS.hauCan,
        subgroup: null,
        org_role: "member"
      }
    ]);
    const account = accounts.find((item) => item.username === "vinhlpp");

    expect(account).toMatchObject({
      role: "admin",
      orgRole: "member",
      orgGroup: ORG_GROUPS.hauCan,
      managedGroups: [],
      managedSubgroups: []
    });
  });
});
