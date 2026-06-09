import { ORG_2026_SEEDS } from "@/lib/org2026";
import type { AuthAccount, Profile } from "@/types/domain";

export const DEFAULT_INITIAL_PASSWORD = "123456";

export const getLoginUsername = (value: string): string => {
  const normalizedValue = value.trim().toLowerCase();
  return normalizedValue.split("@")[0] ?? normalizedValue;
};

const getUsername = (email: string): string => getLoginUsername(email);

const toResourceName = (fullName: string): string => fullName.toUpperCase();

export const createSeedAccounts = (): AuthAccount[] => {
  return ORG_2026_SEEDS.map((seed) => {
    const username = seed.username ?? getUsername(seed.email);
    return {
      id: `user-${username}`,
      username,
      email: seed.email.toLowerCase(),
      employeeCode: seed.employeeCode,
      fullName: seed.fullName,
      resourceName: seed.resourceName ?? toResourceName(seed.fullName),
      role: seed.role,
      orgGroup: seed.orgGroup,
      subgroup: seed.subgroup,
      orgRole: seed.orgRole,
      orgTitle: seed.orgTitle,
      orgAssignment: seed.orgAssignment,
      managedGroups: [...seed.managedGroups],
      managedSubgroups: [...seed.managedSubgroups],
      isPlaceholder: seed.isPlaceholder,
      canLogin: seed.canLogin,
      password: DEFAULT_INITIAL_PASSWORD,
      mustChangePassword: seed.canLogin
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
    nhom: account.subgroup
      ? `${account.orgGroup} - ${account.subgroup}`
      : account.orgGroup,
    nhomTruong: account.managedGroups.length > 0 ? account.fullName : "",
    role: account.role,
    orgGroup: account.orgGroup,
    subgroup: account.subgroup,
    orgRole: account.orgRole,
    orgTitle: account.orgTitle,
    orgAssignment: account.orgAssignment,
    managedGroups: [...account.managedGroups],
    managedSubgroups: [...account.managedSubgroups],
    isPlaceholder: account.isPlaceholder,
    canLogin: account.canLogin,
    mustChangePassword: account.mustChangePassword
  }));
};
