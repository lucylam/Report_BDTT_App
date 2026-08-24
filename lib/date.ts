const EXCEL_DATE_OFFSET = 25569;
const MS_PER_DAY = 86_400_000;
const DEFAULT_REPORT_WINDOW_DAYS = 14;

export interface ReportDateRangeItem {
  readonly startDate: string;
  readonly finishDate: string;
}

const isIsoDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

const createDateRange = (startDate: string, finishDate: string): readonly string[] => {
  if (!isIsoDate(startDate) || !isIsoDate(finishDate) || finishDate < startDate) {
    return [];
  }
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const finish = new Date(`${finishDate}T00:00:00.000Z`);
  const dates: string[] = [];
  for (const date = new Date(start); date <= finish; date.setUTCDate(date.getUTCDate() + 1)) {
    dates.push(date.toISOString().slice(0, 10));
  }
  return dates;
};

export const getCurrentReportDate = (now: Date = new Date()): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Saigon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
};

export const getRecentReportDates = (
  anchorDate = getCurrentReportDate(),
  dayCount = DEFAULT_REPORT_WINDOW_DAYS
): readonly string[] => {
  const safeDayCount = Math.max(1, Math.floor(dayCount));
  const anchor = new Date(`${anchorDate}T00:00:00.000Z`);
  return Array.from({ length: safeDayCount }, (_, index) => {
    const date = new Date(anchor);
    date.setUTCDate(anchor.getUTCDate() - (safeDayCount - index - 1));
    return date.toISOString().slice(0, 10);
  });
};

/** Ngày vận hành hiện tại tại múi giờ nhà máy. Không còn khóa vào dữ liệu demo. */
export const DEFAULT_REPORT_DATE = getCurrentReportDate();

/** Cửa sổ mặc định cho lịch sử; màn hình có dữ liệu sẽ hợp nhất thêm các ngày thực tế. */
export const REPORT_DATES: readonly string[] = getRecentReportDates();

export const getAvailableReportDates = (
  reportDates: readonly string[],
  anchorDate = DEFAULT_REPORT_DATE
): readonly string[] =>
  [...new Set([...getRecentReportDates(anchorDate), ...reportDates.filter(Boolean)])].sort();

export const getPlanReportDates = (
  items: readonly ReportDateRangeItem[]
): readonly string[] => {
  const validItems = items.filter(
    (item) =>
      isIsoDate(item.startDate) &&
      isIsoDate(item.finishDate) &&
      item.finishDate >= item.startDate
  );
  if (validItems.length === 0) return [];
  const startDate = validItems.reduce(
    (minimum, item) => item.startDate < minimum ? item.startDate : minimum,
    validItems[0].startDate
  );
  const finishDate = validItems.reduce(
    (maximum, item) => item.finishDate > maximum ? item.finishDate : maximum,
    validItems[0].finishDate
  );
  return createDateRange(startDate, finishDate);
};

export const getPlanReportDate = (
  items: readonly ReportDateRangeItem[],
  currentDate = DEFAULT_REPORT_DATE
): string => {
  const reportDates = getPlanReportDates(items);
  if (reportDates.length === 0) return currentDate;
  const firstDate = reportDates[0];
  const lastDate = reportDates[reportDates.length - 1];
  if (currentDate < firstDate) return firstDate;
  if (currentDate > lastDate) return lastDate;
  return currentDate;
};

export const getReportHistoryDates = (
  items: readonly ReportDateRangeItem[],
  actualReportDates: readonly string[],
  currentDate = DEFAULT_REPORT_DATE,
  dayCount = 7
): readonly string[] => {
  const planDates = getPlanReportDates(items);
  if (planDates.length === 0) {
    return getAvailableReportDates(actualReportDates, currentDate).slice(-dayCount);
  }

  const safeDayCount = Math.max(1, Math.floor(dayCount));
  const activeDate = getPlanReportDate(items, currentDate);
  const activeIndex = Math.max(0, planDates.indexOf(activeDate));
  const planWindow = currentDate < planDates[0]
    ? planDates.slice(0, safeDayCount)
    : planDates.slice(Math.max(0, activeIndex - safeDayCount + 1), activeIndex + 1);
  return planWindow;
};

export const getReportYear = (reportDate: string): string =>
  /^\d{4}-\d{2}-\d{2}$/.test(reportDate) ? reportDate.slice(0, 4) : "";

export const excelSerialToDate = (serial: number): string => {
  const timestamp = (serial - EXCEL_DATE_OFFSET) * MS_PER_DAY;
  return new Date(timestamp).toISOString().slice(0, 10);
};

export const dateToExcelSerial = (dateText: string): number => {
  const timestamp = new Date(`${dateText}T00:00:00.000Z`).getTime();
  return Math.round(timestamp / MS_PER_DAY + EXCEL_DATE_OFFSET);
};

export const formatViDate = (dateText: string): string => {
  const date = new Date(`${dateText}T00:00:00+07:00`);
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
};

export const minutesUntilNoon = (now: Date = new Date()): number => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Saigon",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? "0"
  );
  return Math.max(0, 12 * 60 - (hour * 60 + minute));
};
