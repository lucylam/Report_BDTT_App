"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CancelReasonDialog } from "@/components/worker/CancelReasonDialog";
import { WorkerDesktopView } from "@/components/worker/WorkerDesktopView";
import { WorkerMobileView } from "@/components/worker/WorkerMobileView";
import { AppLoadingState } from "@/components/ui";
import {
  isSameProgressUpdate,
  isSameWorkerProgressUpdate,
  mergeProgressWithDrafts
} from "@/components/worker/progressDrafts";
import {
  matchesWorkerTaskQuery,
  sortWorkerTasks
} from "@/components/worker/taskView";
import type {
  QueueSyncState,
  SaveState,
  WorkerFilter,
  WorkerProgressDraftMap,
  WorkerProgressUpdate
} from "@/components/worker/types";
import { getPlanReportDate } from "@/lib/date";
import { getProgressPhotoPaths, isInlinePhotoPath } from "@/lib/photo";
import {
  createOfflinePhotoReference,
  isOfflinePhotoReference,
  readOfflinePhoto,
  removeOfflinePhotos,
  storeOfflinePhoto
} from "@/lib/offlinePhotoStore";
import { getTaskPercent, getTaskProgress } from "@/lib/progress";
import { useAppData } from "@/hooks/useAppData";
import type { ProgressPercent, Task } from "@/types/domain";

const matchesFilter = (
  task: Task,
  percent: ProgressPercent,
  filter: WorkerFilter,
  reportDate: string
): boolean => {
  if (filter === "all") return true;
  if (filter === "cancelled") return task.isCancelled;
  if (task.isCancelled) return false;
  if (filter === "today") {
    return percent < 100 && (!task.startDate || task.startDate <= reportDate);
  }
  if (filter === "todo") return percent === 0;
  if (filter === "progress") return percent > 0 && percent < 100;
  if (filter === "done") return percent === 100;
  if (filter === "p1") return task.priority === 1 && percent < 100;
  return false;
};

interface WorkerProgressPayload {
  readonly taskId: string;
  readonly userId: string;
  readonly reportDate: string;
  readonly percent: ProgressPercent;
  readonly note: string;
  readonly photoPath?: string;
  readonly photoPaths?: readonly string[];
  readonly trialRunId?: string | null;
}

const readWorkerApiError = async (
  response: Response,
  fallback: string
): Promise<string> => {
  const result = (await response.json().catch(() => null)) as
    | { readonly error?: string }
    | null;
  return result?.error || fallback;
};

const submitProgressToDatabase = async ({
  task,
  update,
  worker
}: {
  readonly task: Task;
  readonly update: WorkerProgressPayload;
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
      trialRunId: update.trialRunId ?? null,
      update,
      task,
      worker
    })
  });

  if (!response.ok) {
    const message = await readWorkerApiError(response, "Khong ghi duoc tien do vao DB web.");
    if (response.status === 408 || response.status === 429 || response.status >= 500) {
      throw new TypeError(message);
    }
    throw new Error(message);
  }
};

const uploadProgressPhotos = async ({
  task,
  reportDate,
  photoPaths,
  trialRunId
}: {
  readonly task: Task;
  readonly reportDate: string;
  readonly photoPaths: readonly string[];
  readonly trialRunId?: string | null;
}): Promise<string[]> => {
  const uploadedPaths: string[] = [];
  for (const source of photoPaths) {
    const dataUrl = isOfflinePhotoReference(source)
      ? await readOfflinePhoto(source)
      : source;
    if (!isInlinePhotoPath(dataUrl)) {
      uploadedPaths.push(dataUrl);
      continue;
    }

    const response = await fetch("/api/photos/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ task, reportDate, dataUrl, trialRunId: trialRunId ?? null })
    });

    if (!response.ok) {
      const message = await readWorkerApiError(response, "Khong upload duoc anh len storage.");
      if (response.status === 408 || response.status === 429 || response.status >= 500) {
        throw new TypeError(message);
      }
      throw new Error(message);
    }
    const result = (await response.json()) as { readonly photoPath?: string };
    if (!result.photoPath) {
      throw new Error("API upload anh khong tra ve storage path.");
    }
    uploadedPaths.push(result.photoPath);
  }
  return uploadedPaths;
};

