/**
 * Local Notifications Engine for Habit Tracker (DailyOS)
 * Strictly local-only using @capacitor/local-notifications. No server involved.
 */

import { LocalNotifications } from "@capacitor/local-notifications";
import type { Habit, HabitLog } from "./db";

export type NotificationAccent = "teal" | "orange" | "grey" | "gold";

export interface NotificationBannerItem {
  id: string; // "A" | "B" | "D" | "E" | "G" | "H" | "J" | "K" | "MILESTONE"
  title: string;
  body: string;
  accent: NotificationAccent;
  scheduledTime?: string; // e.g. "20:00"
}

export interface ReminderSettings {
  masterEnabled: boolean;
  dailyTime: string; // "HH:MM", default "20:00"
  streakAtRiskEnabled: boolean; // default true, 21:30
  badgeNearEnabled: boolean; // default true
  comebackEnabled: boolean; // default true
  showWhyLineEnabled: boolean; // default true
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  masterEnabled: false,
  dailyTime: "20:00",
  streakAtRiskEnabled: true,
  badgeNearEnabled: true,
  comebackEnabled: true,
  showWhyLineEnabled: true,
};

export const REMINDERS_STORAGE_KEY = "habbitrack_reminder_settings";
export const REMINDERS_PROMPT_KEY = "habbitrack_reminders_prompt_state";

export interface ReminderPromptState {
  dismissCount: number;
  lastDismissDate: string | null;
  hasRequested: boolean;
}

export const TEMPLATES = {
  A_DAILY: {
    id: "A",
    title: "Aaj ka kaam baaki hai",
    body: "Sirf 1 minute. Tick karo aur free ho jao.",
    accent: "teal" as NotificationAccent,
    defaultTime: "20:00",
  },
  B_STREAK_AT_RISK: {
    id: "B",
    title: (streak: number) => `Tumhara ${streak}-day streak khatre mein hai`,
    body: (streak: number) => `${streak} din ki mehnat. Ek tick se bach jayega.`,
    accent: "orange" as NotificationAccent,
    defaultTime: "21:30",
  },
  D_ALL_DONE: {
    id: "D",
    title: "Aaj ka kaam done",
    body: "Ab bina guilt ke scroll karo. Tumne kama liya.",
    accent: "teal" as NotificationAccent,
    defaultTime: "21:15",
  },
  E_MISSED_1: {
    id: "E",
    title: "Kal chhoot gaya, koi baat nahi",
    body: "Aaj se wapas shuru. Streak freeze bhi hai.",
    accent: "grey" as NotificationAccent,
    defaultTime: "20:45",
  },
  G_MISSED_3_6: {
    id: "G",
    title: "Instagram wahin rahega",
    body: "Tumhara streak aur tumhara future self nahi.",
    accent: "grey" as NotificationAccent,
    defaultTime: "18:50",
  },
  H_MISSED_7_PLUS: {
    id: "H",
    title: "Ek chhota kadam kaafi hai",
    body: "Sirf ek habit tick karo. Baaki kal dekhenge.",
    accent: "grey" as NotificationAccent,
    defaultTime: "18:10",
  },
  J_FREEZE_OFFER: {
    id: "J",
    title: "Streak freeze use karein?",
    body: "Kal miss hua. Ek freeze se streak bach sakta hai.",
    accent: "grey" as NotificationAccent,
    defaultTime: "17:20",
  },
  K_OWN_REASON: {
    id: "K",
    title: "Tumne khud likha tha",
    body: (reason: string) => `"${reason}". Aaj ka tick baaki hai.`,
    accent: "orange" as NotificationAccent,
    defaultTime: "16:50",
  },
  MILESTONE_NEAR: {
    id: "MILESTONE",
    title: (badge: number) => `${badge}-day badge kareeb hai`,
    body: (badge: number) => `Sirf 1 din door! Aaj ka tick karo aur ${badge}-day badge unlock karo.`,
    accent: "gold" as NotificationAccent,
    defaultTime: "19:00",
  },
};

/**
 * Pure function: Selects the primary notification banner item based on the current user state.
 */
