"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
  if (filter === "cancelled") return task.isCancelled;
  if (task.isCancelled) return false;
  if (filter === "todo") return percent === 0;
  if (filter === "progress") return percent > 0 && percent < 100;
  if (filter === "done") return percent === 100;
  if (filter === "p1") return task.priority === 1 && percent < 100;
  return true;
};

const submitProgressToDatabase = async ({
  task,
  update,
  worker
}: {
  readonly task: Task;
  readonly update: {
    readonly taskId: string;
    readonly userId: string;
    readonly reportDate: string;
    readonly percent: ProgressPercent;
    readonly note: string;
    readonly photoPath?: string;
  };
  readonly worker: {
    readonly username: string;
    readonly fullName: string;
    readonly resourceName: string;
  };
}): Promise<void> => {
  const response = await fetch("/api/progress/submit", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      update,
      task,
      worker
    })
  });

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as
      | { readonly error?: string }
      | null;
    throw new Error(result?.error || "Không ghi được tiến độ vào DB web.");
  }
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
  const isSyncingQueueRef = useRef<boolean>(false);

  useEffect(() => {
    if (!data) return;
    if (!currentAccount) router.replace("/login");
    if (currentAccount?.mustChangePassword) router.replace("/change-password");
  }, [currentAccount, data, router]);

  const syncOfflineQueue = async (): Promise<void> => {
    if (isSyncingQueueRef.current) return;
    const queue = data?.offlineQueue ?? [];
    const profile = currentProfile;
    if (!data || !profile || queue.length === 0) return;

    isSyncingQueueRef.current = true;
    try {
      for (const queued of queue) {
        const task = data.tasks.find((item) => item.id === queued.taskId);
        if (!task) continue;
        await submitProgressToDatabase({
          task,
          update: {
            taskId: queued.taskId,
            userId: queued.userId,
            reportDate: queued.reportDate,
            percent: queued.percent,
            note: queued.note,
            photoPath: queued.photoPath
          },
          worker: {
            username: profile.username,
            fullName: profile.fullName,
            resourceName: profile.resourceName
          }
        });
      }
      flushQueue();
    } catch (error) {
      // Giữ nguyên hàng đợi để thử lại ở lần online tiếp theo
      // (server upsert idempotent nên item đã gửi không bị nhân đôi).
      console.error("[WorkerPage.syncOfflineQueue]", error);
    } finally {
      isSyncingQueueRef.current = false;
    }
  };

  useEffect(() => {
    const online = (): void => {
      setIsOnline(true);
      void syncOfflineQueue();
    };
    const offline = (): void => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  });

  const queueLength = data?.offlineQueue.length ?? 0;
  useEffect(() => {
    if (isOnline && queueLength > 0) {
      void syncOfflineQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, queueLength]);

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

  const handleChange = async (
    taskId: string,
    update: WorkerProgressUpdate
  ): Promise<void> => {
    const task = data.tasks.find((item) => item.id === taskId);
    if (!task || task.isCancelled) return;
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
        await submitProgressToDatabase({
          task,
          update: payload,
          worker: {
            username: worker.username,
            fullName: worker.fullName,
            resourceName: worker.resourceName
          }
        });
        setSaveStates((current) => ({ ...current, [taskId]: "saved" }));
      } else {
        queueProgress(payload);
      }
    } catch (error) {
      console.error("[WorkerPage.handleChange]", error);
      if (error instanceof TypeError) {
        // fetch ném TypeError khi rớt mạng: xếp hàng đợi để tự gửi lại,
        // dữ liệu đã được lưu cục bộ nên không mất.
        queueProgress({
          taskId,
          userId: worker.id,
          reportDate: DEFAULT_REPORT_DATE,
          percent: update.percent,
          note: update.note,
          photoPath: update.photoPath
        });
        setSaveStates((current) => ({ ...current, [taskId]: "offline" }));
      } else {
        setSaveStates((current) => ({ ...current, [taskId]: "error" }));
      }
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
