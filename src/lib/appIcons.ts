import { getLocalTodayStr } from "./date";

/**
 * App Icon Tier Management for Habit Tracker
 * Supports dynamic launcher activity-aliases:
 * - Spark (1-2 days)
 * - Flame (3-6 days)
 * - Glow (7-13 days)
 * - Ring (14-29 days)
 * - Gold (30-99 days)
 * - Crown (100+ days)
 * - Missed 1 day
 * - Missed 2 days
 * - Missed 3-6 days
 * - Missed 7+ days
 *
 * Rules:
 * - Missed icons: no faces. Hollow dot ring, "z" on Missed 2, small warm light on Missed 7+.
 * - Change at most once a day (app open or after midnight), never while the user is using the app.
 */

export type AppIconTier =
  | "default"
  | "spark"
  | "flame"
  | "glow"
  | "ring"
  | "gold"
  | "crown"
  | "missed_1"
  | "missed_2"
  | "missed_3_6"
  | "missed_7";

export const LAST_ICON_CHANGE_DATE_KEY = "habbitrack_last_icon_change_date";
export const ACTIVE_ICON_TIER_KEY = "habbitrack_active_icon_tier";

export const ICON_TIER_ALIASES: Record<AppIconTier, string> = {
  default: "MainActivity",
  spark: "MainActivityAliasSpark",
  flame: "MainActivityAliasFlame",
  glow: "MainActivityAliasGlow",
  ring: "MainActivityAliasRing",
  gold: "MainActivityAliasGold",
  crown: "MainActivityAliasCrown",
  missed_1: "MainActivityAliasMissed1",
  missed_2: "MainActivityAliasMissed2",
  missed_3_6: "MainActivityAliasMissed3to6",
  missed_7: "MainActivityAliasMissed7Plus",
};

/**
 * Pure function: calculates the icon tier based on streak and consecutive missed days.
 */
export function getAppIconTier(params: {
  streak: number;
  missedDays: number;
}): AppIconTier {
  const { streak, missedDays } = params;

  // Missed tiers take priority when streak is 0 or broken
  if (missedDays >= 7) return "missed_7";
  if (missedDays >= 3) return "missed_3_6";
  if (missedDays === 2) return "missed_2";
  if (missedDays === 1) return "missed_1";

  // Streak tiers
  if (streak >= 100) return "crown";
  if (streak >= 30) return "gold";
  if (streak >= 14) return "ring";
  if (streak >= 7) return "glow";
  if (streak >= 3) return "flame";
  if (streak >= 1) return "spark";

  return "default";
}

/**
 * Pure function: ensures icon change happens at most once a day.
 */
export function shouldChangeAppIcon(
  todayStr: string,
  lastChangeDate: string | null
): boolean {
  if (!lastChangeDate) return true;
  return lastChangeDate !== todayStr;
}

/**
 * Synchronizes the app launcher icon on app startup if a new day has arrived.
 */
export function syncAppIconTier(params: {
  streak: number;
  missedDays: number;
  todayStr?: string;
  force?: boolean;
}): { changed: boolean; tier: AppIconTier } {
  const today = params.todayStr || getLocalTodayStr();
  const targetTier = getAppIconTier({
    streak: params.streak,
    missedDays: params.missedDays,
  });

  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return { changed: false, tier: targetTier };
    }

    const lastChange = window.localStorage.getItem(LAST_ICON_CHANGE_DATE_KEY);
    const activeTier = (window.localStorage.getItem(ACTIVE_ICON_TIER_KEY) as AppIconTier) || "default";

    if (!params.force && !shouldChangeAppIcon(today, lastChange)) {
      return { changed: false, tier: activeTier };
    }

    if (activeTier === targetTier && !params.force) {
      window.localStorage.setItem(LAST_ICON_CHANGE_DATE_KEY, today);
      return { changed: false, tier: activeTier };
    }

    // Persist new tier
    window.localStorage.setItem(LAST_ICON_CHANGE_DATE_KEY, today);
    window.localStorage.setItem(ACTIVE_ICON_TIER_KEY, targetTier);

    // Communicate with native Android bridge
    const alias = ICON_TIER_ALIASES[targetTier];
    if (typeof (window as any).AndroidTheme?.setAppIcon === "function") {
      (window as any).AndroidTheme.setAppIcon(alias);
    }

    return { changed: true, tier: targetTier };
  } catch {
    return { changed: false, tier: targetTier };
  }
}
