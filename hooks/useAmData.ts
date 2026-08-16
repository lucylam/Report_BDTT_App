"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  AmActivity,
  AmPermissions,
  AmPerson
} from "@/lib/amActivity";

interface AmDataResponse {
  readonly ok?: boolean;
  readonly error?: string;
  readonly actorProfileId?: string;
  readonly permissions?: AmPermissions;
  readonly people?: AmPerson[];
  readonly activities?: AmActivity[];
}

const EMPTY_PERMISSIONS: AmPermissions = {
  role: null,
  canAccess: false,
  canManageTeam: false,
  canAssign: false,
  canAssignOutsideTeam: false,
  canReview: false,
  canViewAll: false
};

const readResponse = async (response: Response): Promise<AmDataResponse> => {
  const payload = (await response.json().catch(() => null)) as AmDataResponse | null;
  if (!response.ok) throw new Error(payload?.error || "Không xử lý được dữ liệu AM.");
  return payload ?? {};
};

export const useAmData = () => {
  const [activities, setActivities] = useState<AmActivity[]>([]);
  const [people, setPeople] = useState<AmPerson[]>([]);
  const [permissions, setPermissions] = useState<AmPermissions>(EMPTY_PERMISSIONS);
  const [actorProfileId, setActorProfileId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async (silent = false): Promise<void> => {
    if (!silent) setLoading(true);
    try {
      const payload = await readResponse(await fetch("/api/am", { cache: "no-store" }));
      setActivities(payload.activities ?? []);
      setPeople(payload.people ?? []);
      setPermissions(payload.permissions ?? EMPTY_PERMISSIONS);
      setActorProfileId(payload.actorProfileId ?? "");
      setError("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Không tải được dữ liệu AM.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialTimerId = window.setTimeout(() => void refresh(), 0);
    const intervalId = window.setInterval(() => void refresh(true), 45_000);
    const handleFocus = (): void => void refresh(true);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearTimeout(initialTimerId);
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refresh]);

  const request = useCallback(
    async (url: string, method: "POST" | "PATCH" | "PUT" | "DELETE", body: unknown) => {
      setBusy(true);
      try {
        await readResponse(
          await fetch(url, {
            method,
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body)
          })
        );
        await refresh(true);
        setError("");
      } catch (nextError) {
        const message = nextError instanceof Error ? nextError.message : "Không xử lý được dữ liệu AM.";
        setError(message);
        throw new Error(message);
      } finally {
        setBusy(false);
      }
    },
    [refresh]
  );

  return {
    activities,
    people,
    permissions,
    actorProfileId,
    loading,
    busy,
    error,
    refresh,
    createTask: (body: {
      readonly requestContent: string;
      readonly locationTag: string;
      readonly scheduledDate: string;
      readonly assigneeIds: readonly string[];
    }) => request("/api/am/tasks", "POST", body),
    updateReport: (taskId: string, performerNote: string) =>
      request(`/api/am/tasks/${taskId}`, "PATCH", { action: "update_report", performerNote }),
    submitReport: (taskId: string) =>
      request(`/api/am/tasks/${taskId}`, "PATCH", { action: "submit" }),
    reviewReport: (
      taskId: string,
      reviewStatus: "approved" | "needsRevision",
      supervisorNote: string
    ) => request(`/api/am/tasks/${taskId}`, "PATCH", { action: "review", reviewStatus, supervisorNote }),
    reassignTask: (taskId: string, assigneeIds: readonly string[]) =>
      request(`/api/am/tasks/${taskId}`, "PATCH", { action: "reassign", assigneeIds }),
    uploadPhoto: (taskId: string, kind: "before" | "after", dataUrl: string) =>
      request("/api/am/photos", "POST", { taskId, kind, dataUrl }),
    removePhoto: (taskId: string, photoId: string) =>
      request("/api/am/photos", "DELETE", { taskId, photoId }),
    updateTeam: (memberIds: readonly string[]) =>
      request("/api/am/team", "PUT", { memberIds })
  };
};