const submitCancelToDatabase = async ({
  task,
  cancelReason,
  trialRunId
}: {
  readonly task: Task;
  readonly cancelReason: string;
  readonly trialRunId?: string | null;
}): Promise<void> => {
  const response = await fetch("/api/tasks/cancel", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      task,
      cancelReason,
      trialRunId: trialRunId ?? null
    })
  });

  if (!response.ok) {
    const message = await readWorkerApiError(response, "Khong cancel duoc task tren DB web.");
    if (response.status === 408 || response.status === 429 || response.status >= 500) {
      throw new TypeError(message);
    }
    throw new Error(message);
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
    queueCancelTask,
    queueProgress,
    updateProgress
  } = useAppData();
  const reportDate = getPlanReportDate(data?.tasks ?? []);
  const [filter, setFilter] = useState<WorkerFilter>("today");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedUnit, setSelectedUnit] = useState<string>("");
  const [cancelTaskId, setCancelTaskId] = useState<string | null>(null);
  const [draftUpdates, setDraftUpdates] = useState<WorkerProgressDraftMap>({});
  const [isSubmittingUpdates, setIsSubmittingUpdates] = useState<boolean>(false);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [queueSyncState, setQueueSyncState] = useState<QueueSyncState>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const isSyncingQueueRef = useRef<boolean>(false);
  const syncContextRef = useRef({
    cancelTask,
    currentProfile,
    data,
    flushQueue,
    updateProgress
  });
  useEffect(() => {
    syncContextRef.current = {
      cancelTask,
      currentProfile,
      data,
      flushQueue,
      updateProgress
    };
  }, [cancelTask, currentProfile, data, flushQueue, updateProgress]);

  useEffect(() => {
    if (!data) return;
    if (!currentAccount) router.replace("/login");
    if (currentAccount?.mustChangePassword) router.replace("/change-password");
  }, [currentAccount, data, router]);

  const syncOfflineQueue = useCallback(async (): Promise<void> => {
    if (isSyncingQueueRef.current) return;
    const {
      cancelTask: applyCancel,
      currentProfile: profile,
      data: currentData,
      flushQueue: flushSyncedItems,
      updateProgress: applyProgress
    } = syncContextRef.current;
    const queue = currentData?.offlineQueue ?? [];
    if (!currentData || !profile || queue.length === 0 || !navigator.onLine) return;

    isSyncingQueueRef.current = true;
    setQueueSyncState("syncing");
    try {
      const syncedItemIds: string[] = [];
      let failedCount = 0;
      for (const queued of queue) {
        try {
          const task = currentData.tasks.find((item) => item.id === queued.taskId);
          if (!task) continue;
          if ((queued.trialRunId ?? null) !== (currentData.trialRun?.id ?? null)) {
            if (queued.kind === "progress") {
              await removeOfflinePhotos(getProgressPhotoPaths(queued));
            }
            syncedItemIds.push(queued.id);
            continue;
          }

          if (queued.kind === "cancelTask") {
            await submitCancelToDatabase({
              task,
              cancelReason: queued.cancelReason,
              trialRunId: queued.trialRunId ?? null
            });
            applyCancel(queued.taskId, queued.cancelReason);
            syncedItemIds.push(queued.id);
            continue;
          }

          const queuedPhotoPaths = getProgressPhotoPaths(queued);
          const photoPaths = await uploadProgressPhotos({
            task,
            reportDate: queued.reportDate,
            photoPaths: queuedPhotoPaths,
            trialRunId: queued.trialRunId ?? null
          });
          const payload: WorkerProgressPayload = {
            taskId: queued.taskId,
            userId: queued.userId,
            reportDate: queued.reportDate,
            percent: queued.percent,
            note: queued.note,
            photoPath: photoPaths[0],
            photoPaths,
            trialRunId: queued.trialRunId ?? null
          };

          await submitProgressToDatabase({
            task,
            update: payload,
            worker: {
              username: profile.username,
              fullName: profile.fullName,
              resourceName: profile.resourceName
            }
          });
          applyProgress(payload);
          await removeOfflinePhotos(queuedPhotoPaths);
          syncedItemIds.push(queued.id);
        } catch (error) {
          failedCount += 1;
          console.error("[WorkerPage.syncOfflineQueue.item]", error);
        }
      }

      if (syncedItemIds.length > 0) {
        flushSyncedItems(syncedItemIds);
      }
      if (failedCount > 0) {
        setQueueSyncState("failed");
      } else {
        setQueueSyncState("synced");
        setLastSyncedAt(new Date().toISOString());
      }
    } catch (error) {
      setQueueSyncState("failed");
      console.error("[WorkerPage.syncOfflineQueue]", error);
    } finally {
      isSyncingQueueRef.current = false;
    }
  }, []);

  useEffect(() => {
    const online = (): void => {
      setIsOnline(true);
    };
    const offline = (): void => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  const queueLength = data?.offlineQueue.length ?? 0;
  useEffect(() => {
    if (!isOnline || queueLength === 0) return;
    const initialSyncTimer = window.setTimeout(() => {
      void syncOfflineQueue();
    }, 0);
    const retryTimer = window.setInterval(() => {
      if (navigator.onLine) void syncOfflineQueue();
    }, 30_000);
    const handleVisibility = (): void => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void syncOfflineQueue();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearTimeout(initialSyncTimer);
      window.clearInterval(retryTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isOnline, queueLength, syncOfflineQueue]);

  const worker = currentProfile;
  const pendingUpdateCount = Object.keys(draftUpdates).length;
  const displayProgress = useMemo(() => {
    if (!data || !worker) return [];
    return mergeProgressWithDrafts(
      data.progress,
      draftUpdates,
      worker.id,
      reportDate
    );
  }, [data, draftUpdates, reportDate, worker]);

  const allWorkerTasks = useMemo(() => {
    if (!data || !worker) return [];
    return data.tasks.filter(
      (task) => task.assignedTo === worker.id || task.reporterId === worker.id
    );
  }, [data, worker]);

  const filteredTasks = useMemo(() => {
    if (!data) return [];
    return sortWorkerTasks(
      allWorkerTasks.filter((task) => {
        const percent = getTaskPercent(data.progress, task.id, reportDate);
        return (
          matchesFilter(task, percent, filter, reportDate) &&
          (!selectedUnit || task.donVi === selectedUnit) &&
          matchesWorkerTaskQuery(task, searchQuery)
        );
      }),
      data.progress,
      reportDate
    );
  }, [allWorkerTasks, data, filter, reportDate, searchQuery, selectedUnit]);

  if (!data || !currentAccount || !worker || currentAccount.mustChangePassword) {
    return (
      <AppLoadingState
        description="Đang đồng bộ danh sách công việc và tiến độ gần nhất của bạn."
        icon="list"
        title="Đang mở công việc"
      />
    );
  }

  const handleChange = (
    taskId: string,
    update: WorkerProgressUpdate
  ): void => {
    const task = data.tasks.find((item) => item.id === taskId);
    if (!task || task.isCancelled || isSubmittingUpdates) return;

    const committedProgress = getTaskProgress(
      data.progress,
      taskId,
      reportDate
    );
    const matchesCommitted = isSameProgressUpdate(committedProgress, update);

    setDraftUpdates((current) => {
      const next = { ...current };
      if (matchesCommitted) {
        delete next[taskId];
      } else {
        next[taskId] = update;
      }
      return next;
    });
    setSaveStates((current) => ({
      ...current,
      [taskId]: matchesCommitted ? "idle" : "draft"
    }));
  };

  const discardDraftUpdates = (): void => {
    const taskIds = Object.keys(draftUpdates);
    if (taskIds.length === 0 || isSubmittingUpdates) return;

    setDraftUpdates({});
    setSaveStates((current) => {
      const next = { ...current };
      taskIds.forEach((taskId) => {
        next[taskId] = "idle";
      });
      return next;
    });
  };

  const queueOfflineProgress = async (
    taskId: string,
    payload: WorkerProgressPayload
  ): Promise<void> => {
    const sourcePhotoPaths = getProgressPhotoPaths(payload);
    const previousQueuedItem = data.offlineQueue.find(
      (item) =>
        item.kind === "progress" &&
        item.taskId === payload.taskId &&
        item.userId === payload.userId &&
        item.reportDate === payload.reportDate
    );
    const storedPhotoPaths: string[] = [];
    for (const [index, photoPath] of sourcePhotoPaths.entries()) {
      if (!isInlinePhotoPath(photoPath)) {
        storedPhotoPaths.push(photoPath);
        continue;
      }
      const reference = createOfflinePhotoReference(
        `${payload.taskId}-${payload.reportDate}-${index}`
      );
      await storeOfflinePhoto(reference, photoPath);
      storedPhotoPaths.push(reference);
    }
    const offlinePayload: WorkerProgressPayload = {
      ...payload,
      photoPath: storedPhotoPaths[0],
      photoPaths: storedPhotoPaths,
      trialRunId: payload.trialRunId ?? null
    };
    queueProgress(offlinePayload);
    updateProgress(offlinePayload);
    if (previousQueuedItem?.kind === "progress") {
      await removeOfflinePhotos(
        getProgressPhotoPaths(previousQueuedItem).filter(
          (path) => !storedPhotoPaths.includes(path)
        )
      );
    }
    setSaveStates((current) => ({ ...current, [taskId]: "offline" }));
    setQueueSyncState("idle");
  };

  const submitDraftUpdates = async (): Promise<void> => {
    const entries = Object.entries(draftUpdates);
    if (entries.length === 0 || isSubmittingUpdates) return;

    const submittedUpdates = new Map<string, WorkerProgressUpdate>();
    setIsSubmittingUpdates(true);
    setSaveStates((current) => {
      const next = { ...current };
      entries.forEach(([taskId]) => {
        next[taskId] = "saving";
      });
      return next;
    });

    try {
      for (const [taskId, update] of entries) {
        const task = data.tasks.find((item) => item.id === taskId);
        if (!task || task.isCancelled) {
          submittedUpdates.set(taskId, update);
          continue;
        }

        const payload: WorkerProgressPayload = {
          taskId,
          userId: worker.id,
          reportDate,
          percent: update.percent,
          note: update.note,
          photoPath: update.photoPath,
          photoPaths: update.photoPaths,
          trialRunId: data.trialRun?.id ?? null
        };

        let payloadForOfflineRetry = payload;
        try {
          if (isOnline) {
            const uploadedPhotoPaths = await uploadProgressPhotos({
              task,
              reportDate,
              photoPaths: getProgressPhotoPaths(payload),
              trialRunId: payload.trialRunId ?? null
            });
            const persistedPayload: WorkerProgressPayload = {
              ...payload,
              photoPath: uploadedPhotoPaths[0],
              photoPaths: uploadedPhotoPaths
            };
            payloadForOfflineRetry = persistedPayload;
            await submitProgressToDatabase({
              task,
              update: persistedPayload,
              worker: {
                username: worker.username,
                fullName: worker.fullName,
                resourceName: worker.resourceName
              }
            });
            updateProgress(persistedPayload);
            setSaveStates((current) => ({ ...current, [taskId]: "saved" }));
          } else {
            await queueOfflineProgress(taskId, payload);
          }
          submittedUpdates.set(taskId, update);
        } catch (error) {
          console.error("[WorkerPage.submitDraftUpdates]", error);
          if (error instanceof TypeError) {
            try {
              await queueOfflineProgress(taskId, payloadForOfflineRetry);
              submittedUpdates.set(taskId, update);
            } catch (queueError) {
              console.error("[WorkerPage.submitDraftUpdates.queueOffline]", queueError);
              setSaveStates((current) => ({ ...current, [taskId]: "error" }));
            }
          } else {
            setSaveStates((current) => ({ ...current, [taskId]: "error" }));
          }
        }
      }

      if (submittedUpdates.size > 0) {
        setDraftUpdates((current) => {
          const next = { ...current };
          submittedUpdates.forEach((submittedUpdate, taskId) => {
            const currentUpdate = next[taskId];
            if (
              currentUpdate &&
              isSameWorkerProgressUpdate(currentUpdate, submittedUpdate)
            ) {
              delete next[taskId];
            }
          });
          return next;
        });
      }
    } finally {
      setIsSubmittingUpdates(false);
    }
  };

  const handleCancel = (taskId: string): void => {
    const task = data.tasks.find((item) => item.id === taskId);
    if (!task || task.isCancelled) return;
    setCancelTaskId(taskId);
  };

  const confirmCancel = async (cancelReason: string): Promise<void> => {
    if (!cancelTaskId) return;
    const taskId = cancelTaskId;
    const task = data.tasks.find((item) => item.id === taskId);
    if (!task || task.isCancelled) return;

    setSaveStates((current) => ({ ...current, [taskId]: "saving" }));
    try {
      if (isOnline) {
        await submitCancelToDatabase({
          task,
          cancelReason,
          trialRunId: data.trialRun?.id ?? null
        });
        cancelTask(taskId, cancelReason);
        setSaveStates((current) => ({ ...current, [taskId]: "saved" }));
      } else {
        cancelTask(taskId, cancelReason);
        queueCancelTask(taskId, worker.id, cancelReason, data.trialRun?.id ?? null);
        setSaveStates((current) => ({ ...current, [taskId]: "offline" }));
      }
      setCancelTaskId(null);
    } catch (error) {
      console.error("[WorkerPage.confirmCancel]", error);
      if (error instanceof TypeError) {
        cancelTask(taskId, cancelReason);
        queueCancelTask(taskId, worker.id, cancelReason, data.trialRun?.id ?? null);
        setSaveStates((current) => ({ ...current, [taskId]: "offline" }));
        setCancelTaskId(null);
      } else {
        setSaveStates((current) => ({ ...current, [taskId]: "error" }));
      }
    }
  };

  const cancelCandidate =
    data.tasks.find((task) => task.id === cancelTaskId) ?? null;

  return (
    <>
      <WorkerMobileView
        account={currentAccount}
        allTasks={allWorkerTasks}
        displayProgress={displayProgress}
        filter={filter}
        filteredTasks={filteredTasks}
        isOnline={isOnline}
        isSubmittingUpdates={isSubmittingUpdates}
        lastSyncedAt={lastSyncedAt}
        onCancel={handleCancel}
        onChange={handleChange}
        onDiscardUpdates={discardDraftUpdates}
        onFilterChange={setFilter}
        onLogout={logout}
        onSearchChange={setSearchQuery}
        onUnitChange={setSelectedUnit}
        onSubmitUpdates={() => {
          void submitDraftUpdates();
        }}
        pendingUpdateCount={pendingUpdateCount}
        planVersion={data.planVersion}
        queuedUpdateCount={queueLength}
        queueSyncState={queueSyncState}
        progress={data.progress}
        reportDate={reportDate}
        saveStates={saveStates}
        searchQuery={searchQuery}
        selectedUnit={selectedUnit}
      />
      <WorkerDesktopView
        account={currentAccount}
        allTasks={allWorkerTasks}
        displayProgress={displayProgress}
        filter={filter}
        filteredTasks={filteredTasks}
        isOnline={isOnline}
        isSubmittingUpdates={isSubmittingUpdates}
        lastSyncedAt={lastSyncedAt}
        onCancel={handleCancel}
        onChange={handleChange}
        onDiscardUpdates={discardDraftUpdates}
        onFilterChange={setFilter}
        onLogout={logout}
        onSearchChange={setSearchQuery}
        onUnitChange={setSelectedUnit}
        onSubmitUpdates={() => {
          void submitDraftUpdates();
        }}
        pendingUpdateCount={pendingUpdateCount}
        planVersion={data.planVersion}
        queuedUpdateCount={queueLength}
        queueSyncState={queueSyncState}
        progress={data.progress}
        reportDate={reportDate}
        saveStates={saveStates}
        searchQuery={searchQuery}
        selectedUnit={selectedUnit}
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
