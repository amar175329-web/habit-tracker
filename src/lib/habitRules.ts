/**
 * Reference implementation of Habit Tracker scoring rules.
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

/** Format points with decimals if fractional (e.g. 0.5, 1.5), or whole integer if integer (e.g. 1, 2) */
export function formatPoints(points: number): string {
  if (points % 1 === 0) return points.toFixed(0);
  return points.toFixed(1).replace(/\.0$/, "");
}

/** Days this week that count toward a weekly goal (state 1 = 0.5, state 2 = 1.0). */
export function goalDaysDone(
  logs: Map<string, number> | Record<string, number>,
  today: string
): number {
  let n = 0;
  const start = weekStart(today);
  const getState = (d: string) => (logs instanceof Map ? logs.get(d) : logs[d]) || 0;

  for (let d = start; d <= today; d = fromMs(toMs(d) + DAY_MS)) {
    const s = getState(d);
    if (s === 2) n += 1;
    else if (s === 1) n += 0.5;
  }
  return n;
}

export const STREAK_BADGES = [3, 7, 14, 30, 60, 100, 150, 200, 300, 365];

/**
 * Calculates consecutive active days ending on today (or yesterday if today is not yet logged).
 * Protects streaks with freeze tokens and ensures completed habits have at least streak >= 1.
 */
export function calculateConsecutiveStreak(
  logs: Map<string, number> | Record<string, number>,
  today: string,
  firstDate: string,
  freezes: string[] = []
): number {
  const getState = (d: string) => {
    const val = (logs instanceof Map ? logs.get(d) : logs[d]) || 0;
    if (val === 0 && freezes.includes(d)) return 2;
    return val;
  };

  const startMs = toMs(firstDate);
  let count = 0;
  let cursor = today;

  // If today is not completed yet (state 0), check if yesterday was active (state >= 1) to keep the active streak alive
  if (getState(today) < 1) {
    const yesterday = fromMs(toMs(today) - DAY_MS);
    if (toMs(yesterday) >= startMs && getState(yesterday) >= 1) {
      cursor = yesterday;
    } else {
      return 0;
    }
  }

  // Both full (2) and half (1) completions count towards active consecutive streaks
  while (toMs(cursor) >= startMs && getState(cursor) >= 1) {
    count++;
    cursor = fromMs(toMs(cursor) - DAY_MS);
  }
  return count;
}

/**
 * Streak in calendar days. Rest days after a week's goal is met keep the chain alive.
 * Chain breaks when a week ends with fewer than goalDays full days, or the current week can no longer reach it.
 * firstDate = first date the habit was ever logged (days before it never count).
 * freezes = array of dates (YYYY-MM-DD) protected by a streak freeze token.
 */
export function streakDays(
  logs: Map<string, number> | Record<string, number>,
  goalDays: number,
  today: string,
  firstDate: string,
  freezes: string[] = []
): number {
  const idx = weekdayIdx(today);
  const getState = (d: string) => {
    const val = (logs instanceof Map ? logs.get(d) : logs[d]) || 0;
    if (val === 0 && freezes.includes(d)) return 2; // Freeze protects the streak
    return val;
  };

  let done = 0;
  const start = weekStart(today);
  for (let d = start; d <= today; d = fromMs(toMs(d) + DAY_MS)) {
    if (getState(d) >= 1) done++;
  }

  let weeklyStreak = 0;
  if (done + (7 - idx) >= goalDays) {
    let days = 0;
    const thisStart = weekStart(today);
    const startMs = toMs(firstDate);

    days += Math.min(idx, Math.floor((toMs(today) - Math.max(startMs, toMs(thisStart))) / DAY_MS) + 1);

    for (let ws = toMs(thisStart) - 7 * DAY_MS; ws + 6 * DAY_MS >= startMs; ws -= 7 * DAY_MS) {
      let n = 0;
      for (let k = 0; k < 7; k++) {
        if (getState(fromMs(ws + k * DAY_MS)) >= 1) n++;
      }
      if (n < goalDays) break;
      days += 7 - Math.max(0, Math.floor((startMs - ws) / DAY_MS));
    }
    weeklyStreak = days;
  }

  const consecutive = calculateConsecutiveStreak(logs, today, firstDate, freezes);
  return Math.max(weeklyStreak, consecutive);
}

/**
 * Best streak = longest streak calculated across historical logs up to today.
 * Uses streakDays: calendar days, rest days keep streak, freezes respected.
 */
