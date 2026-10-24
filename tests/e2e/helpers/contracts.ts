import fs from "node:fs";
import path from "node:path";

export interface HabitRuleItem {
  id?: string;
  name?: string;
  goalDays: number;
}

export type HabitLogsMap = Map<string, number>;

// Date calculations matching habitRules.js
const DAY = 86400000;
export const toMs = (d: string) => Date.parse(d + "T00:00:00Z");
export const fromMs = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const weekdayIdx = (d: string) => ((new Date(toMs(d)).getUTCDay() + 6) % 7) + 1; // Mon=1..Sun=7
export const weekStart = (d: string) => fromMs(toMs(d) - (weekdayIdx(d) - 1) * DAY);
export const addDays = (d: string, n: number) => fromMs(toMs(d) + n * DAY);

export const dayPoints = (states: number[]) => states.reduce((s, x) => s + x / 2, 0);
export const weeklyMax = (habits: HabitRuleItem[]) => habits.reduce((s, h) => s + h.goalDays, 0);

export function weekPoints(logs: HabitLogsMap, goalDays: number, today: string): number {
  let p = 0;
  for (let d = weekStart(today); d <= today; d = fromMs(toMs(d) + DAY)) {
    p += (logs.get(d) || 0) / 2;
  }
  return Math.min(p, goalDays);
}

export const targetSoFar = (habits: HabitRuleItem[], today: string) =>
  habits.reduce((s, h) => s + (h.goalDays * weekdayIdx(today)) / 7, 0);

export function goalDaysDone(logs: HabitLogsMap, today: string): number {
  let n = 0;
  for (let d = weekStart(today); d <= today; d = fromMs(toMs(d) + DAY)) {
    if (logs.get(d) === 2) n++;
  }
  return n;
}

export function streakDays(logs: HabitLogsMap, goalDays: number, today: string, firstDate?: string | null): number {
  const idx = weekdayIdx(today);
  const done = goalDaysDone(logs, today);
  if (done + (7 - idx) < goalDays) return 0; // cannot reach goal this week
  let days = 0;
  const thisStart = weekStart(today);
  const startMs = firstDate ? toMs(firstDate) : toMs(thisStart);
  days += Math.min(idx, Math.floor((toMs(today) - Math.max(startMs, toMs(thisStart))) / DAY) + 1);
  for (let ws = toMs(thisStart) - 7 * DAY; ws + 6 * DAY >= startMs; ws -= 7 * DAY) {
    let n = 0;
    for (let k = 0; k < 7; k++) {
      if (logs.get(fromMs(ws + k * DAY)) === 2) n++;
    }
    if (n < goalDays) break;
    days += 7 - Math.max(0, Math.floor((startMs - ws) / DAY));
  }
  return days;
}

// DateLock Contract (src/lib/dateLock.ts)
export interface DateLockState {
  isReflectionEditable: boolean;
  isHabitEditable: boolean;
  isSleepEditable: boolean;
  isMoodEditable: boolean;
  isToday: boolean;
  isYesterday: boolean;
  isPastLocked: boolean;
  isFutureLocked: boolean;
  graceBannerVisible: boolean;
}

export function getDateLockState(targetDate: string, today: string = fromMs(Date.now())): DateLockState {
  const isToday = targetDate === today;
  const yesterday = addDays(today, -1);
  const isYesterday = targetDate === yesterday;
  const isPastLocked = targetDate < yesterday;
  const isFutureLocked = targetDate > today;

  return {
    isReflectionEditable: isToday,
    isHabitEditable: isToday || isYesterday,
    isSleepEditable: isToday || isYesterday,
    isMoodEditable: isToday || isYesterday,
    isToday,
    isYesterday,
    isPastLocked,
    isFutureLocked,
    graceBannerVisible: isYesterday,
  };
}

// Token Oracle loader from design-handoff/tokens.css
export function loadDesignTokens(): {
  light: Record<string, string>;
  dark: Record<string, string>;
  typography: Record<string, string>;
} {
  const tokensPath = path.resolve(process.cwd(), "design-handoff/tokens.css");
  const content = fs.readFileSync(tokensPath, "utf-8");

  const parseBlock = (blockStr: string) => {
    const map: Record<string, string> = {};
    const matches = blockStr.matchAll(/--([a-zA-Z0-9_-]+)\s*:\s*([^;}]+)(?:;|$)/g);
    for (const match of matches) {
      map[`--${match[1]}`] = match[2].trim();
    }
    return map;
  };

  const rootMatch = content.match(/:root\s*\{([^}]+)\}/);
  const darkMatch = content.match(/html\.dark\s*\{([^}]+)\}/);

  const lightVars = rootMatch ? parseBlock(rootMatch[1]) : {};
  const darkVars = darkMatch ? parseBlock(darkMatch[1]) : {};

  return {
    light: lightVars,
    dark: darkVars,
    typography: {
      "--font": lightVars["--font"] || "'Plus Jakarta Sans', sans-serif",
      "--num": lightVars["--num"] || "'Space Grotesk', sans-serif",
    },
  };
}

