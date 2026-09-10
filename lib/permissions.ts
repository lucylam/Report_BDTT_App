import { getOrgScopeKey, ORG_GROUPS } from "@/lib/org2026";
import type { AppData, AuthAccount, Profile, Task } from "@/types/domain";

export const DATA_ADMIN_USERNAME = "vinhlpp";
export const TOP_MANAGER_USERNAME = "kiaq";
export const PERSONNEL_ADMIN_USERNAMES = [
  DATA_ADMIN_USERNAME,
  TOP_MANAGER_USERNAME
] as const;

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

type TaskCollaborationPerson = Pick<
  Profile,
  "id" | "username" | "orgGroup" | "subgroup"
>;

const SHARED_TBCH_PN1_SCOPE = getOrgScopeKey(ORG_GROUPS.chapHanh, "PN1");
const ADDITIONAL_TASK_SCOPES_BY_USERNAME: Readonly<Record<string, readonly string[]>> = {
  vinhlpp: [SHARED_TBCH_PN1_SCOPE]
};

const getPrimarySharedTaskScope = (
  person: TaskCollaborationPerson
): string | null => {
  const primaryScope = getOrgScopeKey(person.orgGroup, person.subgroup);
  return primaryScope === SHARED_TBCH_PN1_SCOPE ? primaryScope : null;
};

export const isDataAdminAccount = (
  account: Pick<AuthAccount, "username"> | null
): boolean => {
  return account?.username.trim().toLowerCase() === DATA_ADMIN_USERNAME;
};

export const canManagePersonnelOrg = (
  account: Pick<AuthAccount, "username"> | null
): boolean => {
  const username = account?.username.trim().toLowerCase();
  return Boolean(
    username && PERSONNEL_ADMIN_USERNAMES.some((item) => item === username)
  );
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

export const canManageBdttTasks = (account: ScopeAccount | null): boolean => {
  if (!account || account.role !== "admin") return false;
  return (
    hasFullOrgScope(account) ||
    account.orgRole === "nhomTruong" ||
    account.orgRole === "nhomPho" ||
    account.orgRole === "pnt"
  );
};

export const canGenerateDemoProgress = (account: ScopeAccount | null): boolean => {
  return Boolean(account?.role === "admin" && hasFullOrgScope(account));
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

export const isTaskParticipant = (
  task: Pick<Task, "assignedTo" | "reporterId">,
  profileId: string
): boolean => task.assignedTo === profileId || task.reporterId === profileId;

const getTaskCollaborationScopes = (
  person: TaskCollaborationPerson
): readonly string[] => {
  const scopes = new Set(
    ADDITIONAL_TASK_SCOPES_BY_USERNAME[person.username.trim().toLowerCase()] ?? []
  );
  const primaryScope = getPrimarySharedTaskScope(person);
  if (primaryScope) scopes.add(primaryScope);
  return [...scopes];
};

export const canReportBdttTask = (
  person: TaskCollaborationPerson,
  task: Pick<Task, "assignedTo" | "reporterId">,
  profiles: readonly TaskCollaborationPerson[]
): boolean => {
  if (isTaskParticipant(task, person.id)) return true;
  const collaborationScopes = new Set(getTaskCollaborationScopes(person));
  if (collaborationScopes.size === 0) return false;

  return [task.assignedTo, task.reporterId]
    .filter((profileId): profileId is string => Boolean(profileId))
    .some((profileId) => {
      const responsible = profiles.find((profile) => profile.id === profileId);
      const taskScope = responsible
        ? getPrimarySharedTaskScope(responsible)
        : null;
      return Boolean(taskScope && collaborationScopes.has(taskScope));
    });
};

export const canViewTask = (
  account: ScopeAccount | null,
  task: Task,
  profiles: readonly Profile[]
): boolean => {
  if (!account) return false;
  if (hasFullOrgScope(account)) return true;
  if (canReportBdttTask(account, task, profiles)) return true;
  const responsibleProfileIds = [task.assignedTo, task.reporterId].filter(
    (profileId): profileId is string => Boolean(profileId)
  );
  return responsibleProfileIds.some((profileId) => {
    const profile = profiles.find((item) => item.id === profileId);
    return profile ? canViewProfile(account, profile) : false;
  });
};

export const getScopedAppData = (
  data: AppData,
  account: ScopeAccount
): AppData => {
  if (hasFullOrgScope(account)) return data;

  const tasks = data.tasks.filter((task) => canViewTask(account, task, data.profiles));
  const taskProfileIds = new Set(
    tasks.flatMap((task) => [task.assignedTo, task.reporterId]).filter(Boolean)
  );
  const profiles = data.profiles.filter(
    (profile) => canViewProfile(account, profile) || taskProfileIds.has(profile.id)
  );
  const taskIds = new Set(tasks.map((task) => task.id));
  const progress = data.progress.filter((record) => taskIds.has(record.taskId));

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
