import type { AbnormalityStatus } from "@/types/domain";

export const canTransitionAbnormality = (
  from: AbnormalityStatus,
  to: AbnormalityStatus
): boolean =>
  from === to ||
  (from === "new" && to === "in_progress") ||
  (from === "in_progress" && to === "resolved") ||
  (from === "resolved" && (to === "closed" || to === "in_progress"));
