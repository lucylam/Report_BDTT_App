"use client";

import { DEFAULT_INITIAL_PASSWORD, getLoginUsername } from "@/lib/accounts";
import { normalizeStoredAppData } from "@/lib/appDataMigration";
import { createDemoData } from "@/lib/demoData";
import {
  applyOfficialDemoProgress,
  clearOfficialDemoProgress,
  type DemoProgressMutationResult
} from "@/lib/demoProgress";
import type {
  AppData,
  AuthAccount,
  DailySnapshot,
  ProgressPercent,
  ProgressRecord,
  QueuedProgressUpdate,
  Task
} from "@/types/domain";

const STORAGE_KEY = "bdtt-progress-demo-v4";
const REMEMBER_LOGIN_KEY = "bdtt-remember-login";
const SESSION_USER_KEY = "bdtt-session-user-id";

interface ProgressUpdateInput {
  readonly taskId: string;
  readonly userId: string;
  readonly reportDate: string;
  readonly percent: ProgressPercent;
  readonly note: string;
  readonly photoPath?: string;
}

export const loadAppData = (): AppData => {
  if (typeof window === "undefined") {
    return createDemoData();
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY);
  if (!rawValue) {
    const demo = createDemoData();
    saveAppData(demo);
    return demo;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<AppData>;
    if (!parsed.accounts || !parsed.profiles || !parsed.tasks || !parsed.progress) {
      const demo = createDemoData();
      saveAppData(demo);
      return demo;
    }
    const normalizedData = normalizeStoredAppData({
      accounts: parsed.accounts,
      profiles: parsed.profiles,
      tasks: parsed.tasks.map(normalizeTask),
      progress: parsed.progress,
      dailySnapshots: parsed.dailySnapshots ?? [],
      offlineQueue: parsed.offlineQueue ?? [],
      activeUserId: parsed.activeUserId ?? null
    });
    const nextData = {
      ...normalizedData,
      activeUserId: getEffectiveActiveUserId(normalizedData.activeUserId, normalizedData)
    };
    saveAppData(nextData);
    return nextData;
  } catch (error) {
    console.error("[loadAppData]", error);
    const demo = createDemoData();
    saveAppData(demo);
    return demo;
  }
};

export const loadRememberLoginPreference = (): boolean => {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(REMEMBER_LOGIN_KEY) !== "false";
};

const setRememberLoginPreference = (rememberLogin: boolean): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REMEMBER_LOGIN_KEY, rememberLogin ? "true" : "false");
};

const getEffectiveActiveUserId = (
  storedActiveUserId: string | null,
  data: AppData
): string | null => {
  const candidate = loadRememberLoginPreference()
    ? storedActiveUserId
    : window.sessionStorage.getItem(SESSION_USER_KEY);
  if (!candidate) return null;
  return data.accounts.some((account) => account.id === candidate) ? candidate : null;
};

const setSessionUserId = (accountId: string | null): void => {
  if (typeof window === "undefined") return;
  if (accountId) {
    window.sessionStorage.setItem(SESSION_USER_KEY, accountId);
  } else {
    window.sessionStorage.removeItem(SESSION_USER_KEY);
  }
};

const normalizeTask = (task: Task): Task => {
  return {
    ...task,
    cancelReason: task.cancelReason ?? ""
  };
};

export const loginAccount = (
  data: AppData,
  username: string,
  password: string,
  rememberLogin: boolean
): { readonly data: AppData; readonly account: AuthAccount } => {
  const normalizedUsername = getLoginUsername(username);
  const account = data.accounts.find(
    (item) => item.username === normalizedUsername
  );

  if (!account || account.password !== password) {
    throw new Error("Sai tài khoản hoặc mật khẩu.");
  }

  if (!account.canLogin) {
    throw new Error("Tài khoản tạm chưa được kích hoạt.");
  }

  const nextData: AppData = {
    ...data,
    activeUserId: account.id
  };
  setRememberLoginPreference(rememberLogin);
  setSessionUserId(rememberLogin ? null : account.id);
  saveAppData(nextData);
  return { data: nextData, account };
};

export const setAuthenticatedAccount = (
  data: AppData,
  accountId: string,
  rememberLogin: boolean
): AppData => {
  const nextData: AppData = {
    ...data,
    activeUserId: accountId
  };
  setRememberLoginPreference(rememberLogin);
  setSessionUserId(rememberLogin ? null : accountId);
  saveAppData(nextData);
  return nextData;
};

export const logoutAccount = (data: AppData): AppData => {
  const nextData: AppData = {
    ...data,
    activeUserId: null
  };
  setSessionUserId(null);
  saveAppData(nextData);
  return nextData;
};

export const setAccountMustChangePassword = (
  data: AppData,
  accountId: string,
  mustChangePassword: boolean
): AppData => {
  const nextData: AppData = {
    ...data,
    accounts: data.accounts.map((account) =>
      account.id === accountId ? { ...account, mustChangePassword } : account
    ),
    profiles: data.profiles.map((profile) =>
      profile.id === accountId ? { ...profile, mustChangePassword } : profile
    )
  };
  saveAppData(nextData);
  return nextData;
};