export function pickNotificationBanner(params: {
  streak: number;
  missedDays: number;
  allDoneToday: boolean;
  hasFreezeAvailable?: boolean;
  habitWithWhy?: { name: string; why: string } | null;
  nextBadge?: number | null;
}): NotificationBannerItem {
  const {
    streak,
    missedDays,
    allDoneToday,
    hasFreezeAvailable = false,
    habitWithWhy,
    nextBadge,
  } = params;

  // 1. If all habits for today are completed
  if (allDoneToday) {
    return {
      id: TEMPLATES.D_ALL_DONE.id,
      title: TEMPLATES.D_ALL_DONE.title,
      body: TEMPLATES.D_ALL_DONE.body,
      accent: TEMPLATES.D_ALL_DONE.accent,
      scheduledTime: TEMPLATES.D_ALL_DONE.defaultTime,
    };
  }

  // 2. Missed 7+ days comeback
  if (missedDays >= 7) {
    return {
      id: TEMPLATES.H_MISSED_7_PLUS.id,
      title: TEMPLATES.H_MISSED_7_PLUS.title,
      body: TEMPLATES.H_MISSED_7_PLUS.body,
      accent: TEMPLATES.H_MISSED_7_PLUS.accent,
      scheduledTime: TEMPLATES.H_MISSED_7_PLUS.defaultTime,
    };
  }

  // 3. Missed 3 to 6 days comeback
  if (missedDays >= 3) {
    return {
      id: TEMPLATES.G_MISSED_3_6.id,
      title: TEMPLATES.G_MISSED_3_6.title,
      body: TEMPLATES.G_MISSED_3_6.body,
      accent: TEMPLATES.G_MISSED_3_6.accent,
      scheduledTime: TEMPLATES.G_MISSED_3_6.defaultTime,
    };
  }

  // 4. Missed 1 day with freeze available offer
  if (missedDays === 1 && hasFreezeAvailable) {
    return {
      id: TEMPLATES.J_FREEZE_OFFER.id,
      title: TEMPLATES.J_FREEZE_OFFER.title,
      body: TEMPLATES.J_FREEZE_OFFER.body,
      accent: TEMPLATES.J_FREEZE_OFFER.accent,
      scheduledTime: TEMPLATES.J_FREEZE_OFFER.defaultTime,
    };
  }

  // 5. Missed 1 day standard
  if (missedDays === 1) {
    return {
      id: TEMPLATES.E_MISSED_1.id,
      title: TEMPLATES.E_MISSED_1.title,
      body: TEMPLATES.E_MISSED_1.body,
      accent: TEMPLATES.E_MISSED_1.accent,
      scheduledTime: TEMPLATES.E_MISSED_1.defaultTime,
    };
  }

  // 6. Own reason "Why" line (if user specified why and habit is pending)
  if (habitWithWhy && habitWithWhy.why?.trim()) {
    return {
      id: TEMPLATES.K_OWN_REASON.id,
      title: TEMPLATES.K_OWN_REASON.title,
      body: TEMPLATES.K_OWN_REASON.body(habitWithWhy.why.trim()),
      accent: TEMPLATES.K_OWN_REASON.accent,
      scheduledTime: TEMPLATES.K_OWN_REASON.defaultTime,
    };
  }

  // 7. Streak at risk (active streak >= 3 and habits still open late evening)
  if (streak >= 3) {
    return {
      id: TEMPLATES.B_STREAK_AT_RISK.id,
      title: TEMPLATES.B_STREAK_AT_RISK.title(streak),
      body: TEMPLATES.B_STREAK_AT_RISK.body(streak),
      accent: TEMPLATES.B_STREAK_AT_RISK.accent,
      scheduledTime: TEMPLATES.B_STREAK_AT_RISK.defaultTime,
    };
  }

  // 8. Next badge near (e.g., 1 day away from badge milestone)
  if (nextBadge && nextBadge - streak === 1) {
    return {
      id: TEMPLATES.MILESTONE_NEAR.id,
      title: TEMPLATES.MILESTONE_NEAR.title(nextBadge),
      body: TEMPLATES.MILESTONE_NEAR.body(nextBadge),
      accent: TEMPLATES.MILESTONE_NEAR.accent,
      scheduledTime: TEMPLATES.MILESTONE_NEAR.defaultTime,
    };
  }

  // 9. Standard daily reminder
  return {
    id: TEMPLATES.A_DAILY.id,
    title: TEMPLATES.A_DAILY.title,
    body: TEMPLATES.A_DAILY.body,
    accent: TEMPLATES.A_DAILY.accent,
    scheduledTime: TEMPLATES.A_DAILY.defaultTime,
  };
}

