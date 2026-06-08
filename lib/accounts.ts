import type { AuthAccount, Profile, UserRole } from "@/types/domain";

export const DEFAULT_INITIAL_PASSWORD = "123456";

type AccountSeed = readonly [
  fullName: string,
  employeeCode: string,
  email: string,
  role?: UserRole
];

const resourceSeeds: readonly AccountSeed[] = [
  ["Quách Kía", "000101", "kiaq@pvcfc.com.vn"],
  ["Võ Quang Minh", "000125", "minhvq@pvcfc.com.vn"],
  ["Lý Ngọc Lĩnh", "000126", "linhln@pvcfc.com.vn"],
  ["Nguyễn Thanh Hải", "000332", "haint@pvcfc.com.vn"],
  ["Trịnh Văn Kiều", "000128", "kieutv@pvcfc.com.vn"],
  ["Dương Quốc Thạnh", "000097", "Thanhdq@pvcfc.com.vn"],
  ["Nguyễn Tấn Đời", "000099", "doint@pvcfc.com.vn"],
  ["Phạm Quyết Chiến", "000100", "Chienpq@pvcfc.com.vn"],
  ["Trịnh Thạnh Lợi", "000103", "loitt@pvcfc.com.vn"],
  ["Nguyễn Văn Vũ", "000172", "vunv@pvcfc.com.vn"],
  ["Trần Chí Bằng", "000248", "bangtc@pvcfc.com.vn"],
  ["Phạm Minh Nhật", "000246", "nhatpm@pvcfc.com.vn"],
  ["Hữu Văn Cưng", "001038", "cunghv@pvcfc.com.vn"],
  ["Phạm Văn Tuyên", "000247", "tuyenpv@pvcfc.com.vn"],
  ["Nguyễn Cao Minh", "001124", "minhnc@pvcfc.com.vn"],
  ["Võ Minh Hoàng", "001160", "hoangvm@pvcfc.com.vn"],
  ["Phạm Thanh Quyền", "001262", "quyenpt@pvcfc.com.vn"],
  ["Nguyễn Mạnh Quỳnh", "001298", "quynhnm@pvcfc.com.vn"],
  ["Lê Minh Hải", "001373", "hailm@pvcfc.com.vn"],
  ["Phan Thanh Sang", "000334", "sangpt@pvcfc.com.vn"],
  ["Nguyễn Văn Bình", "000333", "binhnv1@pvcfc.com.vn"],
  ["Trần Tuyết Quyên", "000326", "quyentt@pvcfc.com.vn"],
  ["Nguyễn Ngọc Sơn", "000331", "sonnn@pvcfc.com.vn"],
  ["Trần Nhựt Quang", "000350", "quangtn@pvcfc.com.vn"],
  ["Nguyễn Quốc Toản", "000327", "toannq@pvcfc.com.vn"],
  ["Đinh Văn Triển", "000328", "triendv@pvcfc.com.vn"],
  ["Huỳnh Chí Hiền", "000329", "hienhc@pvcfc.com.vn"],
  ["Nguyễn Hữu Tiến", "000330", "tiennh@pvcfc.com.vn"],
  ["Trịnh Tấn Hưng", "000473", "hungtt@pvcfc.com.vn"],
  ["Cù Minh Thành", "000682", "thanhcm@pvcfc.com.vn"],
  ["Lê Đình Sơn", "000465", "sonld@pvcfc.com.vn"],
  ["Đào Văn Khanh", "000466", "khanhdv1@pvcfc.com.vn"],
  ["Dương Chí Chiến", "000467", "chiendc@pvcfc.com.vn"],
  ["Dương Văn Hằng", "000469", "hangdv@pvcfc.com.vn"],
  ["Lê Bá Tứ", "000470", "tulb@pvcfc.com.vn"],
  ["Nguyễn Văn Hiếu", "000472", "hieunv@pvcfc.com.vn"],
  ["Trần Trung Hiếu", "000935", "hieutt@pvcfc.com.vn"],
  ["Nguyễn Mạnh Trung", "000471", "trungnm@pvcfc.com.vn"],
  ["Nguyễn Hoàng Mai", "000685", "mainh@pvcfc.com.vn"],
  ["Lưu Quang Linh", "000881", "linhlq@pvcfc.com.vn"],
  ["Nguyễn Văn Ngà", "001261", "nganv@pvcfc.com.vn"],
  ["Đặng Trung Hậu", "000952", "haudt@pvcfc.com.vn"],
  ["Đào Văn Thành", "001083", "thanhdv@pvcfc.com.vn"],
  ["Hồ Đức Trung", "001088", "trunghd@pvcfc.com.vn"],
  ["Phan Trung Kiên", "001207", "kienpt@pvcfc.com.vn"],
  ["Đàm Trung Hiếu", "001068", "hieudt2@pvcfc.com.vn"],
  ["Trần Trương Kiên", "001260", "kientt@pvcfc.com.vn"],
  ["Lê Hữu Duyên", "001270", "Duyenlh@pvcfc.com.vn"],
  ["Trần Khánh Hòa", "001303", "hoatk@pvcfc.com.vn"],
  ["Nguyễn Văn Đình", "001304", "dinhnv@pvcfc.com.vn"],
  ["Trịnh Phước Tùng", "001382", "tungtp@pvcfc.com.vn"],
  ["Ngô Thanh Lâm", "001416", "lamnt@pvcfc.com.vn"],
  ["Trương Đức Anh", "001422", "anhtd@pvcfc.com.vn"],
  ["Mai Thái Bảo", "001506", "baomt@pvcfc.com.vn"],
  ["Lâm Phùng Phước Vinh", "001496", "vinhlpp@pvcfc.com.vn"]
];

const adminSeeds: readonly AccountSeed[] = [
  ["Admin BDTT", "ADMIN", "admin@pvcfc.com.vn", "admin"]
];

const adminUsernames = new Set(
  [
    "kiaq",
    "minhvq",
    "linhln",
    "haint",
    "kieutv",
    "thanhdq",
    "doint",
    "chienpq",
    "loitt",
    "quyentt",
    "vinhlpp"
  ].map((username) => username.toLowerCase())
);

export const getLoginUsername = (value: string): string => {
  const normalizedValue = value.trim().toLowerCase();
  return normalizedValue.split("@")[0] ?? normalizedValue;
};

const getUsername = (email: string): string => getLoginUsername(email);

const toResourceName = (fullName: string): string => fullName.toUpperCase();

export const createSeedAccounts = (): AuthAccount[] => {
  return [...resourceSeeds, ...adminSeeds].map(([fullName, employeeCode, email, role]) => {
    const username = getUsername(email);
    const accountRole = adminUsernames.has(username) ? "admin" : (role ?? "worker");
    return {
      id: `user-${username}`,
      username,
      email: email.toLowerCase(),
      employeeCode,
      fullName,
      resourceName: toResourceName(fullName),
      role: accountRole,
      password: DEFAULT_INITIAL_PASSWORD,
      mustChangePassword: true
    };
  });
};

export const createProfilesFromAccounts = (
  accounts: readonly AuthAccount[]
): Profile[] => {
  return accounts.map((account) => ({
    id: account.id,
    email: account.email,
    username: account.username,
    employeeCode: account.employeeCode,
    fullName: account.fullName,
    resourceName: account.resourceName,
    nhom: account.role === "admin" ? "Supervisor" : "Chưa phân nhóm",
    nhomTruong: "",
    role: account.role,
    mustChangePassword: account.mustChangePassword
  }));
};
