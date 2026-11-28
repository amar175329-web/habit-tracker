/**
 * Widget State Synchronizer for Habit Tracker (DailyOS)
 * Powers Android 2x2 and 4x2 Home Screen Widgets:
 * - 2x2: streak number + progress ring, states as in design reference
 * - 4x2: H logo, streak, Today's Top 3 with ticks, "+" button (light, dark, gold)
 * - Updates after every habit toggle and at midnight
 */

import type { Habit, HabitLog } from "./db";

export interface Widget2x2State {
  val2x2: string;
  lbl2x2: string;
  icn2x2: string;
}

export interface Widget4x2State {
  streak: string;
  theme: "light" | "dark" | "gold";
  h1Name: string;
  h1Done: boolean;
  h2Name: string;
  h2Done: boolean;
  h3Name: string;
  h3Done: boolean;
}

export interface WidgetPayload extends Widget2x2State, Widget4x2State {}

/**
 * Pure function: Calculates widget representation from current habits, logs and streak.
 */
export function calculateWidgetPayload(params: {
  habits: Habit[];
  todayLogs: HabitLog[];
  currentStreak: number;
  missedDays?: number;
  theme?: string;
}): WidgetPayload {
  const {
    habits,
    todayLogs,
    currentStreak,
    missedDays = 0,
    theme = "light",
  } = params;

  const activeHabits = habits.filter((h) => h.isActive);
  const totalCount = activeHabits.length;

  // Completed count for today
  let completedCount = 0;
  for (const h of activeHabits) {
    const log = todayLogs.find((l) => l.habitId === h.id);
    if ((log?.state ?? 0) >= 1) completedCount++;
  }

  // 1. Calculate 2x2 State
  let val2x2 = "0";
  let lbl2x2 = "Aaj shuru karo";
  let icn2x2 = "🔥";

  if (missedDays >= 1) {
    val2x2 = "0";
    lbl2x2 = "Wapas aao";
    icn2x2 = "🔥";
  } else if (totalCount > 0 && completedCount === totalCount) {
    if (currentStreak >= 7) {
      val2x2 = String(currentStreak);
      lbl2x2 = `${currentStreak}-day badge!`;
      icn2x2 = "👑";
    } else {
      val2x2 = String(currentStreak || totalCount);
      lbl2x2 = "Aaj ho gaya";
      icn2x2 = "✓";
    }
  } else if (completedCount > 0) {
    val2x2 = `${completedCount}/${totalCount}`;
    lbl2x2 = `${completedCount}/${totalCount} ho gaya`;
    icn2x2 = "🔥";
  } else if (currentStreak >= 3) {
    val2x2 = String(currentStreak);
    lbl2x2 = "Streak bachao";
    icn2x2 = "🔥";
  } else {
    val2x2 = "0";
    lbl2x2 = "Aaj shuru karo";
    icn2x2 = "🔥";
  }

  // 2. Calculate 4x2 State (Top 3 habits)
  const top3 = activeHabits.slice(0, 3);
  const h1 = top3[0];
  const h2 = top3[1];
  const h3 = top3[2];

  const isHabitDone = (hId?: string) => {
    if (!hId) return false;
    const l = todayLogs.find((log) => log.habitId === hId);
    return (l?.state ?? 0) >= 1;
  };

  const widgetTheme: "light" | "dark" | "gold" =
    theme === "dark" ? "dark" : theme === "gold" ? "gold" : "light";

  return {
    val2x2,
    lbl2x2,
    icn2x2,
    streak: String(currentStreak),
    theme: widgetTheme,
    h1Name: h1 ? h1.name : "Add your first habit",
    h1Done: isHabitDone(h1?.id),
    h2Name: h2 ? h2.name : "",
    h2Done: isHabitDone(h2?.id),
    h3Name: h3 ? h3.name : "",
    h3Done: isHabitDone(h3?.id),
  };
}

/**
 * Pushes updated widget data to native Android AppWidgets.
 */
export function updateNativeWidgets(payload: WidgetPayload): void {
  try {
    if (typeof (window as any).AndroidTheme?.updateWidgets === "function") {
      (window as any).AndroidTheme.updateWidgets(JSON.stringify(payload));
    }
  } catch (e) {
    console.warn("Failed to notify native widgets:", e);
  }
}

/**
 * 1-tap Android native Home Screen widget pin request (Android 8+ / API 26+).
 * Opens Android's "Add to Home screen" popup directly without long-pressing launcher.
 */
export function requestPinHomeWidget(size: "2x2" | "4x2"): { ok: boolean; status: string } {
  try {
    if (typeof (window as any).AndroidTheme?.pinWidget === "function") {
      const status = String((window as any).AndroidTheme.pinWidget(size) || "");
      return { ok: status === "pinned", status };
    }
    return { ok: false, status: "web_only" };
  } catch (e) {
    console.warn("Failed to request pin widget:", e);
    return { ok: false, status: "error" };
  }
}
