"use client";

import { useEffect, useState } from "react";
import { createDemoData } from "@/lib/demoData";
import {
  changeAccountPassword,
  createDailySnapshot,
  createOfficialDemoProgress,
  flushOfflineQueue,
  loadAppData,
  loginAccount,
  logoutAccount,
  queueProgressUpdate,
  removeOfficialDemoProgress,
  replaceTasks,
  saveAppData,
  setTaskCancelled,
  upsertProgress
} from "@/lib/storage";
import type { DemoProgressMutationResult } from "@/lib/demoProgress";
import type { AppData, AuthAccount, Profile, ProgressPercent, Task } from "@/types/domain";

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
  ) => AuthAccount;
  readonly logout: () => void;
  readonly changePassword: (nextPassword: string) => void;
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

export const useAppData = (): UseAppDataResult => {
  const [data, setData] = useState<AppData | null>(null);
  const currentAccount =
    data?.accounts.find((account) => account.id === data.activeUserId) ?? null;
  const currentProfile =
    data?.profiles.find((profile) => profile.id === data.activeUserId) ?? null;

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setData(loadAppData());
    }, 0);
    return () => window.clearTimeout(timerId);
  }, []);

  const login = (
    username: string,
    password: string,
    rememberLogin: boolean
  ): AuthAccount => {
    const base = data ?? loadAppData();
    const result = loginAccount(base, username, password, rememberLogin);
    setData(result.data);
    return result.account;
  };

  const logout = (): void => {
    setData((current) => logoutAccount(current ?? loadAppData()));
  };

  const changePassword = (nextPassword: string): void => {
    if (!currentAccount) {
      throw new Error("Bạn cần đăng nhập trước khi đổi mật khẩu.");
    }
    const nextData = changeAccountPassword(data ?? loadAppData(), currentAccount.id, nextPassword);
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
