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
  const [isMobile, setIsMobile] = useState<boolean>(false);

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
      setIsMobile(window.matchMedia("(max-width: 768px)").matches);
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

  const canShowFallbackHint = showHint && isMobile && !deferredPrompt;
  if (!deferredPrompt && !canShowFallbackHint) {
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

  const buttonClass = compact
    ? "focus-ring pressable min-h-11 w-full rounded-full border border-[var(--border-strong)] bg-white/84 px-4 text-sm font-bold text-slate-800 shadow-sm hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-strong)]"
    : "focus-ring pressable min-h-11 rounded-full bg-[var(--primary-strong)] px-4 text-sm font-bold text-white shadow-sm";

  const button = deferredPrompt ? (
    <button
      className={buttonClass}
      onClick={installApp}
      type="button"
    >
      Cài app
    </button>
  ) : null;

  const hint = canShowFallbackHint ? (
    <p className="text-sm font-semibold leading-6 text-[var(--text-muted)]">
      {isIos
        ? "iPhone/iPad: bấm Chia sẻ, sau đó chọn Thêm vào Màn hình chính."
        : "Android: mở bằng Chrome trên link HTTPS, sau đó chọn Cài app hoặc Thêm vào màn hình chính."}
    </p>
  ) : null;

  if (variant === "panel") {
    return (
      <div
        className={`rounded-[1.75rem] border border-[var(--border)] bg-white/82 p-4 shadow-sm ${className}`}
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
