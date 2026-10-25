/**
 * Sleep duration calculation.
 * - bedAt and wakeAt are ISO datetime strings (with timezone offset).
 * - Duration is assigned to wake date (Asia/Kolkata).
 * - Correctly handles crossing midnight.
 * - If wake < bed (e.g., only HH:mm supplied), assumes wake is next day.
 */

export function sleepMinutes(bedAt: string | Date, wakeAt: string | Date): number {
  const bed = new Date(bedAt);
  const wake = new Date(wakeAt);
  let diff = wake.getTime() - bed.getTime();
  if (Number.isNaN(diff)) throw new Error("Invalid sleep datetime");
  // If diff negative, wake is next day (handles time-only inputs or wrong date)
  if (diff < 0) diff += 24 * 60 * 60 * 1000;
  // Guard: if diff absurdly large (>20h) or zero, likely same-day error; keep as is but clamp negative after add
  // We already handled negative; >20h is still valid (long sleep) so don't adjust.
  return Math.round(diff / 60000);
}

export function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0h 0m";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

export function sleepDurationLabel(bedAt: string | Date, wakeAt: string | Date): string {
  return formatDuration(sleepMinutes(bedAt, wakeAt));
}

/**
 * Build ISO datetimes from date keys + HH:mm in Asia/Kolkata.
 * Sleep date is the WAKE date.
 * Example: bed 2026-09-01 23:45 + wake 07:15 (next day) => wake date 2026-09-02
 */
export function buildSleepISO(
  wakeDateKey: string, // YYYY-MM-DD (wake date)
  bedTime: string, // HH:mm
  wakeTime: string, // HH:mm
  tzOffset = "+05:30",
): { bedAt: string; wakeAt: string } {
  // bed is previous day if bedTime > wakeTime (e.g., 23:45 > 07:15)

  // Most robust: if bedTime > wakeTime, bed is previous day; else same day (night shift edge handled)
  const finalBedDateKey = bedTime > wakeTime ? addDaysSimple(wakeDateKey, -1) : wakeDateKey;

  const bedAt = `${finalBedDateKey}T${bedTime}:00${tzOffset}`;
  const wakeAt = `${wakeDateKey}T${wakeTime}:00${tzOffset}`;
  return { bedAt, wakeAt };
}

function addDaysSimple(key: string, delta: number): string {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + delta);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// For cases where we have full dates already, compute duration safely
export function safeSleepMinutes(bedISO: string, wakeISO: string): number {
  return sleepMinutes(bedISO, wakeISO);
}

/**
 * Converts 24-hour time or ISO string to standard 12-hour format with AM/PM
 * Example: "23:00" -> "11:00 PM", "07:00" -> "7:00 AM", "00:15" -> "12:15 AM"
 */
export function formatTime12h(timeStr?: string | null): string {
  if (!timeStr) return "";
  let cleanTime = timeStr.trim();
  if (cleanTime.includes("T")) {
    cleanTime = cleanTime.split("T")[1]?.slice(0, 5) || cleanTime;
  }
  const parts = cleanTime.split(":");
  if (parts.length < 2) return timeStr;
  let h = parseInt(parts[0], 10);
  const m = parts[1].slice(0, 2);
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}
