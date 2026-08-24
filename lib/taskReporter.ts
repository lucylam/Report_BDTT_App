import {
  applyAccountProfileOverrides,
  createSeedAccounts,
  getLoginUsername
} from "@/lib/accounts";
import { ORG_GROUPS } from "@/lib/org2026";
import type { OrgRole } from "@/types/domain";

export interface TaskReporterPerson {
  readonly id: string;
  readonly orgGroup: string;
  readonly subgroup: string;
  readonly orgRole: OrgRole;
}

export interface TaskReporterDbProfile {
  readonly id: string;
  readonly username: string | null;
  readonly role?: string | null;
  readonly org_group?: string | null;
  readonly subgroup?: string | null;
  readonly org_role?: string | null;
}

export const createTaskReporterPeople = (
  dbProfiles: readonly TaskReporterDbProfile[]
): TaskReporterPerson[] => {
  const accounts = applyAccountProfileOverrides(
    createSeedAccounts(),
    dbProfiles.map((profile) => ({
      ...profile,
      role:
        profile.role === "admin" || profile.role === "worker"
          ? profile.role
          : null
    }))
  );
  const accountByUsername = new Map(
    accounts.map((account) => [getLoginUsername(account.username), account])
  );

  return dbProfiles.flatMap((dbProfile) => {
    const account = accountByUsername.get(
      getLoginUsername(dbProfile.username ?? "")
    );
    return account
      ? [{
          id: dbProfile.id,
          orgGroup: account.orgGroup,
          subgroup: account.subgroup,
          orgRole: account.orgRole
        }]
      : [];
  });
};

export const resolveTaskReporterId = (
  assigneeId: string | null | undefined,
  people: readonly TaskReporterPerson[]
): string | null => {
  if (!assigneeId) return null;
  const assignee = people.find((person) => person.id === assigneeId);
  if (!assignee) return assigneeId;

  if (assignee.orgGroup === ORG_GROUPS.htDieuKhien) {
    return (
      people.find(
        (person) =>
          person.orgGroup === assignee.orgGroup &&
          person.orgRole === "nhomTruong"
      )?.id ?? assigneeId
    );
  }

  if (assignee.subgroup) {
    return (
      people.find(
        (person) =>
          person.orgGroup === assignee.orgGroup &&
          person.subgroup === assignee.subgroup &&
          person.orgRole === "pnt"
      )?.id ?? assigneeId
    );
  }

  if (assignee.orgRole === "member" || assignee.orgRole === "placeholder") {
    return (
      people.find(
        (person) =>
          person.orgGroup === assignee.orgGroup &&
          person.orgRole === "nhomTruong"
      )?.id ?? assigneeId
    );
  }

  return assigneeId;
};
