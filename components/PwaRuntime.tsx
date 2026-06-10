"use client";

import { useEffect } from "react";

export const PwaRuntime = (): null => {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
      return;
    }

    const registerServiceWorker = async (): Promise<void> => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch (error) {
        console.error("[PwaRuntime]", error);
      }
    };

    void registerServiceWorker();
  }, []);

  return null;
};

