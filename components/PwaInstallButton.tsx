"use client";

import { useEffect, useState } from "react";

type PwaInstallState = "idle" | "promptable" | "installed";

interface BeforeInstallPromptEvent extends Event {
  readonly userChoice: Promise<{
    readonly outcome: "accepted" | "dismissed";
    readonly platform: string;
  }>;
  prompt: () => Promise<void>;
}

interface NavigatorWithStandalone extends Navigator {
  readonly standalone?: boolean;
}

interface PwaInstallButtonProps {
  readonly className?: string;
  readonly compact?: boolean;
  readonly showHint?: boolean;
  readonly variant?: "button" | "panel";
}

const isStandaloneDisplay = (): boolean => {
  const navigatorWithStandalone = window.navigator as NavigatorWithStandalone;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean(navigatorWithStandalone.standalone)
  );
};

const isIosDevice = (): boolean =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent);

export const PwaInstallButton = ({
  className = "",
  compact = false,
  showHint = false,
  variant = "button"
}: PwaInstallButtonProps): React.ReactElement | null => {
  const [installState, setInstallState] = useState<PwaInstallState>("idle");
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event): void => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setInstallState("promptable");
    };

    const handleAppInstalled = (): void => {
      setDeferredPrompt(null);
      setInstallState("installed");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    const detectTimer = window.setTimeout(() => {
      if (isStandaloneDisplay()) {
        setInstallState("installed");
      }
      setIsIos(isIosDevice());
    }, 0);

    return () => {
      window.clearTimeout(detectTimer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (installState === "installed") {
    return null;
  }

  const canShowIosHint = showHint && isIos && !deferredPrompt;
  if (!deferredPrompt && !canShowIosHint) {
    return null;
  }

  const installApp = async (): Promise<void> => {
    if (!deferredPrompt) {
      return;
    }

    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } finally {
      setDeferredPrompt(null);
      setInstallState("idle");
    }
  };

  const button = deferredPrompt ? (
    <button
      className={`focus-ring pressable min-h-11 rounded-2xl bg-[var(--foreground)] px-4 text-sm font-bold text-white shadow-sm ${compact ? "w-full" : ""}`}
      onClick={installApp}
      type="button"
    >
      Cài app
    </button>
  ) : null;

  const hint = canShowIosHint ? (
    <p className="text-sm font-semibold leading-6 text-[var(--text-muted)]">
      iPhone/iPad: bấm Chia sẻ, sau đó chọn Thêm vào Màn hình chính.
    </p>
  ) : null;

  if (variant === "panel") {
    return (
      <div
        className={`rounded-3xl border border-[var(--border)] bg-white/70 p-4 shadow-sm ${className}`}
      >
        <p className="text-sm font-bold text-[var(--foreground)]">Dùng như mobile app</p>
        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
          Cài BDTT lên màn hình chính để mở nhanh như ứng dụng nội bộ.
        </p>
        {button ? <div className="mt-3">{button}</div> : null}
        {hint ? <div className="mt-2">{hint}</div> : null}
      </div>
    );
  }

  return (
    <div className={className}>
      {button}
      {hint}
    </div>
  );
};
