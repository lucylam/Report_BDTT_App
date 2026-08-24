import {
  ORG_2026_SEEDS,
  deriveOrgMetadata,
  getUserRoleForOrgRole,
  isOrgRole
} from "@/lib/org2026";
import { isDataAdminAccount } from "@/lib/permissions";
import type { AuthAccount, Profile, UserRole } from "@/types/domain";

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

export const applyAccountPasswordRequirements = (
  accounts: readonly AuthAccount[],
  requirements: readonly {
    readonly username: string;
    readonly mustChangePassword: boolean;
  }[]
): AuthAccount[] => {
  const requirementByUsername = new Map(
    requirements.map((item) => [getLoginUsername(item.username), item.mustChangePassword])
  );
  return accounts.map((account) => {
    const mustChangePassword = requirementByUsername.get(
      getLoginUsername(account.username)
    );
    return mustChangePassword === undefined
      ? account
      : { ...account, mustChangePassword };
  });
};

interface AccountProfileOverride {
  readonly username: string | null;
  readonly role?: UserRole | null;
  readonly org_group?: string | null;
  readonly subgroup?: string | null;
  readonly org_role?: string | null;
}

export const applyAccountProfileOverrides = (
  accounts: readonly AuthAccount[],
  overrides: readonly AccountProfileOverride[]
): AuthAccount[] => {
  const overrideByUsername = new Map(
    overrides
      .filter((item): item is AccountProfileOverride & { readonly username: string } =>
        Boolean(item.username)
      )
      .map((item) => [getLoginUsername(item.username), item])
  );

  return accounts.map((account) => {
    const override = overrideByUsername.get(getLoginUsername(account.username));
    if (!override) return account;

    const hasOrgOverride =
      Boolean(override.org_group?.trim()) && isOrgRole(override.org_role);
    if (!hasOrgOverride) {
      return override.role ? { ...account, role: override.role } : account;
    }

    const orgGroup = override.org_group?.trim() ?? account.orgGroup;
    const subgroup = override.subgroup?.trim() ?? "";
    const orgRole = override.org_role;
    const metadata = deriveOrgMetadata(
      account.username,
      orgRole,
      orgGroup,
      subgroup
    );

    return {
      ...account,
      role: isDataAdminAccount(account) ? "admin" : getUserRoleForOrgRole(orgRole),
      orgGroup,
      subgroup,
      orgRole,
      ...metadata
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
