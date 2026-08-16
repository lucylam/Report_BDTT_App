const EXCEL_DATE_OFFSET = 25569;
const MS_PER_DAY = 86_400_000;
const DEFAULT_REPORT_WINDOW_DAYS = 14;

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
