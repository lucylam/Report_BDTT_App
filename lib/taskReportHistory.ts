import type { TaskReportHistoryItem } from "@/types/domain";

const DUPLICATE_WINDOW_MS = 120_000;

const isSyntheticHistoryItem = (item: TaskReportHistoryItem): boolean =>
  item.id.startsWith("progress-") || item.id.includes("-previous-");

const hasSameReportContent = (
  left: TaskReportHistoryItem,
  right: TaskReportHistoryItem
): boolean =>
  left.reportDate === right.reportDate &&
  left.percent === right.percent &&
  left.note === right.note &&
  left.actorId === right.actorId &&
  Math.abs(Date.parse(left.createdAt) - Date.parse(right.createdAt)) <
    DUPLICATE_WINDOW_MS;

export const deduplicateTaskReportHistory = (
  items: readonly TaskReportHistoryItem[],
  limit = 200
): TaskReportHistoryItem[] =>
  [...items]
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt))
    .filter((item, index, sortedItems) => {
      if (!isSyntheticHistoryItem(item)) return true;

      const matchingCanonicalItem = sortedItems.find(
        (candidate) =>
          !isSyntheticHistoryItem(candidate) && hasSameReportContent(candidate, item)
      );
      if (matchingCanonicalItem) return false;

      const earlierSyntheticIndex = sortedItems.findIndex(
        (candidate) =>
          isSyntheticHistoryItem(candidate) && hasSameReportContent(candidate, item)
      );
      return earlierSyntheticIndex === index;
    })
    .slice(-limit);