// Icon Catalog loader and keyword matching from design-handoff/icons.json
export interface IconItem {
  name: string;
  category: string;
  keywords: string[];
  svg: string;
}

export function loadIconCatalog(): IconItem[] {
  const iconsPath = path.resolve(process.cwd(), "design-handoff/icons.json");
  const content = fs.readFileSync(iconsPath, "utf-8");
  return JSON.parse(content);
}

export function suggestIcon(habitName: string, catalog?: IconItem[]): IconItem {
  const icons = catalog || loadIconCatalog();
  const lower = habitName.toLowerCase().trim();
  const words = lower.split(/\s+/);

  // Exact name match
  const exact = icons.find((i) => i.name.toLowerCase() === lower);
  if (exact) return exact;

  // Exact keyword match
  for (const word of words) {
    if (word.length < 2) continue;
    const match = icons.find(
      (i) => i.name.toLowerCase() === word || i.keywords.some((kw) => kw.toLowerCase() === word)
    );
    if (match) return match;
  }

  // Partial match across keywords or name
  for (const word of words) {
    if (word.length < 3) continue;
    const match = icons.find(
      (i) => i.name.toLowerCase().includes(word) || i.keywords.some((kw) => kw.toLowerCase().includes(word))
    );
    if (match) return match;
  }

  // Fallback to first fitness/general icon
  return icons[0];
}

// Seed State definition (PROJECT.md Feature 12)
export const DAILYOS_DEFAULT_HABITS: HabitRuleItem[] = [
  { id: "habit-1", name: "Workout", goalDays: 7 },
  { id: "habit-2", name: "Study", goalDays: 7 },
  { id: "habit-3", name: "AI", goalDays: 7 },
  { id: "habit-4", name: "Book", goalDays: 7 },
  { id: "habit-5", name: "Video", goalDays: 7 },
];

// In-Memory Dexie-like Database for E2E testing
export class InMemoryDailyDb {
  habits: HabitRuleItem[] = [];
  habit_logs: Array<{ id: string; habitId: string; date: string; state: number; updatedAt: number }> = [];
  sleep_logs: Array<{ date: string; bedTime: string; wakeTime: string; durationMinutes: number; quality: number; updatedAt: number }> = [];
  mood_logs: Array<{ date: string; score: number; emotions: string[]; note?: string; updatedAt: number }> = [];
  reflections: Array<{ date: string; text: string; updatedAt: number; lockedAt?: number }> = [];
  settings: Record<string, any> = {};
  outbox: Array<{ id: number; table: string; action: "insert" | "update" | "delete"; recordId: string; payload: any; ts: number }> = [];
  private outboxSeq = 1;

  seedDailyOs() {
    this.habits = DAILYOS_DEFAULT_HABITS.map((h) => ({ ...h }));
    this.habit_logs = [];
    this.sleep_logs = [];
    this.mood_logs = [];
    this.reflections = [];
    this.settings = { theme: "light", installedAt: Date.now() };
    this.outbox = [];
  }

  seedZeroHabitClone() {
    this.habits = [];
    this.habit_logs = [];
    this.sleep_logs = [];
    this.mood_logs = [];
    this.reflections = [];
    this.settings = { theme: "light", isClone: true, installedAt: Date.now() };
    this.outbox = [];
  }

  logHabit(habitId: string, date: string, state: number) {
    const existingIdx = this.habit_logs.findIndex((l) => l.habitId === habitId && l.date === date);
    const now = Date.now();
    const entry = { id: `${habitId}_${date}`, habitId, date, state, updatedAt: now };

    if (existingIdx >= 0) {
      this.habit_logs[existingIdx] = entry;
      this.queueOutbox("habit_logs", "update", entry.id, entry);
    } else {
      this.habit_logs.push(entry);
      this.queueOutbox("habit_logs", "insert", entry.id, entry);
    }
  }

