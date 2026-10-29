/**
 * Streak milestone calculation and celebration helpers for Habbitrack / DailyOS.
 * Persists shown celebrations to prevent duplicate prompts per milestone per habit.
 */

import { calculateHabitBestStreak } from "./habitRules";

export { calculateHabitBestStreak };

export const BADGE_MILESTONES = [3, 7, 14, 30, 60, 100, 150, 200, 365] as const;

export const SHOWN_MILESTONES_STORAGE_KEY = "habbitrack_shown_milestones";
export const LAST_CELEBRATION_DATES_KEY = "habbitrack_last_celebration_dates";

/**
 * Returns the next badge milestone strictly greater than currentStreak.
 * Returns null if currentStreak >= 365 or if no higher milestone exists.
 */
export function getNextAward(currentStreak: number): number | null {
  if (currentStreak >= 365) {
    return null;
  }
  const next = BADGE_MILESTONES.find((m) => m > currentStreak);
  return next ?? null;
}

/**
 * Checks whether a given streak number is a valid celebration milestone:
 * (a) streak === 1 (first time ever)
 * (b) one of the badge milestones [3, 7, 14, 30, 60, 100, 150, 200, 365]
 */
export function isCelebrationMilestone(streak: number): boolean {
  if (streak === 1) return true;
  return (BADGE_MILESTONES as readonly number[]).includes(streak);
}

/**
 * Reads all shown milestones from localStorage safely.
 */
export function getAllShownMilestones(): Record<string, number[]> {
  try {
    if (typeof window === "undefined" || !window.localStorage) return {};
    const raw = window.localStorage.getItem(SHOWN_MILESTONES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Retrieves the list of milestones already shown for a specific habit.
 */
export function getShownMilestones(habitId: string): number[] {
  const all = getAllShownMilestones();
  return Array.isArray(all[habitId]) ? all[habitId] : [];
}

/**
 * Retrieves the last date string when a milestone was celebrated for a habit.
 */
export function getLastCelebrationDate(habitId: string, milestone: number): string | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const raw = window.localStorage.getItem(LAST_CELEBRATION_DATES_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map[`${habitId}_${milestone}`] ?? null;
  } catch {
    return null;
  }
}

/**
 * Records the last date string when a milestone was celebrated for a habit.
 */
export function setLastCelebrationDate(habitId: string, milestone: number, dateStr: string): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    const raw = window.localStorage.getItem(LAST_CELEBRATION_DATES_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[`${habitId}_${milestone}`] = dateStr;
    window.localStorage.setItem(LAST_CELEBRATION_DATES_KEY, JSON.stringify(map));
  } catch {
    // Non-blocking
  }
}

/**
 * Records that a milestone has been shown for a specific habit.
 * Stored in localStorage under `habbitrack_shown_milestones`.
 */
export function recordMilestoneShown(habitId: string, milestone: number, dateStr?: string): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    const all = getAllShownMilestones();
    const currentList = Array.isArray(all[habitId]) ? all[habitId] : [];
    if (!currentList.includes(milestone)) {
      all[habitId] = [...currentList, milestone];
      window.localStorage.setItem(SHOWN_MILESTONES_STORAGE_KEY, JSON.stringify(all));
    }
    if (dateStr) {
      setLastCelebrationDate(habitId, milestone, dateStr);
    }
  } catch {
    // Non-blocking fallback if localStorage is disabled or throws
  }
}

export const saveShownMilestone = recordMilestoneShown;

/**
 * Clears shown milestones for a single habit, or all habits if no habitId is provided.
 */
export function clearShownMilestones(habitId?: string): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    if (habitId) {
      const all = getAllShownMilestones();
      delete all[habitId];
      window.localStorage.setItem(SHOWN_MILESTONES_STORAGE_KEY, JSON.stringify(all));
    } else {
      window.localStorage.removeItem(SHOWN_MILESTONES_STORAGE_KEY);
      window.localStorage.removeItem(LAST_CELEBRATION_DATES_KEY);
    }
  } catch {
    // Non-blocking fallback
  }
}

export interface ShouldCelebrateOptions {
  habitId: string;
  newState: number; // 0 pending, 1 half, 2 full
  isToday: boolean;
  currentStreak: number;
  shownMilestones?: number[];
  todayStr?: string;
}

/**
 * Evaluates whether a streak celebration should be triggered:
 * 1. Only on TODAY (isToday === true).
 * 2. Only on completing the habit (newState === 2).
 * 3. Never triggers on undo (newState 0 or 1).
 * 4. Only when currentStreak === 1 (first time) OR currentStreak in [3, 7, 14, 30, 60, 100, 150, 200, 365].
 * 5. Must NOT have been shown previously for this habit and milestone.
 */
export function shouldCelebrateStreak(options: ShouldCelebrateOptions): {
  shouldCelebrate: boolean;
  milestone: number | null;
} {
  const { habitId, newState, isToday, currentStreak, todayStr } = options;

  // Never trigger if not today, or if not completing (state !== 2), or streak < 1
  if (!isToday || newState !== 2 || currentStreak < 1) {
    return { shouldCelebrate: false, milestone: null };
  }

  const shown = options.shownMilestones ?? getShownMilestones(habitId);

  // Condition (a): streak becomes 1 (day 1 celebration)
  if (currentStreak === 1) {
    // If not in shown list, celebrate!
    if (!shown.includes(1)) {
      return { shouldCelebrate: true, milestone: 1 };
    }
    // If shown in history from a previous streak that broke, but not yet celebrated today
    if (todayStr && !options.shownMilestones) {
      const lastDate = getLastCelebrationDate(habitId, 1);
      if (lastDate !== todayStr) {
        return { shouldCelebrate: true, milestone: 1 };
      }
    }
    return { shouldCelebrate: false, milestone: null };
  }

  // Condition (b): hits a badge milestone from [3, 7, 14, 30, 60, 100, 150, 200, 365]
  if ((BADGE_MILESTONES as readonly number[]).includes(currentStreak)) {
    if (!shown.includes(currentStreak)) {
      return { shouldCelebrate: true, milestone: currentStreak };
    }
    return { shouldCelebrate: false, milestone: null };
  }

  // Non-milestones (e.g. 2, 4, 5, 8, 50, etc.)
  return { shouldCelebrate: false, milestone: null };
}
