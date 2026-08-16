"use client";

import { useCallback, useEffect, useState } from "react";
import type { AccessiblePortalModule } from "@/lib/portalModules";

interface PortalModulesResponse {
  readonly ok?: boolean;
  readonly modules?: AccessiblePortalModule[];
  readonly error?: string;
}

export const usePortalModules = (enabled = true) => {
  const [modules, setModules] = useState<AccessiblePortalModule[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");

  const refresh = useCallback(async (): Promise<void> => {
    if (!enabled) return;
    try {
      const response = await fetch("/api/modules", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as
        | PortalModulesResponse
        | null;
      if (!response.ok) {
        throw new Error(payload?.error || "Không tải được danh sách công tác.");
      }
      setModules(payload?.modules ?? []);
      setError("");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Không tải được danh sách công tác."
      );
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const timerId = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timerId);
  }, [enabled, refresh]);

  return { modules, loading, error, refresh };
};