  logSleep(date: string, bedTime: string, wakeTime: string, quality: number = 3) {
    const bedMinutes = timeToMinutes(bedTime);
    const wakeMinutes = timeToMinutes(wakeTime);
    let durationMinutes = wakeMinutes - bedMinutes;
    if (durationMinutes < 0) durationMinutes += 1440; // overnight wrap

    const entry = { date, bedTime, wakeTime, durationMinutes, quality, updatedAt: Date.now() };
    const existingIdx = this.sleep_logs.findIndex((s) => s.date === date);
    if (existingIdx >= 0) {
      this.sleep_logs[existingIdx] = entry;
      this.queueOutbox("sleep_logs", "update", date, entry);
    } else {
      this.sleep_logs.push(entry);
      this.queueOutbox("sleep_logs", "insert", date, entry);
    }
    return entry;
  }

  logMood(date: string, score: number, emotions: string[] = [], note?: string) {
    const entry = { date, score, emotions, note, updatedAt: Date.now() };
    const existingIdx = this.mood_logs.findIndex((m) => m.date === date);
    if (existingIdx >= 0) {
      this.mood_logs[existingIdx] = entry;
      this.queueOutbox("mood_logs", "update", date, entry);
    } else {
      this.mood_logs.push(entry);
      this.queueOutbox("mood_logs", "insert", date, entry);
    }
    return entry;
  }

  saveReflection(date: string, text: string, today: string = fromMs(Date.now())) {
    if (date !== today) {
      throw new Error(`Cannot edit reflection for past/future date ${date}. Only today (${today}) is editable.`);
    }
    const entry = { date, text, updatedAt: Date.now(), lockedAt: undefined };
    const existingIdx = this.reflections.findIndex((r) => r.date === date);
    if (existingIdx >= 0) {
      this.reflections[existingIdx] = entry;
      this.queueOutbox("reflections", "update", date, entry);
    } else {
      this.reflections.push(entry);
      this.queueOutbox("reflections", "insert", date, entry);
    }
    return entry;
  }

  private queueOutbox(table: string, action: "insert" | "update" | "delete", recordId: string, payload: any) {
    this.outbox.push({
      id: this.outboxSeq++,
      table,
      action,
      recordId,
      payload,
      ts: Date.now(),
    });
  }

  exportJson(): string {
    return JSON.stringify(
      {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        tables: {
          habits: this.habits,
          habit_logs: this.habit_logs,
          sleep_logs: this.sleep_logs,
          mood_logs: this.mood_logs,
          reflections: this.reflections,
          settings: this.settings,
        },
      },
      null,
      2
    );
  }

  importJson(jsonString: string): { success: boolean; count: number; error?: string } {
    try {
      const data = JSON.parse(jsonString);
      if (!data || !data.tables || !data.schemaVersion) {
        return { success: false, count: 0, error: "Invalid backup schema: missing tables or schemaVersion" };
      }
      this.habits = data.tables.habits || [];
      this.habit_logs = data.tables.habit_logs || [];
      this.sleep_logs = data.tables.sleep_logs || [];
      this.mood_logs = data.tables.mood_logs || [];
      this.reflections = data.tables.reflections || [];
      this.settings = data.tables.settings || {};
      const total =
        this.habits.length +
        this.habit_logs.length +
        this.sleep_logs.length +
        this.mood_logs.length +
        this.reflections.length;
      return { success: true, count: total };
    } catch (err: any) {
      return { success: false, count: 0, error: err.message };
    }
  }
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// Turso Mock & Verification (PROJECT.md Feature 22)
export function normalizeTursoUrl(rawUrl: string): string {
  let url = rawUrl.trim();
  if (url.startsWith("libsql://")) {
    url = "https://" + url.slice("libsql://".length);
  }
  if (!url.startsWith("https://") && !url.startsWith("http://")) {
    url = "https://" + url;
  }
  return url.replace(/\/+$/, "");
}

export function maskToken(token: string): string {
  if (!token || token.length < 10) return "••••••••";
  return token.slice(0, 4) + "••••••••" + token.slice(-4);
}

export interface TursoPipelineRequest {
  requests: Array<{ type: "execute"; stmt: { sql: string; args?: any[] } }>;
}

export function buildTursoPipelinePayload(sql: string = "SELECT 1"): TursoPipelineRequest {
  return {
    requests: [
      {
        type: "execute",
        stmt: { sql },
      },
    ],
  };
}
