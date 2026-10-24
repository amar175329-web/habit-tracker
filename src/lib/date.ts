// All date keys are YYYY-MM-DD in Asia/Kolkata
export const APP_TZ = "Asia/Kolkata";

export function toDateKey(d: Date, tz = APP_TZ): string {
  // en-CA gives YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function todayKey(tz = APP_TZ): string {
  return toDateKey(new Date(), tz);
}

export function parseDateKey(key: string): { year: number; month: number; day: number } {
  const [y, m, d] = key.split("-").map(Number);
  return { year: y, month: m, day: d };
}

export function isValidDateKey(key: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(key);
}

export function addDays(key: string, delta: number, tz = APP_TZ): string {
  // construct noon in TZ to avoid DST edge, then shift
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return toDateKey(d, tz);
}

export function formatDisplayDate(key: string, tz = APP_TZ): string {
  const d = new Date(`${key}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function getDateLockStatus(targetDate: string, tz = APP_TZ): {
  isLocked: boolean;
  isFuture: boolean;
  isGrace: boolean;
  label: string;
} {
  const today = todayKey(tz);
  if (targetDate > today) {
    return { isLocked: true, isFuture: true, isGrace: false, label: "Future date locked" };
  }
  if (targetDate === today) {
    return { isLocked: false, isFuture: false, isGrace: false, label: "Live • Today" };
  }
  const yesterday = addDays(today, -1, tz);
  if (targetDate === yesterday) {
    return { isLocked: false, isFuture: false, isGrace: true, label: "✨ 1-Day Grace Edit Active" };
  }
  return { isLocked: true, isFuture: false, isGrace: false, label: "🔒 Past Date Locked (View Only)" };
}

