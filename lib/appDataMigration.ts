import { createProfilesFromAccounts, createSeedAccounts } from "@/lib/accounts";
import type {
  AppData,
  AuthAccount,
  OfflineQueueItem,
  Profile,
  ProgressPercent
} from "@/types/domain";

const byUsername = (accounts: readonly AuthAccount[]): Map<string, AuthAccount> =>
  new Map(accounts.map((account) => [account.username.toLowerCase(), account]));

const byId = (profiles: readonly Profile[]): Map<string, Profile> =>
  new Map(profiles.map((profile) => [profile.id, profile]));

const normalizeCustomAccount = (account: AuthAccount): AuthAccount => {
  const partialAccount = account as Partial<AuthAccount> & AuthAccount;
  return {
    ...account,
    orgGroup: partialAccount.orgGroup || "Chưa phân nhóm",
    subgroup: partialAccount.subgroup ?? "",
    orgRole: partialAccount.orgRole ?? "member",
    orgTitle: partialAccount.orgTitle ?? "Thành viên - Chưa phân nhóm",
    orgAssignment: partialAccount.orgAssignment ?? "Chưa cập nhật nhiệm vụ",
    managedGroups: partialAccount.managedGroups ?? [],
    managedSubgroups: partialAccount.managedSubgroups ?? [],
    isPlaceholder: partialAccount.isPlaceholder ?? false,
    canLogin: partialAccount.canLogin ?? true
  };
};

const mergeAccountsWithSeeds = (
  storedAccounts: readonly AuthAccount[]
): AuthAccount[] => {
  const seedAccounts = createSeedAccounts();
  const storedByUsername = byUsername(storedAccounts);
  const mergedSeedAccounts = seedAccounts.map((seedAccount) => {
    const storedAccount = storedByUsername.get(seedAccount.username.toLowerCase());
    if (!storedAccount) return seedAccount;

    return {
      ...seedAccount,
      password: storedAccount.password || seedAccount.password,
      mustChangePassword:
        storedAccount.mustChangePassword ?? seedAccount.mustChangePassword,
      orgTitle: seedAccount.orgTitle,
      orgAssignment: seedAccount.orgAssignment,
      canLogin: seedAccount.canLogin
    };
  });

  const seedUsernames = new Set(
    seedAccounts.map((account) => account.username.toLowerCase())
  );
  const customAccounts = storedAccounts.filter(
    (account) => !seedUsernames.has(account.username.toLowerCase())
  );
  return [...mergedSeedAccounts, ...customAccounts.map(normalizeCustomAccount)];
};

const mergeProfilesWithAccounts = (
  storedProfiles: readonly Profile[],
  accounts: readonly AuthAccount[]
): Profile[] => {
  const storedById = byId(storedProfiles);
  return createProfilesFromAccounts(accounts).map((seedProfile) => {
    const storedProfile = storedById.get(seedProfile.id);
    if (!storedProfile) return seedProfile;

    return {
      ...seedProfile,
      nhom: storedProfile.nhom || seedProfile.nhom,
      nhomTruong: storedProfile.nhomTruong || seedProfile.nhomTruong,
      orgGroup: seedProfile.orgGroup,
      subgroup: seedProfile.subgroup,
      orgRole: seedProfile.orgRole,
      orgTitle: seedProfile.orgTitle,
      orgAssignment: seedProfile.orgAssignment,
      managedGroups: seedProfile.managedGroups,
      managedSubgroups: seedProfile.managedSubgroups,
      isPlaceholder: seedProfile.isPlaceholder,
      canLogin: seedProfile.canLogin
    };
  });
};

const isProgressPercent = (value: unknown): value is ProgressPercent => {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 100
  );
};

const normalizeText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const normalizePhotoPaths = (value: unknown, legacyValue: unknown): string[] => {
  const paths = Array.isArray(value)
    ? value.map(normalizeText).filter(Boolean)
    : [];
  const legacyPath = normalizeText(legacyValue);
  if (legacyPath && !paths.includes(legacyPath)) paths.unshift(legacyPath);
  return paths.slice(0, 5);
};

export const normalizeOfflineQueue = (
  items: readonly unknown[]
): OfflineQueueItem[] => {
  return items
    .map((item): OfflineQueueItem | null => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as Record<string, unknown>;
      const kind = candidate.kind === "cancelTask" ? "cancelTask" : "progress";
      const taskId = normalizeText(candidate.taskId);
      const userId = normalizeText(candidate.userId);
      const queuedAt = normalizeText(candidate.queuedAt) || new Date(0).toISOString();
      const trialRunId = normalizeText(candidate.trialRunId) || undefined;
      const id =
        normalizeText(candidate.id) ||
        `${kind}-${taskId}-${userId}-${queuedAt}`;

      if (!taskId || !userId) return null;

      if (kind === "cancelTask") {
        const cancelReason = normalizeText(candidate.cancelReason);
        if (!cancelReason) return null;
        return {
          kind,
          id,
          taskId,
          userId,
          cancelReason,
          ...(trialRunId ? { trialRunId } : {}),
          queuedAt
        };
      }

      const reportDate = normalizeText(candidate.reportDate);
      if (!reportDate || !isProgressPercent(candidate.percent)) return null;
      return {
        kind,
        id,
        taskId,
        userId,
        reportDate,
        percent: candidate.percent,
        note: normalizeText(candidate.note),
        photoPath: normalizeText(candidate.photoPath) || undefined,
        photoPaths: normalizePhotoPaths(candidate.photoPaths, candidate.photoPath),
        ...(trialRunId ? { trialRunId } : {}),
        queuedAt
      };
    })
    .filter((item): item is OfflineQueueItem => Boolean(item));
};

export const normalizeStoredAppData = (data: AppData): AppData => {
  const accounts = mergeAccountsWithSeeds(data.accounts);
  const accountIds = new Set(accounts.map((account) => account.id));
  return {
    ...data,
    accounts,
    profiles: mergeProfilesWithAccounts(data.profiles, accounts),
    tasks: data.tasks.map((task) => ({
      ...task,
      reporterId: task.reporterId ?? task.assignedTo,
      taskSource: task.taskSource === "ad_hoc" ? "ad_hoc" : "plan",
      progressMode: task.progressMode === "binary" ? "binary" : "continuous"
    })),
    progress: data.progress.map((record) => {
      const photoPaths = normalizePhotoPaths(record.photoPaths, record.photoPath);
      return {
        ...record,
        photoPath: photoPaths[0],
        photoPaths
      };
    }),
    offlineQueue: normalizeOfflineQueue(data.offlineQueue),
    activeUserId:
      data.activeUserId && accountIds.has(data.activeUserId)
        ? data.activeUserId
        : null
  };
};