export const changeAccountPassword = (
  data: AppData,
  accountId: string,
  nextPassword: string
): AppData => {
  if (nextPassword.length < 6) {
    throw new Error("Mật khẩu mới phải có ít nhất 6 ký tự.");
  }
  if (nextPassword === DEFAULT_INITIAL_PASSWORD) {
    throw new Error("Không được dùng lại mật khẩu mặc định.");
  }
  const currentAccount = data.accounts.find((account) => account.id === accountId);
  if (currentAccount && currentAccount.password === nextPassword) {
    throw new Error("Mật khẩu mới phải khác mật khẩu hiện tại.");
  }

  const nextAccounts = data.accounts.map((account) => {
    if (account.id !== accountId) return account;
    return {
      ...account,
      password: nextPassword,
      mustChangePassword: false
    };
  });
  const nextProfiles = data.profiles.map((profile) => {
    if (profile.id !== accountId) return profile;
    return {
      ...profile,
      mustChangePassword: false
    };
  });
  const nextData: AppData = {
    ...data,
    accounts: nextAccounts,
    profiles: nextProfiles
  };
  saveAppData(nextData);
  return nextData;
};

export const saveAppData = (data: AppData): void => {
  if (typeof window === "undefined") return;
  const persistedData: AppData = {
    ...data,
    activeUserId: loadRememberLoginPreference() ? data.activeUserId : null
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedData));
};

export const replaceTasks = (data: AppData, tasks: readonly Task[]): AppData => {
  const nextData: AppData = {
    ...data,
    tasks: [...tasks],
    progress: [],
    dailySnapshots: [],
    offlineQueue: []
  };
  saveAppData(nextData);
  return nextData;
};

export const setTaskCancelled = (
  data: AppData,
  taskId: string,
  isCancelled: boolean,
  cancelReason: string
): AppData => {
  const nextData: AppData = {
    ...data,
    tasks: data.tasks.map((task) =>
      task.id === taskId ? { ...task, isCancelled, cancelReason } : task
    )
  };
  saveAppData(nextData);
  return nextData;
};

export const upsertProgress = (
  data: AppData,
  update: ProgressUpdateInput
): AppData => {
  const nextRecord: ProgressRecord = {
    ...update,
    submittedAt: new Date().toISOString()
  };
  const progress = data.progress.filter(
    (record) =>
      !(
        record.taskId === update.taskId &&
        record.userId === update.userId &&
        record.reportDate === update.reportDate
      )
  );
  const nextData: AppData = {
    ...data,
    progress: [...progress, nextRecord]
  };
  saveAppData(nextData);
  return nextData;
};

export const queueProgressUpdate = (
  data: AppData,
  update: ProgressUpdateInput
): AppData => {
  const queuedUpdate: QueuedProgressUpdate = {
    ...update,
    id: `${update.taskId}-${update.userId}-${update.reportDate}-${Date.now()}`,
    queuedAt: new Date().toISOString()
  };
  const nextData: AppData = {
    ...data,
    offlineQueue: [...data.offlineQueue, queuedUpdate]
  };
  saveAppData(nextData);
  return nextData;
};

export const flushOfflineQueue = (data: AppData): AppData => {
  let nextData = data;
  data.offlineQueue.forEach((queued) => {
    nextData = upsertProgress(nextData, {
      taskId: queued.taskId,
      userId: queued.userId,
      reportDate: queued.reportDate,
      percent: queued.percent,
      note: queued.note,
      photoPath: queued.photoPath
    });
  });
  nextData = {
    ...nextData,
    offlineQueue: []
  };
  saveAppData(nextData);
  return nextData;
};

const countByKey = (
  tasks: readonly Task[],
  progress: readonly ProgressRecord[],
  reportDate: string,
  key: "nhom" | "donVi"
): Record<string, { readonly done: number; readonly total: number }> => {
  const result: Record<string, { readonly done: number; readonly total: number }> = {};
  tasks.forEach((task) => {
    const name = task[key] || "Chưa phân loại";
    const current = result[name] ?? { done: 0, total: 0 };
    const percent =
      progress.find(
        (record) => record.taskId === task.id && record.reportDate === reportDate
      )?.percent ?? 0;
    result[name] = {
      done: current.done + (percent === 100 ? 1 : 0),
      total: current.total + 1
    };
  });
  return result;
};

export const createDailySnapshot = (
  data: AppData,
  reportDate: string
): AppData => {
  const activeTasks = data.tasks.filter((task) => !task.isCancelled);
  const percents = activeTasks.map((task) => {
    return (
      data.progress.find(
        (record) => record.taskId === task.id && record.reportDate === reportDate
      )?.percent ?? 0
    );
  });
  const totalPercent = percents.reduce<number>((sum, percent) => sum + percent, 0);
  const snapshot: DailySnapshot = {
    snapshotDate: reportDate,
    totalTasks: activeTasks.length,
    completed: percents.filter((percent) => percent === 100).length,
    inProgress: percents.filter((percent) => percent > 0 && percent < 100).length,
    notStarted: percents.filter((percent) => percent === 0).length,
    overallPercent:
      activeTasks.length === 0 ? 0 : Math.round(totalPercent / activeTasks.length),
    byGroup: countByKey(activeTasks, data.progress, reportDate, "nhom"),
    byUnit: countByKey(activeTasks, data.progress, reportDate, "donVi"),
    capturedAt: new Date().toISOString()
  };
  const nextData: AppData = {
    ...data,
    dailySnapshots: [
      ...data.dailySnapshots.filter((item) => item.snapshotDate !== reportDate),
      snapshot
    ]
  };
  saveAppData(nextData);
  return nextData;
};

export const createOfficialDemoProgress = (
  data: AppData
): DemoProgressMutationResult => {
  const result = applyOfficialDemoProgress(data);
  saveAppData(result.data);
  return result;
};

export const removeOfficialDemoProgress = (
  data: AppData
): DemoProgressMutationResult => {
  const result = clearOfficialDemoProgress(data);
  saveAppData(result.data);
  return result;
};
