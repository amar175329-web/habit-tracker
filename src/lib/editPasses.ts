// Edit-pass and "missed day" rules. Dates are 'YYYY-MM-DD' in the user's timezone. Week = Monday..Sunday.
export const DAY_MS = 86400000;
export const toMs = (d: string): number => Date.parse(`${d}T00:00:00Z`);
export const fromMs = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
export const weekdayIdx = (d: string): number => ((new Date(toMs(d)).getUTCDay() + 6) % 7) + 1;
export const weekStart = (d: string): string => fromMs(toMs(d) - (weekdayIdx(d) - 1) * DAY_MS);
export const PASSES_PER_WEEK = 3;

/** unlocked = dates in the CURRENT week for which a pass was already used. */
export const passesLeft = (unlocked: string[]): number => Math.max(0, PASSES_PER_WEEK - (unlocked || []).length);

/** Today is always editable. Future days never. Past days only in the current week and only if unlocked. */
export function canEdit(date: string, today: string, unlocked: string[] = []): boolean {
  if (date > today) return false;
  if (date === today) return true;
  if (weekStart(date) !== weekStart(today)) return false;
  return (unlocked || []).includes(date);
}

export interface UnlockResult {
  ok: boolean;
  reason?: "future" | "today-already-editable" | "older-week" | "no-passes";
  unlocked: string[];
}

/** Pressing "Unlock" on a past day uses one pass. Returns the new unlocked list or a reason. */
export function unlock(date: string, today: string, unlocked: string[] = []): UnlockResult {
  if (date >= today) {
    return { ok: false, reason: date > today ? "future" : "today-already-editable", unlocked };
  }
  if (weekStart(date) !== weekStart(today)) {
    return { ok: false, reason: "older-week", unlocked };
  }
  if ((unlocked || []).includes(date)) {
    return { ok: true, unlocked };
  }
  if (passesLeft(unlocked) === 0) {
    return { ok: false, reason: "no-passes", unlocked };
  }
  return { ok: true, unlocked: [...unlocked, date] };
}

export type DayState = "future" | "in-progress" | "open" | "neutral" | "done" | "missed";

/** A past day with no points counts as MISSED, but only from the day the user started using the app. */
export function dayState(date: string, today: string, firstUseDate: string, points: number): DayState {
  if (date > today) return "future";
  if (date === today) return points > 0 ? "in-progress" : "open";
  if (date < firstUseDate) return "neutral";
  return points > 0 ? "done" : "missed";
}
