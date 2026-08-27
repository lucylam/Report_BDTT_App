const EXCEL_DATE_OFFSET = 25569;
const MS_PER_DAY = 86_400_000;
const DEFAULT_REPORT_WINDOW_DAYS = 14;
const REPORT_CUTOFF_HOUR = 14;
const REPORT_TIME_ZONE = "Asia/Ho_Chi_Minh";

export interface ReportClock {
  readonly calendarDate: string;
  readonly hour: number;
  readonly minute: number;
}

export interface ReportDateRangeItem {
  readonly startDate: string;
  readonly finishDate: string;
}

const isIsoDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

const getReportTimeParts = (now: Date): Record<string, string> =>
  Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: REPORT_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    })
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

const addReportDays = (dateText: string, days: number): string => {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export const getReportClock = (now: Date = new Date()): ReportClock => {
  const parts = getReportTimeParts(now);
  return {
    calendarDate: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute)
  };
};

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
  return getReportClock(now).calendarDate;
};

export const getOperationalReportDate = (now: Date = new Date()): string => {
  const clock = getReportClock(now);
  return clock.hour >= REPORT_CUTOFF_HOUR
    ? addReportDays(clock.calendarDate, 1)
    : clock.calendarDate;
};

export const resolveReportDateAtSubmission = (
  requestedDate: string,
  now: Date = new Date()
): string => {
  const calendarDate = getCurrentReportDate(now);
  const operationalDate = getOperationalReportDate(now);
  return requestedDate === calendarDate || requestedDate === operationalDate
    ? operationalDate
    : requestedDate;
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
export const DEFAULT_REPORT_DATE = getOperationalReportDate();

/** Cửa sổ mặc định cho lịch sử; màn hình có dữ liệu sẽ hợp nhất thêm các ngày thực tế. */
export const REPORT_DATES: readonly string[] = getRecentReportDates();

export const getAvailableReportDates = (
  reportDates: readonly string[],
  anchorDate = getOperationalReportDate()
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
  currentDate = getOperationalReportDate()
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
  currentDate = getOperationalReportDate(),
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

export const minutesUntilReportCutoff = (now: Date = new Date()): number => {
  const parts = getReportTimeParts(now);
  return Math.max(
    0,
    REPORT_CUTOFF_HOUR * 60 - (Number(parts.hour) * 60 + Number(parts.minute))
  );
};
