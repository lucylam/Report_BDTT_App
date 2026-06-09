import type { OrgMetadata, OrgRole, UserRole } from "@/types/domain";

export const BDTT_2026_TITLE = "Tiến độ BDTT 2026";
export const BDTT_2026_SUBTITLE = "Tổ Thiết bị Đo lường & Điều khiển";

export const ORG_GROUPS = {
  to: "Tổ TBĐL&ĐK",
  chapHanh: "TB Chấp hành",
  doLuong: "TB Đo lường",
  htDieuKhien: "TB HT Điều khiển",
  thaoLap: "Tháo/Lắp TB ĐK",
  hauCan: "Hậu cần & Tổng hợp"
} as const;

export interface AccountSeed2026 extends OrgMetadata {
  readonly fullName: string;
  readonly employeeCode: string;
  readonly email: string;
  readonly username?: string;
  readonly role: UserRole;
  readonly resourceName?: string;
}

const groupKey = (orgGroup: string, subgroup: string): string =>
  `${orgGroup}::${subgroup}`;

const groupLabel = (orgGroup: string): string => {
  if (orgGroup === ORG_GROUPS.to) return orgGroup;
  return orgGroup.startsWith("Nhóm ") ? orgGroup : `Nhóm ${orgGroup}`;
};

const subgroupLabel = (subgroup: string): string => {
  const pnMatch = subgroup.match(/^PN(\d+)$/);
  if (pnMatch) return `Phân nhóm ${pnMatch[1]}`;
  const pNhomMatch = subgroup.match(/^P\.Nhóm\s+(\d+)$/);
  if (pNhomMatch) return `Phân nhóm ${pNhomMatch[1]}`;
  return subgroup;
};

const subgroupAssignments: Record<string, string> = {
  [groupKey(ORG_GROUPS.chapHanh, "PN1")]: "Giám sát nhà thầu",
  [groupKey(ORG_GROUPS.chapHanh, "PN2")]: "Thực hiện cùng Cơ khí",
  [groupKey(ORG_GROUPS.chapHanh, "PN3")]: "Phụ trách hạng mục TB Chấp hành PN3",
  [groupKey(ORG_GROUPS.chapHanh, "PN4")]: "Phụ trách hạng mục TB Chấp hành PN4",
  [groupKey(ORG_GROUPS.chapHanh, "PN5")]: "Phụ trách hạng mục TB Chấp hành PN5",
  [groupKey(ORG_GROUPS.chapHanh, "PN6")]: "Phụ trách hạng mục TB Chấp hành PN6",
  [groupKey(ORG_GROUPS.chapHanh, "PN7")]: "Phụ trách hạng mục TB Chấp hành PN7",
  [groupKey(ORG_GROUPS.chapHanh, "PN8")]: "Phụ trách hạng mục TB Chấp hành PN8",
  [groupKey(ORG_GROUPS.chapHanh, "PN9")]: "Phụ trách hạng mục TB Chấp hành PN9",
  [groupKey(ORG_GROUPS.chapHanh, "PN10")]: "Phụ trách hạng mục TB Chấp hành PN10",
  [groupKey(ORG_GROUPS.doLuong, "PN1")]: "Máy nén K04431, K04441",
  [groupKey(ORG_GROUPS.doLuong, "PN2")]: "Máy nén K04421",
  [groupKey(ORG_GROUPS.doLuong, "PN3")]: "Máy nén CO2",
  [groupKey(ORG_GROUPS.doLuong, "PN4")]: "Máy động",
  [groupKey(ORG_GROUPS.doLuong, "PN5")]: "Nhiệt đường ống 1",
  [groupKey(ORG_GROUPS.doLuong, "PN6")]: "Nhiệt đường ống 2",
  [groupKey(ORG_GROUPS.doLuong, "PN7")]: "Áp, mức, lưu lượng 1",
  [groupKey(ORG_GROUPS.doLuong, "PN8")]: "Áp, mức, lưu lượng 2",
  [groupKey(ORG_GROUPS.doLuong, "PN9")]: "Áp, mức, lưu lượng 3",
  [groupKey(ORG_GROUPS.doLuong, "PN10")]: "Áp, mức, lưu lượng 4",
  [groupKey(ORG_GROUPS.doLuong, "PN11")]: "Kiểm định PI",
  [groupKey(ORG_GROUPS.htDieuKhien, "PN1")]: "Hệ thống điều khiển PN1",
  [groupKey(ORG_GROUPS.htDieuKhien, "PN2")]: "Hệ thống điều khiển PN2",
  [groupKey(ORG_GROUPS.htDieuKhien, "PN3")]: "Hệ thống điều khiển PN3",
  [groupKey(ORG_GROUPS.htDieuKhien, "PN4")]: "Hệ thống điều khiển PN4",
  [groupKey(ORG_GROUPS.htDieuKhien, "PN5")]: "Hệ thống điều khiển PN5",
  [groupKey(ORG_GROUPS.htDieuKhien, "PN6")]: "Cách ly, khôi phục, bypass, test tín hiệu toàn đợt BD",
  [groupKey(ORG_GROUPS.thaoLap, "PN1")]: "Tháo/Lắp TB điều khiển PN1",
  [groupKey(ORG_GROUPS.thaoLap, "PN2")]: "Tháo/Lắp TB điều khiển PN2",
  [groupKey(ORG_GROUPS.hauCan, "P.Nhóm 1")]: "Hậu cần và tổng hợp BDTT",
  [groupKey(ORG_GROUPS.hauCan, "P.Nhóm 2")]: "Giám sát, báo cáo và tổng hợp dữ liệu BDTT"
};

