import { getOrgScopeKey } from "@/lib/org2026";
import type { AppData, AuthAccount, Profile, Task } from "@/types/domain";

export const DATA_ADMIN_USERNAME = "vinhlpp";
export const TOP_MANAGER_USERNAME = "kiaq";

type ScopeAccount = Pick<
  AuthAccount,
  | "id"
  | "username"
  | "role"
  | "orgGroup"
  | "subgroup"
  | "orgRole"
  | "managedGroups"
  | "managedSubgroups"
>;

export const isDataAdminAccount = (
  account: Pick<AuthAccount, "username"> | null
): boolean => {
  return account?.username.trim().toLowerCase() === DATA_ADMIN_USERNAME;
};

export const hasFullOrgScope = (account: ScopeAccount | null): boolean => {
  if (!account) return false;
  const username = account.username.trim().toLowerCase();
  return (
    username === DATA_ADMIN_USERNAME ||
    username === TOP_MANAGER_USERNAME ||
    account.orgRole === "toTruong" ||
    account.orgRole === "supervisor"
  );
};

export const canViewProfile = (
  account: ScopeAccount | null,
  profile: Profile
): boolean => {
  if (!account) return false;
  if (hasFullOrgScope(account)) return true;
  if (account.id === profile.id) return true;
  if (account.role !== "admin") return false;
  if (account.managedGroups.includes(profile.orgGroup)) return true;
  return account.managedSubgroups.includes(
    getOrgScopeKey(profile.orgGroup, profile.subgroup)
  );
};

export const canViewTask = (
  account: ScopeAccount | null,
  task: Task,
  profiles: readonly Profile[]
): boolean => {
  if (!account) return false;
  if (hasFullOrgScope(account)) return true;
  if (!task.assignedTo) return false;
  const assignee = profiles.find((profile) => profile.id === task.assignedTo);
  return assignee ? canViewProfile(account, assignee) : false;
};

export const getScopedAppData = (
  data: AppData,
  account: ScopeAccount
): AppData => {
  if (hasFullOrgScope(account)) return data;

  const profiles = data.profiles.filter((profile) => canViewProfile(account, profile));
  const profileIds = new Set(profiles.map((profile) => profile.id));
  const tasks = data.tasks.filter((task) => canViewTask(account, task, data.profiles));
  const taskIds = new Set(tasks.map((task) => task.id));
  const progress = data.progress.filter(
    (record) => profileIds.has(record.userId) && taskIds.has(record.taskId)
  );

  return {
    ...data,
    profiles,
    tasks,
    progress
  };
};

export const getOrgScopeLabel = (account: ScopeAccount | null): string => {
  if (!account) return "Phạm vi: chưa đăng nhập";
  if (hasFullOrgScope(account)) return "Phạm vi: toàn bộ tổ";
  if (account.managedGroups.length > 0) {
    return `Phạm vi: ${account.managedGroups.join(", ")}`;
  }
  if (account.subgroup) {
    return `Phạm vi: ${account.subgroup} - ${account.orgGroup}`;
  }
  return `Phạm vi: ${account.orgGroup || "cá nhân"}`;
};
