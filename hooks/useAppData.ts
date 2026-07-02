"use client";

import { useEffect, useState } from "react";
import { getLoginUsername } from "@/lib/accounts";
import { normalizeStoredAppData } from "@/lib/appDataMigration";
import { createDemoData } from "@/lib/demoData";
import {
  createDailySnapshot,
  createOfficialDemoProgress,
  flushOfflineQueue,
  loadAppData,
  logoutAccount,
  queueProgressUpdate,
  removeOfficialDemoProgress,
  replaceTasks,
  saveAppData,
  setAccountMustChangePassword,
  setAuthenticatedAccount,
  setTaskCancelled,
  upsertProgress
} from "@/lib/storage";
import type { DemoProgressMutationResult } from "@/lib/demoProgress";
import type {
  AppData,
  AuthAccount,
  Profile,
  ProgressPercent,
  ProgressRecord,
  Task
} from "@/types/domain";

interface ProgressUpdate {
  readonly taskId: string;
  readonly userId: string;
  readonly reportDate: string;
  readonly percent: ProgressPercent;
  readonly note: string;
  readonly photoPath?: string;
}

interface UseAppDataResult {
  readonly data: AppData | null;
  readonly currentAccount: AuthAccount | null;
  readonly currentProfile: Profile | null;
  readonly login: (
    username: string,
    password: string,
    rememberLogin: boolean
  ) => Promise<AuthAccount>;
  readonly logout: () => void;
  readonly changePassword: (nextPassword: string) => Promise<void>;
  readonly setImportedTasks: (tasks: readonly Task[]) => void;
  readonly cancelTask: (taskId: string, cancelReason: string) => void;
  readonly updateProgress: (update: ProgressUpdate) => void;
  readonly queueProgress: (update: ProgressUpdate) => void;
  readonly flushQueue: () => void;
  readonly createSnapshot: (reportDate: string) => void;
  readonly createDemoProgress: () => DemoProgressMutationResult;
  readonly clearDemoProgress: () => DemoProgressMutationResult;
  readonly resetDemo: () => void;
}

interface RemoteAppDataResponse {
  readonly ok?: boolean;
  readonly data?: AppData;
  readonly meta?: {
    readonly source?: string;
    readonly taskCount?: number;
    readonly progressCount?: number;
  };
}

interface AuthApiAccount {
  readonly username: string;
  readonly role: AuthAccount["role"];
  readonly mustChangePassword: boolean;
  readonly canLogin: boolean;
}

interface AuthApiResponse {
  readonly ok?: boolean;
  readonly account?: AuthApiAccount;
  readonly error?: string;
}

const DEMO_NOTE_PREFIX = "[DEMO]";

const getProgressKey = (record: ProgressRecord): string =>
  `${record.taskId}|${record.userId}|${record.reportDate}`;

const mergeProgressWithLocalDemo = (
  remoteProgress: readonly ProgressRecord[],
  localProgress: readonly ProgressRecord[]
): ProgressRecord[] => {
  const remoteKeys = new Set(remoteProgress.map(getProgressKey));
  const localDemoProgress = localProgress.filter(
    (record) =>
      record.note.trim().startsWith(DEMO_NOTE_PREFIX) &&
      !remoteKeys.has(getProgressKey(record))
  );
  return [...remoteProgress, ...localDemoProgress];
};

const shouldUseRemoteData = (localData: AppData, remoteData: AppData): boolean => {
  if (remoteData.tasks.length === 0) return false;
  if (remoteData.tasks.length >= localData.tasks.length) return true;
  return localData.tasks.length <= 50;
};

const mergeRemoteAppData = (localData: AppData, remoteData: AppData): AppData => {
  return normalizeStoredAppData({
    ...remoteData,
    accounts: localData.accounts,
    profiles: localData.profiles,
    progress: mergeProgressWithLocalDemo(remoteData.progress, localData.progress),
    dailySnapshots: localData.dailySnapshots,
    offlineQueue: localData.offlineQueue,
    activeUserId: localData.activeUserId
  });
};

const fetchRemoteAppData = async (): Promise<AppData | null> => {
  try {
    const response = await fetch("/api/app-data", { cache: "no-store" });
    if (!response.ok) return null;

    const payload = (await response.json()) as RemoteAppDataResponse;
    return payload.ok && payload.data ? payload.data : null;
  } catch (error) {
    console.warn("[useAppData.fetchRemoteAppData]", error);
    return null;
  }
};

const readAuthError = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as AuthApiResponse;
    return payload.error || "Khong xac thuc duoc tai khoan.";
  } catch {
    return "Khong xac thuc duoc tai khoan.";
  }
};

const postAuthJson = async <TBody,>(
  url: string,
  body: TBody
): Promise<AuthApiResponse> => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(await readAuthError(response));
  }

  return (await response.json()) as AuthApiResponse;
};