const personalAssignments: Record<string, string> = {
  kiaq: "Phụ trách chung Tổ Thiết bị Đo lường & Điều khiển",
  linhln: "Phụ trách chung Nhóm TB Chấp hành; trực tiếp PN1, PN2",
  loitt: "Phụ trách trực tiếp PN3, PN4, PN5, PN6",
  vunv: "Phụ trách trực tiếp PN7, PN8, PN9, PN10",
  haint: "Phụ trách chung Nhóm TB Đo lường",
  sangpt: "Chuyên môn Nhiệt độ, Độ rung; phụ trách PN1-PN6",
  hoangvm: "Chuyên môn Áp, Mức, Lưu lượng; phụ trách PN7-PN11",
  minhvq: "Phụ trách chung Nhóm TB Hệ thống Điều khiển",
  doint: "Cách ly tín hiệu tại CCR và force tín hiệu test ESD, DCS, MPS",
  kieutv: "Force tín hiệu test van hệ thống PLC BMS cả đợt BDTT",
  thanhdv: "Force tín hiệu test van hệ thống PLC máy nén K06101, K04441",
  minhnc: "Force tín hiệu test van hệ thống PLC máy nén K04421, K04431",
  chienpq: "Phụ trách chung Nhóm Tháo/Lắp TB Điều khiển",
  quyentt: "Phụ trách chung Nhóm Hậu cần & Tổng hợp",
  vinhlpp: "Giám sát, báo cáo và tổng hợp dữ liệu toàn Tổ"
};

const getRoleLabel = (orgRole: OrgRole): string => {
  if (orgRole === "toTruong") return "Tổ trưởng";
  if (orgRole === "nhomTruong") return "Nhóm trưởng";
  if (orgRole === "nhomPho") return "Nhóm phó";
  if (orgRole === "pnt") return "PNT";
  if (orgRole === "placeholder") return "Tài khoản tạm";
  if (orgRole === "supervisor") return "Giám sát báo cáo";
  return "Thành viên";
};

const getOrgTitle = (
  orgRole: OrgRole,
  orgGroup: string,
  subgroup: string
): string => {
  if (orgRole === "toTruong") return `Tổ trưởng - ${orgGroup}`;
  if (orgRole === "nhomTruong" || orgRole === "nhomPho") {
    return `${getRoleLabel(orgRole)} - ${groupLabel(orgGroup)}`;
  }
  if (subgroup) return `${getRoleLabel(orgRole)} - ${subgroupLabel(subgroup)} - ${groupLabel(orgGroup)}`;
  return `${getRoleLabel(orgRole)} - ${groupLabel(orgGroup)}`;
};