export function calculateHabitBestStreak(
  logs: Map<string, number> | Record<string, number>,
  goalDays: number,
  today: string,
  firstDate?: string,
  freezes: string[] = []
): number {
  const current = streakDays(logs, goalDays, today, firstDate || today, freezes);

  // Find the earliest date to evaluate
  let earliestDate = firstDate && firstDate <= today ? firstDate : today;
  if (logs instanceof Map) {
    for (const d of logs.keys()) {
      if (d <= today && (!earliestDate || d < earliestDate)) {
        earliestDate = d;
      }
    }
  } else if (logs && typeof logs === "object") {
    for (const d of Object.keys(logs)) {
      if (d <= today && (!earliestDate || d < earliestDate)) {
        earliestDate = d;
      }
    }
  }

  let maxStreak = current;
  const startMs = toMs(earliestDate);
  const todayMs = toMs(today);

  for (let ms = startMs; ms <= todayMs; ms += DAY_MS) {
    const d = fromMs(ms);
    const s = streakDays(logs, goalDays, d, earliestDate, freezes);
    if (s > maxStreak) {
      maxStreak = s;
    }
  }

  return maxStreak;
}

/**
 * Calculate overall streak: consecutive calendar days with at least one point earned,
 * or protected by a streak freeze token.
 */
export function calculateOverallStreak(
  activeDatesWithPoints: Set<string> | string[],
  today: string,
  firstUseDate: string,
  freezes: string[] = []
): { currentStreak: number; longestStreak: number; last7Days: { date: string; dayLabel: string; hasFlame: boolean; isFrozen: boolean }[] } {
  const pointDates = activeDatesWithPoints instanceof Set ? activeDatesWithPoints : new Set(activeDatesWithPoints);
  const freezeSet = new Set(freezes);

  const isDayCovered = (d: string) => pointDates.has(d) || freezeSet.has(d);

  // Current streak counting backwards from today (or yesterday if today has 0 points yet)
  let currentStreak = 0;
  let cursor = today;
  if (!isDayCovered(today)) {
    // Check if yesterday was completed/frozen
    const yesterday = fromMs(toMs(today) - DAY_MS);
    if (isDayCovered(yesterday)) {
      cursor = yesterday;
    }
  }

  while (toMs(cursor) >= toMs(firstUseDate) && isDayCovered(cursor)) {
    currentStreak++;
    cursor = fromMs(toMs(cursor) - DAY_MS);
  }

  // Last 7 days breakdown ending today
  const last7Days: { date: string; dayLabel: string; hasFlame: boolean; isFrozen: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = fromMs(toMs(today) - i * DAY_MS);
    const dayLabel = new Date(toMs(d)).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
    const hasFlame = pointDates.has(d);
    const isFrozen = !hasFlame && freezeSet.has(d);
    last7Days.push({ date: d, dayLabel, hasFlame: hasFlame || isFrozen, isFrozen });
  }

  return {
    currentStreak,
    longestStreak: currentStreak, // will be combined with historical max in DB
    last7Days,
  };
}

/**
 * Editing permissions check:
 * - Reflections: Only TODAY's reflection is editable. Past entries lock permanently at midnight.
 * - Past habits: Current week days are editable if unlocked with an edit pass.
 * - Older weeks: view-only.
 * - Future days: locked.
 */
export function isReflectionEditable(date: string, today: string): boolean {
  return date === today;
}

export function isHabitEditable(date: string, today: string, unlocked?: string[]): boolean {
  if (date > today) return false;
  if (date === today) return true;
  if (weekStart(date) !== weekStart(today)) return false;
  if (unlocked !== undefined) {
    return unlocked.includes(date);
  }
  const yesterday = fromMs(toMs(today) - DAY_MS);
  return date === yesterday;
}

export function isSleepOrMoodEditable(date: string, today: string, unlocked?: string[]): boolean {
  return isHabitEditable(date, today, unlocked);
}

/**
 * Habit lifecycle check for any given date:
 * - A habit is only active starting from its createdAt date (YYYY-MM-DD).
 * - Days prior to createdAt never show the habit and never count as missed.
 * - If archived/deleted at archivedAt:
 *    - On or after archivedAt: shows ONLY if user had completed/logged it on that date (state > 0).
 *    - Prior to archivedAt: active.
 * - If user logged/completed it on that date (hasCompletedLog = true), it always displays.
 */
export function isHabitActiveOnDate(
  habit: { createdAt?: string; archivedAt?: string | null; isActive?: boolean },
  targetDate: string,
  hasCompletedLog: boolean = false
): boolean {
  if (hasCompletedLog) return true;
  const createdDate = habit.createdAt ? habit.createdAt.slice(0, 10) : "";
  if (createdDate && targetDate < createdDate) {
    return false;
  }
  const archivedDate = habit.archivedAt ? habit.archivedAt.slice(0, 10) : null;
  if (archivedDate) {
    if (targetDate >= archivedDate) {
      return false;
    }
    return true;
  }
  return habit.isActive !== false;
}

