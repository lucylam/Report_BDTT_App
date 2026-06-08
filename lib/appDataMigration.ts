import { createProfilesFromAccounts, createSeedAccounts } from "@/lib/accounts";
import type { AppData, AuthAccount, Profile } from "@/types/domain";

const byUsername = (accounts: readonly AuthAccount[]): Map<string, AuthAccount> =>
  new Map(accounts.map((account) => [account.username.toLowerCase(), account]));

const byId = (profiles: readonly Profile[]): Map<string, Profile> =>
  new Map(profiles.map((profile) => [profile.id, profile]));

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
        storedAccount.mustChangePassword ?? seedAccount.mustChangePassword
    };
  });

  const seedUsernames = new Set(
    seedAccounts.map((account) => account.username.toLowerCase())
  );
  const customAccounts = storedAccounts.filter(
    (account) => !seedUsernames.has(account.username.toLowerCase())
  );
  return [...mergedSeedAccounts, ...customAccounts];
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
      nhomTruong: storedProfile.nhomTruong || seedProfile.nhomTruong
    };
  });
};

export const normalizeStoredAppData = (data: AppData): AppData => {
  const accounts = mergeAccountsWithSeeds(data.accounts);
  const accountIds = new Set(accounts.map((account) => account.id));
  return {
    ...data,
    accounts,
    profiles: mergeProfilesWithAccounts(data.profiles, accounts),
    activeUserId:
      data.activeUserId && accountIds.has(data.activeUserId)
        ? data.activeUserId
        : null
  };
};
