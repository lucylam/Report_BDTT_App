import type { AuthAccount } from "@/types/domain";

export const DATA_ADMIN_USERNAME = "vinhlpp";

export const isDataAdminAccount = (
  account: Pick<AuthAccount, "username"> | null
): boolean => {
  return account?.username.trim().toLowerCase() === DATA_ADMIN_USERNAME;
};
