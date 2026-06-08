"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CancelReasonDialog } from "@/components/worker/CancelReasonDialog";
import { WorkerDesktopView } from "@/components/worker/WorkerDesktopView";
import { WorkerMobileView } from "@/components/worker/WorkerMobileView";
import {
  matchesWorkerTaskQuery,
  sortWorkerTasks
} from "@/components/worker/taskView";
import type {
  SaveState,
  WorkerFilter,
  WorkerProgressUpdate
} from "@/components/worker/types";
import { DEFAULT_REPORT_DATE } from "@/lib/date";
import { getTaskPercent } from "@/lib/progress";
import { useAppData } from "@/hooks/useAppData";
import type { ProgressPercent, Task } from "@/types/domain";

const matchesFilter = (
  task: Task,
  percent: ProgressPercent,
  filter: WorkerFilter
): boolean => {
  if (task.isCancelled) return filter === "cancelled";
  if (filter === "todo") return percent === 0;
  if (filter === "progress") return percent > 0 && percent < 100;
  if (filter === "done") return percent === 100;
  if (filter === "p1") return task.priority === 1 && percent < 100;
  return true;
};

const WorkerPage = (): React.ReactElement => {
  const router = useRouter();
  const {
    cancelTask,
    currentAccount,
    currentProfile,
    data,
    flushQueue,
    logout,
    queueProgress,
    updateProgress
  } = useAppData();
  const [filter, setFilter] = useState<WorkerFilter>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cancelTaskId, setCancelTaskId] = useState<string | null>(null);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  useEffect(() => {
    if (!data) return;
    if (!currentAccount) router.replace("/login");
    if (currentAccount?.mustChangePassword) router.replace("/change-password");
  }, [currentAccount, data, router]);

  useEffect(() => {
    const online = (): void => {
      setIsOnline(true);
      flushQueue();
    };
    const offline = (): void => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, [flushQueue]);

  const worker = currentProfile;
  const allWorkerTasks = useMemo(() => {
    if (!data || !worker) return [];
    return data.tasks.filter((task) => task.assignedTo === worker.id);
  }, [data, worker]);

  const filteredTasks = useMemo(() => {
    if (!data) return [];
    return sortWorkerTasks(
      allWorkerTasks.filter((task) => {
        const percent = getTaskPercent(data.progress, task.id, DEFAULT_REPORT_DATE);
        return (
          matchesFilter(task, percent, filter) &&
          matchesWorkerTaskQuery(task, searchQuery)
        );
      }),
      data.progress,
      DEFAULT_REPORT_DATE
    );
  }, [allWorkerTasks, data, filter, searchQuery]);

  if (!data || !currentAccount || !worker || currentAccount.mustChangePassword) {
    return (
      <main className="min-h-dvh p-4">
        <p className="text-sm text-slate-600">Đang chuyển đến đăng nhập...</p>
      </main>
    );
  }

  const handleChange = (taskId: string, update: WorkerProgressUpdate): void => {
    if (data.tasks.find((task) => task.id === taskId)?.isCancelled) return;
    setSaveStates((current) => ({
      ...current,
      [taskId]: isOnline ? "saving" : "offline"
    }));
    try {
      const payload = {
        taskId,
        userId: worker.id,
        reportDate: DEFAULT_REPORT_DATE,
        percent: update.percent,
        note: update.note,
        photoPath: update.photoPath
      };
      if (isOnline) {
        updateProgress(payload);
        window.setTimeout(() => {
          setSaveStates((current) => ({ ...current, [taskId]: "saved" }));
        }, 180);
      } else {
        queueProgress(payload);
      }
    } catch (error) {
      console.error("[WorkerPage.handleChange]", error);
      setSaveStates((current) => ({ ...current, [taskId]: "error" }));
    }
  };

  const handleCancel = (taskId: string): void => {
    const task = data.tasks.find((item) => item.id === taskId);
    if (!task || task.isCancelled) return;
    setCancelTaskId(taskId);
  };

  const confirmCancel = (cancelReason: string): void => {
    if (!cancelTaskId) return;
    try {
      cancelTask(cancelTaskId, cancelReason);
      setSaveStates((current) => ({ ...current, [cancelTaskId]: "saved" }));
      setCancelTaskId(null);
    } catch (error) {
      console.error("[WorkerPage.confirmCancel]", error);
      setSaveStates((current) => ({ ...current, [cancelTaskId]: "error" }));
    }
  };

  const cancelCandidate =
    data.tasks.find((task) => task.id === cancelTaskId) ?? null;

  return (
    <>
      <WorkerMobileView
        account={currentAccount}
        allTasks={allWorkerTasks}
        filter={filter}
        filteredTasks={filteredTasks}
        isOnline={isOnline}
        onChange={handleChange}
        onCancel={handleCancel}
        onFilterChange={setFilter}
        onLogout={logout}
        onSearchChange={setSearchQuery}
        progress={data.progress}
        saveStates={saveStates}
        searchQuery={searchQuery}
        worker={worker}
      />
      <WorkerDesktopView
        account={currentAccount}
        allTasks={allWorkerTasks}
        filter={filter}
        filteredTasks={filteredTasks}
        isOnline={isOnline}
        onChange={handleChange}
        onCancel={handleCancel}
        onFilterChange={setFilter}
        onLogout={logout}
        onSearchChange={setSearchQuery}
        progress={data.progress}
        saveStates={saveStates}
        searchQuery={searchQuery}
        worker={worker}
      />
      {cancelCandidate ? (
        <CancelReasonDialog
          onClose={() => setCancelTaskId(null)}
          onConfirm={confirmCancel}
          task={cancelCandidate}
        />
      ) : null}
    </>
  );
};

export default WorkerPage;