/**
 * Filter notifications for scheduling with strict max 2 per day cap.
 */
export function capDailyNotifications(
  candidates: { id: number; title: string; body: string; date: Date }[],
  maxPerDay = 2
): { id: number; title: string; body: string; date: Date }[] {
  const byDate: Record<string, typeof candidates> = {};
  for (const item of candidates) {
    const key = item.date.toISOString().slice(0, 10);
    if (!byDate[key]) byDate[key] = [];
    if (byDate[key].length < maxPerDay) {
      byDate[key].push(item);
    }
  }
  return Object.values(byDate).flat();
}

/**
 * Load reminder settings safely.
 */
export function getReminderSettings(): ReminderSettings {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return DEFAULT_REMINDER_SETTINGS;
    }
    const raw = window.localStorage.getItem(REMINDERS_STORAGE_KEY);
    if (!raw) return DEFAULT_REMINDER_SETTINGS;
    return { ...DEFAULT_REMINDER_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_REMINDER_SETTINGS;
  }
}

/**
 * Save reminder settings.
 */
export function saveReminderSettings(settings: ReminderSettings): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

/**
 * Load in-app top banner reminder prompt state.
 */
export function getReminderPromptState(): ReminderPromptState {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return { dismissCount: 0, lastDismissDate: null, hasRequested: false };
    }
    const raw = window.localStorage.getItem(REMINDERS_PROMPT_KEY);
    if (!raw) return { dismissCount: 0, lastDismissDate: null, hasRequested: false };
    return JSON.parse(raw);
  } catch {
    return { dismissCount: 0, lastDismissDate: null, hasRequested: false };
  }
}

/**
 * Checks if the top in-app banner ("Reminders on karein?") should be shown.
 * - After the user creates their first habit.
 * - If dismissed once ("Baad mein"), shown once more after 3 days, then never again.
 */
export function shouldShowReminderBanner(
  habitCount: number,
  todayStr = new Date().toISOString().slice(0, 10)
): boolean {
  if (habitCount < 1) return false;
  const settings = getReminderSettings();
  if (settings.masterEnabled) return false;

  const promptState = getReminderPromptState();
  if (promptState.hasRequested) return false;

  // Never dismissed before: show!
  if (promptState.dismissCount === 0) return true;

  // Dismissed once: only show if at least 3 days have passed since last dismiss
  if (promptState.dismissCount === 1) {
    if (!promptState.lastDismissDate) return true;
    const diffDays =
      (new Date(todayStr).getTime() - new Date(promptState.lastDismissDate).getTime()) /
      (1000 * 3600 * 24);
    return diffDays >= 3;
  }

  // Dismissed 2 or more times: never show again
  return false;
}

/**
 * Action: User clicks "Haan, on karo"
 */
export async function acceptReminderPrompt(): Promise<boolean> {
  const current = getReminderPromptState();
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(
        REMINDERS_PROMPT_KEY,
        JSON.stringify({ ...current, hasRequested: true })
      );
    }
    const perm = await LocalNotifications.requestPermissions();
    const granted = perm.display === "granted";
    if (granted) {
      const s = getReminderSettings();
      saveReminderSettings({ ...s, masterEnabled: true });
    }
    return granted;
  } catch {
    return false;
  }
}

/**
 * Action: User clicks "Baad mein"
 */
