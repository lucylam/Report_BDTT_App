import type { ProgressMode } from "@/types/domain";

export const normalizeProgressMode = (value: unknown): ProgressMode => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return normalized === "0/100" || normalized === "binary" ? "binary" : "continuous";
};

export const toProgressModeCell = (mode: ProgressMode | undefined): "0-100" | "0/100" =>
  mode === "binary" ? "0/100" : "0-100";

export const isPercentAllowedForMode = (
  percent: unknown,
  mode: ProgressMode | undefined
): percent is number => {
  if (typeof percent !== "number" || !Number.isInteger(percent)) return false;
  if (percent < 0 || percent > 100) return false;
  return mode !== "binary" || percent === 0 || percent === 100;
};
