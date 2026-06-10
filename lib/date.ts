export const REPORT_DATES: readonly string[] = [
  "2025-08-16",
  "2025-08-17",
  "2025-08-18",
  "2025-08-19",
  "2025-08-20",
  "2025-08-21",
  "2025-08-22",
  "2025-08-23",
  "2025-08-24",
  "2025-08-25",
  "2025-08-26",
  "2025-08-27",
  "2025-08-28",
  "2025-08-29"
];

export const DEFAULT_REPORT_DATE = "2025-08-22";

const EXCEL_DATE_OFFSET = 25569;
const MS_PER_DAY = 86_400_000;

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
