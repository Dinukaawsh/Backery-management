/** Sri Lanka business timezone — all daily stock/sales boundaries use this. */
export const BUSINESS_TIMEZONE = "Asia/Colombo";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Parse YYYY-MM-DD as midnight on that calendar day in Sri Lanka. */
export function parseDateInput(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00+05:30`);
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/** Today's calendar date (YYYY-MM-DD) in Sri Lanka. */
export function localDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
  }).format(date);
}

/** Start/end of the business calendar day containing `date` (Sri Lanka). */
export function dayRange(date: Date) {
  const start = parseDateInput(localDateString(date));
  if (!start) {
    throw new Error("Invalid date for day range");
  }
  const end = new Date(start.getTime() + DAY_MS);
  return { start, end };
}

export function todayRange() {
  return dayRange(new Date());
}

export function sevenDaysAgo() {
  const { start } = todayRange();
  return new Date(start.getTime() - 6 * DAY_MS);
}

/** Resolve sale timestamp from API input (date-only or ISO). */
export function parseSaleTimestamp(saleDate: string) {
  const trimmed = saleDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date();
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}