const getOrgAssignment = (
  username: string,
  orgRole: OrgRole,
  orgGroup: string,
  subgroup: string
): string => {
  const personalAssignment = personalAssignments[username];
  if (personalAssignment) return personalAssignment;
  if (subgroup) {
    return subgroupAssignments[groupKey(orgGroup, subgroup)] ?? `Phụ trách ${subgroup} - ${groupLabel(orgGroup)}`;
  }
  if (orgRole === "member") return `Thành viên ${groupLabel(orgGroup)}`;
  return `Phụ trách ${groupLabel(orgGroup)}`;
};

const person = (
  fullName: string,
  employeeCode: string,
  email: string,
  role: UserRole,
  orgRole: OrgRole,
  orgGroup: string,
  subgroup = "",
  managedGroups: readonly string[] = [],
  managedSubgroups: readonly string[] = []
): AccountSeed2026 => {
  const username = email.split("@")[0]?.trim().toLowerCase() ?? email;
  return {
    fullName,
    employeeCode,
    email,
    role,
    orgRole,
    orgGroup,
    subgroup,
    orgTitle: getOrgTitle(orgRole, orgGroup, subgroup),
    orgAssignment: getOrgAssignment(username, orgRole, orgGroup, subgroup),
    managedGroups,
    managedSubgroups,
    isPlaceholder: false,
    canLogin: true
  };
};

const placeholder = (
  username: string,
  fullName: string,
  orgGroup: string,
  subgroup: string
): AccountSeed2026 => ({
  fullName,
  employeeCode: username.toUpperCase(),
  email: `${username}@placeholder.local`,
  username,
  role: "worker",
  orgRole: "placeholder",
  orgGroup,
  subgroup,
  orgTitle: getOrgTitle("placeholder", orgGroup, subgroup),
  orgAssignment: getOrgAssignment(username, "placeholder", orgGroup, subgroup),
  managedGroups: [],
  managedSubgroups: [],
  isPlaceholder: true,
  canLogin: false,
  resourceName: fullName.toUpperCase()
});

const nhomPhoGroups = (orgGroup: string): readonly string[] => [orgGroup];
const allGroupNames = [
  ORG_GROUPS.to,
  ORG_GROUPS.chapHanh,
  ORG_GROUPS.doLuong,
  ORG_GROUPS.htDieuKhien,
  ORG_GROUPS.thaoLap,
  ORG_GROUPS.hauCan
] as const;

