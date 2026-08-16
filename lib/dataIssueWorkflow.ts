import type { DataIssueStatus } from "@/types/domain";

export type DataIssueAction = "review" | "resolve" | "reject";

export const getDataIssueStatusForAction = (
  action: DataIssueAction | undefined
): DataIssueStatus | null => {
  if (action === "review") return "reviewing";
  if (action === "resolve") return "resolved";
  if (action === "reject") return "rejected";
  return null;
};

export const canTransitionDataIssue = (
  from: DataIssueStatus,
  to: DataIssueStatus
): boolean =>
  (from === "open" && ["reviewing", "resolved", "rejected"].includes(to)) ||
  (from === "reviewing" && ["resolved", "rejected"].includes(to));
