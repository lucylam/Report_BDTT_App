export type Theme = "light" | "dark";

export const THEME_COOKIE_NAME = "bdtt-theme";

export const isTheme = (value: string | undefined): value is Theme =>
  value === "light" || value === "dark";