export const ORG_2026_SEEDS: readonly AccountSeed2026[] = [
  person("Quách Kía", "000101", "kiaq@pvcfc.com.vn", "admin", "toTruong", ORG_GROUPS.to, "", allGroupNames, []),

  person("Lý Ngọc Lĩnh", "000126", "linhln@pvcfc.com.vn", "admin", "nhomTruong", ORG_GROUPS.chapHanh, "", [ORG_GROUPS.chapHanh], []),
  person("Trịnh Thạnh Lợi", "000103", "loitt@pvcfc.com.vn", "admin", "nhomPho", ORG_GROUPS.chapHanh, "", nhomPhoGroups(ORG_GROUPS.chapHanh), []),
  person("Nguyễn Văn Vũ", "000172", "vunv@pvcfc.com.vn", "admin", "nhomPho", ORG_GROUPS.chapHanh, "", nhomPhoGroups(ORG_GROUPS.chapHanh), []),
  person("Hữu Văn Cưng", "001038", "cunghv@pvcfc.com.vn", "admin", "pnt", ORG_GROUPS.chapHanh, "PN1", [], [groupKey(ORG_GROUPS.chapHanh, "PN1")]),
  person("Phạm Minh Nhật", "000246", "nhatpm@pvcfc.com.vn", "worker", "member", ORG_GROUPS.chapHanh, "PN1"),
  person("Lê Đình Sơn", "000465", "sonld@pvcfc.com.vn", "worker", "member", ORG_GROUPS.chapHanh, "PN1"),
  person("Nguyễn Mạnh Trung", "000471", "trungnm@pvcfc.com.vn", "worker", "member", ORG_GROUPS.chapHanh, "PN1"),
  person("Trịnh Tấn Hưng", "000473", "hungtt@pvcfc.com.vn", "admin", "pnt", ORG_GROUPS.chapHanh, "PN2", [], [groupKey(ORG_GROUPS.chapHanh, "PN2")]),
  person("Dương Văn Hằng", "000469", "hangdv@pvcfc.com.vn", "admin", "pnt", ORG_GROUPS.chapHanh, "PN3", [], [groupKey(ORG_GROUPS.chapHanh, "PN3")]),
  person("Nguyễn Ngọc Sơn", "000331", "sonnn@pvcfc.com.vn", "admin", "pnt", ORG_GROUPS.chapHanh, "PN4", [], [groupKey(ORG_GROUPS.chapHanh, "PN4")]),
  person("Trần Trung Hiếu", "000935", "hieutt@pvcfc.com.vn", "admin", "pnt", ORG_GROUPS.chapHanh, "PN5", [], [groupKey(ORG_GROUPS.chapHanh, "PN5")]),
  person("Hồ Đức Trung", "001088", "trunghd@pvcfc.com.vn", "admin", "pnt", ORG_GROUPS.chapHanh, "PN6", [], [groupKey(ORG_GROUPS.chapHanh, "PN6")]),
  person("Nguyễn Văn Bình", "000333", "binhnv1@pvcfc.com.vn", "admin", "pnt", ORG_GROUPS.chapHanh, "PN7", [], [groupKey(ORG_GROUPS.chapHanh, "PN7")]),
  person("Đào Văn Khanh", "000466", "khanhdv1@pvcfc.com.vn", "admin", "pnt", ORG_GROUPS.chapHanh, "PN8", [], [groupKey(ORG_GROUPS.chapHanh, "PN8")]),
  person("Trương Đức Anh", "001422", "anhtd@pvcfc.com.vn", "worker", "member", ORG_GROUPS.chapHanh, "PN8"),
  person("Lê Hữu Duyên", "001270", "duyenlh@pvcfc.com.vn", "admin", "pnt", ORG_GROUPS.chapHanh, "PN9", [], [groupKey(ORG_GROUPS.chapHanh, "PN9")]),
  person("Ngô Thanh Lâm", "001416", "lamnt@pvcfc.com.vn", "admin", "pnt", ORG_GROUPS.chapHanh, "PN10", [], [groupKey(ORG_GROUPS.chapHanh, "PN10")]),

  person("Nguyễn Thanh Hải", "000332", "haint@pvcfc.com.vn", "admin", "nhomTruong", ORG_GROUPS.doLuong, "", [ORG_GROUPS.doLuong], []),
  person("Phan Thanh Sang", "000334", "sangpt@pvcfc.com.vn", "admin", "nhomPho", ORG_GROUPS.doLuong, "", nhomPhoGroups(ORG_GROUPS.doLuong), []),
  person("Võ Minh Hoàng", "001160", "hoangvm@pvcfc.com.vn", "admin", "nhomPho", ORG_GROUPS.doLuong, "", nhomPhoGroups(ORG_GROUPS.doLuong), []),
  person("Dương Quốc Thạnh", "000097", "thanhdq@pvcfc.com.vn", "admin", "pnt", ORG_GROUPS.doLuong, "PN1", [], [groupKey(ORG_GROUPS.doLuong, "PN1")]),
  person("Dương Chí Chiến", "000467", "chiendc@pvcfc.com.vn", "worker", "member", ORG_GROUPS.doLuong, "PN1"),
  person("Đặng Trung Hậu", "000952", "haudt@pvcfc.com.vn", "worker", "member", ORG_GROUPS.doLuong, "PN1"),
  person("Nguyễn Văn Ngà", "001261", "nganv@pvcfc.com.vn", "admin", "pnt", ORG_GROUPS.doLuong, "PN2", [], [groupKey(ORG_GROUPS.doLuong, "PN2")]),
  person("Huỳnh Chí Hiền", "000329", "hienhc@pvcfc.com.vn", "admin", "pnt", ORG_GROUPS.doLuong, "PN3", [], [groupKey(ORG_GROUPS.doLuong, "PN3")]),
  person("Trần Nhựt Quang", "000350", "quangtn@pvcfc.com.vn", "admin", "pnt", ORG_GROUPS.doLuong, "PN4", [], [groupKey(ORG_GROUPS.doLuong, "PN4")]),
  person("Đàm Trung Hiếu", "001068", "hieudt2@pvcfc.com.vn", "worker", "member", ORG_GROUPS.doLuong, "PN4"),
  person("Trần Trương Kiên", "001260", "kientt@pvcfc.com.vn", "admin", "pnt", ORG_GROUPS.doLuong, "PN5", [], [groupKey(ORG_GROUPS.doLuong, "PN5")]),
  person("Lưu Quang Linh", "000881", "linhlq@pvcfc.com.vn", "admin", "pnt", ORG_GROUPS.doLuong, "PN6", [], [groupKey(ORG_GROUPS.doLuong, "PN6")]),
  person("Cù Minh Thành", "000682", "thanhcm@pvcfc.com.vn", "admin", "pnt", ORG_GROUPS.doLuong, "PN7", [], [groupKey(ORG_GROUPS.doLuong, "PN7")]),
  person("Trịnh Phước Tùng", "001382", "tungtp@pvcfc.com.vn", "admin", "pnt", ORG_GROUPS.doLuong, "PN8", [], [groupKey(ORG_GROUPS.doLuong, "PN8")]),
  person("Trần Khánh Hòa", "001303", "hoatk@pvcfc.com.vn", "admin", "pnt", ORG_GROUPS.doLuong, "PN9", [], [groupKey(ORG_GROUPS.doLuong, "PN9")]),
  person("Nguyễn Văn Hiếu", "000472", "hieunv@pvcfc.com.vn", "admin", "pnt", ORG_GROUPS.doLuong, "PN10", [], [groupKey(ORG_GROUPS.doLuong, "PN10")]),
  person("Trần Chí Bằng", "000248", "bangtc@pvcfc.com.vn", "admin", "pnt", ORG_GROUPS.doLuong, "PN11", [], [groupKey(ORG_GROUPS.doLuong, "PN11")]),

  person("Võ Quang Minh", "000125", "minhvq@pvcfc.com.vn", "admin", "nhomTruong", ORG_GROUPS.htDieuKhien, "", [ORG_GROUPS.htDieuKhien], []),
  person("Phan Trung Kiên", "001207", "kienpt@pvcfc.com.vn", "admin", "pnt", ORG_GROUPS.htDieuKhien, "PN1", [], [groupKey(ORG_GROUPS.htDieuKhien, "PN1")]),
  person("Lê Minh Hải", "001373", "hailm@pvcfc.com.vn", "worker", "member", ORG_GROUPS.htDieuKhien, "PN1"),
  person("Nguyễn Văn Đình", "001304", "dinhnv@pvcfc.com.vn", "worker", "member", ORG_GROUPS.htDieuKhien, "PN1"),
  person("Lê Bá Tứ", "000470", "tulb@pvcfc.com.vn", "admin", "pnt", ORG_GROUPS.htDieuKhien, "PN2", [], [groupKey(ORG_GROUPS.htDieuKhien, "PN2")]),
  person("Phạm Văn Tuyên", "000247", "tuyenpv@pvcfc.com.vn", "worker", "member", ORG_GROUPS.htDieuKhien, "PN2"),
  person("Nguyễn Hữu Tiến", "000330", "tiennh@pvcfc.com.vn", "admin", "pnt", ORG_GROUPS.htDieuKhien, "PN3", [], [groupKey(ORG_GROUPS.htDieuKhien, "PN3")]),
  person("Nguyễn Mạnh Quỳnh", "001298", "quynhnm@pvcfc.com.vn", "worker", "member", ORG_GROUPS.htDieuKhien, "PN3"),
  person("Trịnh Văn Kiều", "000128", "kieutv@pvcfc.com.vn", "admin", "pnt", ORG_GROUPS.htDieuKhien, "PN4", [], [groupKey(ORG_GROUPS.htDieuKhien, "PN4")]),
  person("Phạm Thanh Quyền", "001262", "quyenpt@pvcfc.com.vn", "worker", "member", ORG_GROUPS.htDieuKhien, "PN4"),
  person("Đào Văn Thành", "001083", "thanhdv@pvcfc.com.vn", "worker", "member", ORG_GROUPS.htDieuKhien, "PN4"),
  person("Nguyễn Cao Minh", "001124", "minhnc@pvcfc.com.vn", "admin", "pnt", ORG_GROUPS.htDieuKhien, "PN5", [], [groupKey(ORG_GROUPS.htDieuKhien, "PN5")]),
  person("Nguyễn Tấn Đời", "000099", "doint@pvcfc.com.vn", "admin", "pnt", ORG_GROUPS.htDieuKhien, "PN6", [], [groupKey(ORG_GROUPS.htDieuKhien, "PN6")]),

  person("Phạm Quyết Chiến", "000100", "chienpq@pvcfc.com.vn", "admin", "nhomTruong", ORG_GROUPS.thaoLap, "", [ORG_GROUPS.thaoLap], []),
  person("Đinh Văn Triển", "000328", "triendv@pvcfc.com.vn", "admin", "pnt", ORG_GROUPS.thaoLap, "PN1", [], [groupKey(ORG_GROUPS.thaoLap, "PN1")]),
  person("Nguyễn Quốc Toản", "000327", "toannq@pvcfc.com.vn", "admin", "pnt", ORG_GROUPS.thaoLap, "PN2", [], [groupKey(ORG_GROUPS.thaoLap, "PN2")]),

  person("Trần Tuyết Quyên", "000326", "quyentt@pvcfc.com.vn", "admin", "nhomTruong", ORG_GROUPS.hauCan, "", [ORG_GROUPS.hauCan], []),
  person("Nguyễn Hoàng Mai", "000685", "mainh@pvcfc.com.vn", "admin", "pnt", ORG_GROUPS.hauCan, "P.Nhóm 1", [], [groupKey(ORG_GROUPS.hauCan, "P.Nhóm 1")]),
  person("Lâm Phùng Phước Vinh", "001496", "vinhlpp@pvcfc.com.vn", "admin", "supervisor", ORG_GROUPS.hauCan, "P.Nhóm 2", allGroupNames, []),

  placeholder("bsr-chap-hanh-pn1-01", "BSR Chấp hành PN1 01", ORG_GROUPS.chapHanh, "PN1"),
  placeholder("bsr-chap-hanh-pn4-01", "BSR Chấp hành PN4 01", ORG_GROUPS.chapHanh, "PN4"),
  placeholder("dpm-chap-hanh-pn1-01", "ĐPM Chấp hành PN1 01", ORG_GROUPS.chapHanh, "PN1"),
  placeholder("dpm-chap-hanh-pn2-01", "ĐPM Chấp hành PN2 01", ORG_GROUPS.chapHanh, "PN2"),
  placeholder("dpm-chap-hanh-pn3-01", "ĐPM Chấp hành PN3 01", ORG_GROUPS.chapHanh, "PN3"),
  placeholder("dpm-chap-hanh-pn5-01", "ĐPM Chấp hành PN5 01", ORG_GROUPS.chapHanh, "PN5"),
  placeholder("dpm-chap-hanh-pn6-01", "ĐPM Chấp hành PN6 01", ORG_GROUPS.chapHanh, "PN6"),
  placeholder("dpm-chap-hanh-pn7-01", "ĐPM Chấp hành PN7 01", ORG_GROUPS.chapHanh, "PN7"),
  placeholder("dpm-chap-hanh-pn9-01", "ĐPM Chấp hành PN9 01", ORG_GROUPS.chapHanh, "PN9"),
  placeholder("dpm-chap-hanh-pn10-01", "ĐPM Chấp hành PN10 01", ORG_GROUPS.chapHanh, "PN10"),
  placeholder("dpm-do-luong-pn4-01", "ĐPM Đo lường PN4 01", ORG_GROUPS.doLuong, "PN4"),
  placeholder("dpm-do-luong-pn5-01", "ĐPM Đo lường PN5 01", ORG_GROUPS.doLuong, "PN5"),
  placeholder("dpm-do-luong-pn6-01", "ĐPM Đo lường PN6 01", ORG_GROUPS.doLuong, "PN6"),
  placeholder("dpm-do-luong-pn8-01", "ĐPM Đo lường PN8 01", ORG_GROUPS.doLuong, "PN8"),
  placeholder("dpm-do-luong-pn9-01", "ĐPM Đo lường PN9 01", ORG_GROUPS.doLuong, "PN9"),
  placeholder("dpm-do-luong-pn10-01", "ĐPM Đo lường PN10 01", ORG_GROUPS.doLuong, "PN10"),
  placeholder("cnkt-tdh-chap-hanh-pn2-01", "CNKT TĐH Chấp hành PN2 01", ORG_GROUPS.chapHanh, "PN2"),
  placeholder("cnkt-tdh-chap-hanh-pn2-02", "CNKT TĐH Chấp hành PN2 02", ORG_GROUPS.chapHanh, "PN2"),
  placeholder("cnkt-tdh-chap-hanh-pn3-01", "CNKT TĐH Chấp hành PN3 01", ORG_GROUPS.chapHanh, "PN3"),
  placeholder("cnkt-tdh-chap-hanh-pn7-01", "CNKT TĐH Chấp hành PN7 01", ORG_GROUPS.chapHanh, "PN7"),
  placeholder("cnkt-tdh-do-luong-pn2-01", "CNKT TĐH Đo lường PN2 01", ORG_GROUPS.doLuong, "PN2"),
  placeholder("cnkt-tdh-do-luong-pn3-01", "CNKT TĐH Đo lường PN3 01", ORG_GROUPS.doLuong, "PN3"),
  placeholder("cnkt-tdh-do-luong-pn3-02", "CNKT TĐH Đo lường PN3 02", ORG_GROUPS.doLuong, "PN3"),
  placeholder("cnkt-tdh-do-luong-pn4-01", "CNKT TĐH Đo lường PN4 01", ORG_GROUPS.doLuong, "PN4"),
  placeholder("cnkt-tdh-do-luong-pn7-01", "CNKT TĐH Đo lường PN7 01", ORG_GROUPS.doLuong, "PN7"),
  placeholder("cnkt-tdh-do-luong-pn7-02", "CNKT TĐH Đo lường PN7 02", ORG_GROUPS.doLuong, "PN7"),
  placeholder("cnkt-tdh-do-luong-pn11-01", "CNKT TĐH Đo lường PN11 01", ORG_GROUPS.doLuong, "PN11"),
  placeholder("cnkt-tdh-do-luong-pn11-02", "CNKT TĐH Đo lường PN11 02", ORG_GROUPS.doLuong, "PN11"),
  placeholder("cnkt-han-htdk-pn1-01", "CNKT Thợ hàn 3G HTĐK PN1 01", ORG_GROUPS.htDieuKhien, "PN1"),
  placeholder("cnkt-ck-htdk-pn1-01", "CNKT CK tháo lắp HTĐK PN1 01", ORG_GROUPS.htDieuKhien, "PN1"),
  placeholder("cnkt-tdh-htdk-pn4-01", "CNKT TĐH HTĐK PN4 01", ORG_GROUPS.htDieuKhien, "PN4"),
  placeholder("cnkt-ck-thao-lap-pn1-01", "CNKT CK tháo lắp PN1 01", ORG_GROUPS.thaoLap, "PN1"),
  placeholder("cnkt-ck-thao-lap-pn1-02", "CNKT CK tháo lắp PN1 02", ORG_GROUPS.thaoLap, "PN1"),
  placeholder("cnkt-ck-thao-lap-pn2-01", "CNKT CK tháo lắp PN2 01", ORG_GROUPS.thaoLap, "PN2")
];

export const getOrgScopeKey = (orgGroup: string, subgroup: string): string =>
  groupKey(orgGroup, subgroup);
