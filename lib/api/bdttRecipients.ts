import type { SupabaseClient } from "@supabase/supabase-js";
import { createSeedAccounts, getLoginUsername } from "@/lib/accounts";
import { loadBdttSnapshot } from "@/lib/api/bdttSnapshot";
import { canManageBdttTasks, canViewProfile, canViewTask } from "@/lib/permissions";

export const getScopedBdttManagerIds = async (
  supabase: SupabaseClient,
  options: {
    readonly taskId?: string | null;
    readonly profileId?: string | null;
    readonly excludeId?: string;
  }
): Promise<string[]> => {
  const snapshot = await loadBdttSnapshot(supabase);
  const task = options.taskId
    ? snapshot.tasks.find((item) => item.id === options.taskId)
    : null;
  const profile = options.profileId
    ? snapshot.profiles.find((item) => item.id === options.profileId)
    : null;
  const accountByUsername = new Map(
    createSeedAccounts().map((account) => [getLoginUsername(account.username), account])
  );

  return snapshot.profiles.flatMap((managerProfile): string[] => {
    const seed = accountByUsername.get(getLoginUsername(managerProfile.username));
    if (!seed) return [];
    const account = { ...seed, id: managerProfile.id };
    if (!canManageBdttTasks(account)) return [];
    const inScope = task
      ? canViewTask(account, task, snapshot.profiles)
      : profile
        ? canViewProfile(account, profile)
        : false;
    return inScope && managerProfile.id !== options.excludeId ? [managerProfile.id] : [];
  });
};