export function dismissReminderPrompt(
  todayStr = new Date().toISOString().slice(0, 10)
): void {
  const current = getReminderPromptState();
  const next = {
    dismissCount: current.dismissCount + 1,
    lastDismissDate: todayStr,
    hasRequested: current.dismissCount >= 1, // If dismissed second time, permanently finish
  };
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(REMINDERS_PROMPT_KEY, JSON.stringify(next));
    }
  } catch {}
}

/**
 * Rolling 7-day schedule recalculation.
 * Reschedules local notifications for the next 7 days based on current habits and settings.
 * Max 2 notifications per day.
 */
export async function rescheduleRollingNotifications(
  habits: Habit[],
  habitLogs: HabitLog[],
  currentStreak: number,
  todayStr = new Date().toISOString().slice(0, 10)
): Promise<void> {
  const settings = getReminderSettings();
  if (!settings.masterEnabled) {
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({
          notifications: pending.notifications.map((n) => ({ id: n.id })),
        });
      }
    } catch {}
    return;
  }

  // Check system permissions
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") return;
  } catch {
    return;
  }

  const activeHabits = habits.filter((h) => h.isActive);
  if (activeHabits.length === 0) return;

  const candidateNotifications: { id: number; title: string; body: string; date: Date }[] = [];
  const baseDate = new Date(todayStr);

  const [dailyHour, dailyMinute] = settings.dailyTime.split(":").map(Number);

  for (let offset = 0; offset < 7; offset++) {
    const targetDate = new Date(baseDate.getTime() + offset * 86400000);
    const dateStr = targetDate.toISOString().slice(0, 10);

    // Filter habits scheduled for this day
    const dayLogs = habitLogs.filter((l) => l.date === dateStr);
    const allDone =
      offset === 0 &&
      activeHabits.length > 0 &&
      activeHabits.every((h) => dayLogs.some((l) => l.habitId === h.id && (l.state ?? 0) >= 1));

    // Never notify for days/habits already completed
    if (allDone) continue;

    // 1. Daily Reminder (default 8:00 PM)
    const dailyNotifyDate = new Date(targetDate);
    dailyNotifyDate.setHours(isNaN(dailyHour) ? 20 : dailyHour, isNaN(dailyMinute) ? 0 : dailyMinute, 0, 0);

    // Only future times
    if (dailyNotifyDate.getTime() > Date.now()) {
      const habitWithWhy = settings.showWhyLineEnabled
        ? activeHabits.find((h) => h.why?.trim())
        : null;

      const banner = pickNotificationBanner({
        streak: currentStreak,
        missedDays: 0,
        allDoneToday: false,
        habitWithWhy: habitWithWhy ? { name: habitWithWhy.name, why: habitWithWhy.why! } : null,
      });

      candidateNotifications.push({
        id: (offset + 1) * 10 + 1,
        title: banner.title,
        body: banner.body,
        date: dailyNotifyDate,
      });
    }

    // 2. Streak at Risk Reminder (9:30 PM)
    if (settings.streakAtRiskEnabled && currentStreak >= 3) {
      const riskNotifyDate = new Date(targetDate);
      riskNotifyDate.setHours(21, 30, 0, 0);

      if (riskNotifyDate.getTime() > Date.now()) {
        const riskBanner = TEMPLATES.B_STREAK_AT_RISK;
        candidateNotifications.push({
          id: (offset + 1) * 10 + 2,
          title: riskBanner.title(currentStreak),
          body: riskBanner.body(currentStreak),
          date: riskNotifyDate,
        });
      }
    }
  }

  // Strict cap: max 2 notifications a day
  const capped = capDailyNotifications(candidateNotifications, 2);

  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      });
    }

    if (capped.length > 0) {
      await LocalNotifications.schedule({
        notifications: capped.map((item) => ({
          id: item.id,
          title: item.title,
          body: item.body,
          schedule: { at: item.date },
          sound: "beep.wav",
          smallIcon: "ic_stat_icon_config_sample",
          actionTypeId: "OPEN_TODAY",
        })),
      });
    }
  } catch (err) {
    console.warn("Failed to schedule local notifications:", err);
  }
}
