import { describe, expect, it } from "vitest";
import {
  applyAccountProfileOverrides,
  createSeedAccounts
} from "@/lib/accounts";
import {
  ORG_2026_SEEDS,
  ORG_GROUPS,
  getOrgScopeKey,
  getOrgSubgroups
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
    expect(profilesByUsername.get("vinhlpp")?.orgAssignment).toContain(
      "kiêm thành viên PN1 - Nhóm TB Chấp hành"
    );
    expect(profilesByUsername.get("zoneamo")).toMatchObject({
      role: "worker",
      orgGroup: "Vận hành",
      subgroup: "AMONIA",
      isPlaceholder: true,
      canLogin: true,
      mustChangePassword: false
    });
    expect(profilesByUsername.get("zoneure")?.subgroup).toBe("UREA");
    expect(profilesByUsername.get("zoneuti")?.subgroup).toBe("UTILITY");
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
    expect(profilesByUsername.get("sangpt")).toMatchObject({
      role: "admin",
      orgRole: "nhomPho",
      orgGroup: ORG_GROUPS.doLuong,
      managedGroups: [],
      managedSubgroups: [
        getOrgScopeKey(ORG_GROUPS.doLuong, "PN1"),
        getOrgScopeKey(ORG_GROUPS.doLuong, "PN2"),
        getOrgScopeKey(ORG_GROUPS.doLuong, "PN3"),
        getOrgScopeKey(ORG_GROUPS.doLuong, "PN4"),
        getOrgScopeKey(ORG_GROUPS.doLuong, "PN5"),
        getOrgScopeKey(ORG_GROUPS.doLuong, "PN6")
      ]
    });
    expect(profilesByUsername.get("hoangvm")).toMatchObject({
      role: "admin",
      orgRole: "nhomPho",
      orgGroup: ORG_GROUPS.doLuong,
      managedGroups: [],
      managedSubgroups: [
        getOrgScopeKey(ORG_GROUPS.doLuong, "PN7"),
        getOrgScopeKey(ORG_GROUPS.doLuong, "PN8"),
        getOrgScopeKey(ORG_GROUPS.doLuong, "PN9"),
        getOrgScopeKey(ORG_GROUPS.doLuong, "PN10"),
        getOrgScopeKey(ORG_GROUPS.doLuong, "PN11")
      ]
    });
    expect(profilesByUsername.get("hieudt2")).toMatchObject({
      role: "admin",
      orgRole: "pnt",
      orgGroup: ORG_GROUPS.doLuong,
      subgroup: "PN11",
      managedSubgroups: [getOrgScopeKey(ORG_GROUPS.doLuong, "PN11")]
    });
    expect(profilesByUsername.get("bangtc")).toMatchObject({
      role: "admin",
      orgRole: "pnt",
      orgGroup: ORG_GROUPS.doLuong,
      subgroup: "PN12",
      managedSubgroups: [getOrgScopeKey(ORG_GROUPS.doLuong, "PN12")]
    });
    expect(getOrgSubgroups(ORG_GROUPS.doLuong)).toEqual([
      "PN1",
      "PN2",
      "PN3",
      "PN4",
      "PN5",
      "PN6",
      "PN7",
      "PN8",
      "PN9",
      "PN10",
      "PN11",
      "PN12"
    ]);
  });

  it("không đưa nhân sự bên ngoài của Nhóm TB Đo lường vào dữ liệu", () => {
    const externalNames = new Set([
      "Trà Việt Trọng Tín",
      "Trần Nguyễn Bá Thiện",
      "Hoàng Đình Thành",
      "Trần Đình Chiều",
      "Trần Thanh Tiến",
      "Nguyễn Văn Tú",
      "Phùng Minh Đức",
      "Bùi Hải Nam",
      "Hồ Minh Sum",
      "Lê Bá Hồng",
      "Tô Thanh Toàn",
      "Đỗ Văn Thiện",
      "Tô Quang Tuấn",
      "Đoàn Hữu Lực",
      "Nguyễn Hoàng Giang",
      "Nguyễn Gia Hạo"
    ]);
    const doLuongProfiles = ORG_2026_SEEDS.filter(
      (profile) => profile.orgGroup === ORG_GROUPS.doLuong
    );

    expect(doLuongProfiles.every((profile) => !profile.isPlaceholder)).toBe(true);
    expect(
      doLuongProfiles.filter((profile) => externalNames.has(profile.fullName))
    ).toEqual([]);
  });

  it("không trùng username trong cơ cấu chính thức", () => {
    const usernames = ORG_2026_SEEDS.map(
      (profile) => profile.username ?? profile.email.split("@")[0]
    );

    expect(new Set(usernames).size).toBe(usernames.length);
  });
});

describe("applyAccountProfileOverrides", () => {
  it("giữ phạm vi PN1-PN6 cho Phan Thanh Sang khi Supabase có metadata cơ cấu", () => {
    const accounts = applyAccountProfileOverrides(createSeedAccounts(), [
      {
        username: "sangpt",
        role: "admin",
        org_group: ORG_GROUPS.doLuong,
        subgroup: null,
        org_role: "nhomPho"
      }
    ]);
    const account = accounts.find((item) => item.username === "sangpt");

    expect(account).toMatchObject({
      managedGroups: [],
      managedSubgroups: [
        getOrgScopeKey(ORG_GROUPS.doLuong, "PN1"),
        getOrgScopeKey(ORG_GROUPS.doLuong, "PN2"),
        getOrgScopeKey(ORG_GROUPS.doLuong, "PN3"),
        getOrgScopeKey(ORG_GROUPS.doLuong, "PN4"),
        getOrgScopeKey(ORG_GROUPS.doLuong, "PN5"),
        getOrgScopeKey(ORG_GROUPS.doLuong, "PN6")
      ]
    });
  });

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
    expect(account?.orgAssignment).toContain(
      "kiêm thành viên PN1 - Nhóm TB Chấp hành"
    );
  });
});
