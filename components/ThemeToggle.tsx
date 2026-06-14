"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "@/components/ui";
import { THEME_COOKIE_NAME, type Theme } from "@/lib/theme";
import { cn } from "@/lib/ui";

interface ThemeToggleProps {
  readonly initialTheme?: Theme;
  readonly className?: string;
}

const THEME_CHANGE_EVENT = "bdtt-theme-change";

const applyTheme = (theme: Theme): void => {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem(THEME_COOKIE_NAME, theme);
  document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=31536000; samesite=lax`;
};

const getClientTheme = (): Theme => {
  const savedTheme = window.localStorage.getItem(THEME_COOKIE_NAME);
  if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
};

const subscribeTheme = (onStoreChange: () => void): (() => void) => {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
  };
};

export const ThemeToggle = ({
  initialTheme = "light",
  className
}: ThemeToggleProps): React.ReactElement => {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getClientTheme,
    () => initialTheme
  );

  const nextTheme = theme === "dark" ? "light" : "dark";
  const handleToggle = (): void => {
    applyTheme(nextTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  return (
    <button
      aria-label={
        theme === "dark"
          ? "Chuyển sang giao diện sáng"
          : "Chuyển sang giao diện tối"
      }
      className={cn("focus-ring icon-button", className)}
      onClick={handleToggle}
      title={theme === "dark" ? "Giao diện sáng" : "Giao diện tối"}
      type="button"
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} />
    </button>
  );
};