const withAccountPasswordState = (
  data: AppData,
  accountId: string,
  mustChangePassword: boolean
): AppData => ({
  ...data,
  accounts: data.accounts.map((account) =>
    account.id === accountId ? { ...account, mustChangePassword } : account
  ),
  profiles: data.profiles.map((profile) =>
    profile.id === accountId ? { ...profile, mustChangePassword } : profile
  )
});

export const useAppData = (): UseAppDataResult => {
  const [data, setData] = useState<AppData | null>(null);
  const currentAccount =
    data?.accounts.find((account) => account.id === data.activeUserId) ?? null;
  const currentProfile =
    data?.profiles.find((profile) => profile.id === data.activeUserId) ?? null;

  useEffect(() => {
    let cancelled = false;
    const timerId = window.setTimeout(() => {
      const localData = loadAppData();
      if (cancelled) return;

      setData(localData);
      void fetchRemoteAppData().then((remoteData) => {
        if (!remoteData || cancelled) return;
        setData((current) => {
          const base = current ?? localData;
          if (!shouldUseRemoteData(base, remoteData)) return base;

          const nextData = mergeRemoteAppData(base, remoteData);
          saveAppData(nextData);
          return nextData;
        });
      });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, []);

  const login = async (
    username: string,
    password: string,
    rememberLogin: boolean
  ): Promise<AuthAccount> => {
    const base = data ?? loadAppData();
    const payload = await postAuthJson("/api/auth/login", {
      username,
      password,
      rememberLogin
    });
    const authAccount = payload.account;
    if (!authAccount) {
      throw new Error("Khong doc duoc thong tin tai khoan sau khi dang nhap.");
    }

    const normalizedUsername = getLoginUsername(authAccount.username);
    const localAccount = base.accounts.find(
      (account) => getLoginUsername(account.username) === normalizedUsername
    );
    if (!localAccount) {
      throw new Error(`Tai khoan ${authAccount.username} chua co trong danh sach noi bo.`);
    }
    if (!localAccount.canLogin || !authAccount.canLogin) {
      throw new Error("Tai khoan tam chua duoc kich hoat.");
    }

    const nextData = setAuthenticatedAccount(
      withAccountPasswordState(base, localAccount.id, authAccount.mustChangePassword),
      localAccount.id,
      rememberLogin
    );
    setData(nextData);
    return (
      nextData.accounts.find((account) => account.id === localAccount.id) ??
      localAccount
    );
  };

  const logout = (): void => {
    void fetch("/api/auth/logout", { method: "POST" }).catch((error) => {
      console.warn("[useAppData.logout]", error);
    });
    setData((current) => logoutAccount(current ?? loadAppData()));
  };

  const changePassword = async (nextPassword: string): Promise<void> => {
    if (!currentAccount) {
      throw new Error("Bạn cần đăng nhập trước khi đổi mật khẩu.");
    }
    await postAuthJson("/api/auth/change-password", { nextPassword });
    const nextData = setAccountMustChangePassword(
      data ?? loadAppData(),
      currentAccount.id,
      false
    );
    setData(nextData);
  };

  const setImportedTasks = (tasks: readonly Task[]): void => {
    setData((current) => {
      const base = current ?? loadAppData();
      return replaceTasks(base, tasks);
    });
  };

  const cancelTask = (taskId: string, cancelReason: string): void => {
    setData((current) => {
      const base = current ?? loadAppData();
      return setTaskCancelled(base, taskId, true, cancelReason);
    });
  };

  const updateProgress = (update: ProgressUpdate): void => {
    setData((current) => {
      const base = current ?? loadAppData();
      return upsertProgress(base, update);
    });
  };

  const queueProgress = (update: ProgressUpdate): void => {
    setData((current) => {
      const base = current ?? loadAppData();
      return queueProgressUpdate(base, update);
    });
  };

  const flushQueue = (): void => {
    setData((current) => flushOfflineQueue(current ?? loadAppData()));
  };

  const createSnapshot = (reportDate: string): void => {
    setData((current) => createDailySnapshot(current ?? loadAppData(), reportDate));
  };

  const createDemoProgress = (): DemoProgressMutationResult => {
    const result = createOfficialDemoProgress(data ?? loadAppData());
    setData(result.data);
    return result;
  };

  const clearDemoProgress = (): DemoProgressMutationResult => {
    const result = removeOfficialDemoProgress(data ?? loadAppData());
    setData(result.data);
    return result;
  };

  const resetDemo = (): void => {
    const nextData = createDemoData();
    saveAppData(nextData);
    setData(nextData);
  };

  return {
    data,
    currentAccount,
    currentProfile,
    login,
    logout,
    changePassword,
    setImportedTasks,
    cancelTask,
    updateProgress,
    queueProgress,
    flushQueue,
    createSnapshot,
    createDemoProgress,
    clearDemoProgress,
    resetDemo
  };
};
