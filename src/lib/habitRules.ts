/**
 * Reference implementation of DailyOS / Habit Tracker scoring rules.
 * Dates are 'YYYY-MM-DD' strings in user local timezone.
 * state: 0 pending (0 pt), 1 half (0.5 pt), 2 full (1 pt).
 */

const DAY_MS = 86400000;

export const toMs = (d: string): number => Date.parse(`${d}T00:00:00Z`);
export const fromMs = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** Mon=1..Sun=7 */
export const weekdayIdx = (d: string): number => {
  return ((new Date(toMs(d)).getUTCDay() + 6) % 7) + 1;
};

/** Get Monday of the week for given date */
export const weekStart = (d: string): string => {
  return fromMs(toMs(d) - (weekdayIdx(d) - 1) * DAY_MS);
};

/** Habit interface for rule calculations */
export interface HabitRuleItem {
  id?: string;
  name?: string;
  goalDays: number; // 1 to 7
}

/** Points for one day = sum of states/2 over habits (max = number of habits). */
export const dayPoints = (states: number[]): number => {
  return states.reduce((s, x) => s + x / 2, 0);
};

/** Weekly max points: daily habit = 7, weekly-goal habit = goalDays. */
export const weeklyMax = (habits: HabitRuleItem[]): number => {
  return habits.reduce((s, h) => s + h.goalDays, 0);
};

/** Points earned this week for a habit, capped at goalDays. logs: Map<date, state> or Record<date, number>. */
export function weekPoints(
  logs: Map<string, number> | Record<string, number>,
  goalDays: number,
  today: string
): number {
  let p = 0;
  const start = weekStart(today);
  const getState = (d: string) => (logs instanceof Map ? logs.get(d) : logs[d]) || 0;

  for (let d = start; d <= today; d = fromMs(toMs(d) + DAY_MS)) {
    p += getState(d) / 2;
  }
  return Math.min(p, goalDays);
}

/** "Target so far": where you should be by today. Linear: goalDays * (dayIndex / 7). */
export const targetSoFar = (habits: HabitRuleItem[], today: string): number => {
  const idx = weekdayIdx(today);
  return habits.reduce((s, h) => s + (h.goalDays * idx) / 7, 0);
};

/** Days this week that count toward a weekly goal (only FULL days count). */
export function goalDaysDone(
  logs: Map<string, number> | Record<string, number>,
  today: string
): number {
  let n = 0;
  const start = weekStart(today);
  const getState = (d: string) => (logs instanceof Map ? logs.get(d) : logs[d]) || 0;

  for (let d = start; d <= today; d = fromMs(toMs(d) + DAY_MS)) {
    if (getState(d) === 2) n++;
  }
  return n;
}

/**
 * Streak in calendar days. Rest days after a week's goal is met keep the chain alive.
 * Chain breaks when a week ends with fewer than goalDays full days, or the current week can no longer reach it.
 * firstDate = first date the habit was ever logged (days before it never count).
 */
export function streakDays(
  logs: Map<string, number> | Record<string, number>,
  goalDays: number,
  today: string,
  firstDate: string
): number {
  const idx = weekdayIdx(today);
  const done = goalDaysDone(logs, today);
  const getState = (d: string) => (logs instanceof Map ? logs.get(d) : logs[d]) || 0;

  if (done + (7 - idx) < goalDays) {
    return 0; // current week can't be met anymore
  }

  let days = 0;
  const thisStart = weekStart(today);
  const startMs = toMs(firstDate);

  days += Math.min(idx, Math.floor((toMs(today) - Math.max(startMs, toMs(thisStart))) / DAY_MS) + 1);

  for (let ws = toMs(thisStart) - 7 * DAY_MS; ws + 6 * DAY_MS >= startMs; ws -= 7 * DAY_MS) {
    let n = 0;
    for (let k = 0; k < 7; k++) {
      if (getState(fromMs(ws + k * DAY_MS)) === 2) n++;
    }
    if (n < goalDays) break;
    days += 7 - Math.max(0, Math.floor((startMs - ws) / DAY_MS));
  }
  return days;
}

/**
 * Editing permissions check:
 * - Reflections: Only TODAY's reflection is editable. Past entries lock permanently at midnight.
 * - Yesterday Grace: Yesterday's habits, sleep and mood can be changed until midnight tonight.
 * - Older days: view-only.
 * - Future days: locked.
 */
export function isReflectionEditable(date: string, today: string): boolean {
  return date === today;
}

export function isHabitEditable(date: string, today: string): boolean {
  if (date === today) return true;
  const yesterday = fromMs(toMs(today) - DAY_MS);
  return date === yesterday;
}

export function isSleepOrMoodEditable(date: string, today: string): boolean {
  return isHabitEditable(date, today);
}
