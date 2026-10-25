import Dexie, { type Table } from "dexie";
import { isHabitEditable, isReflectionEditable, isSleepOrMoodEditable } from "./habitRules";

export interface Habit {
  id: string;
  name: string;
  icon: string;
  goalDays: number;
  sort: number;
  isActive: boolean;
  createdAt: string;
}

export interface HabitLog {
  id: string; // `${habitId}_${date}`
  habitId: string;
  date: string; // YYYY-MM-DD
  state: number; // 0 pending, 1 half, 2 full
  updatedAt: string;
}

export interface SleepLog {
  date: string; // YYYY-MM-DD
  bedAt: string; // e.g. "23:00"
  wakeAt: string; // e.g. "06:30"
  durationMin: number; // minutes
  updatedAt: string;
}

export interface MoodLog {
  date: string; // YYYY-MM-DD
  score: number; // 1: Rough, 2: Low, 3: Okay, 4: Good, 5: Energized
  emotions: string[];
  updatedAt: string;
  changeCount?: number;
  isLocked?: boolean;
}

export interface Reflection {
  date: string; // YYYY-MM-DD
  content: string;
  updatedAt: string;
  lockedAt?: string;
}

export interface Setting {
  key: string;
  value: string;
}

export interface OutboxItem {
  id?: number;
  table: string;
  op: "insert" | "update" | "delete";
  row: any;
  ts: number;
}

export interface DailyOSExport {
  version: number;
  exportedAt: string;
  habits: Habit[];
  habit_logs: HabitLog[];
  sleep_logs: SleepLog[];
  mood_logs: MoodLog[];
  reflections: Reflection[];
  settings: Setting[];
}

export const DEFAULT_HABITS: Habit[] = [
  {
    id: "workout",
    name: "Workout",
    icon: "dumbbell",
    goalDays: 5,
    sort: 1,
    isActive: true,
    createdAt: "2026-10-01T00:00:00.000Z",
  },
  {
    id: "study",
    name: "Study",
    icon: "book",
    goalDays: 7,
    sort: 2,
    isActive: true,
    createdAt: "2026-10-01T00:00:00.000Z",
  },
  {
    id: "ai",
    name: "AI",
    icon: "code",
    goalDays: 7,
    sort: 3,
    isActive: true,
    createdAt: "2026-10-01T00:00:00.000Z",
  },
  {
    id: "book",
    name: "Book Listening",
    icon: "headphones",
    goalDays: 5,
    sort: 4,
    isActive: true,
    createdAt: "2026-10-01T00:00:00.000Z",
  },
  {
    id: "video",
    name: "Video",
    icon: "video",
    goalDays: 3,
    sort: 5,
    isActive: true,
    createdAt: "2026-10-01T00:00:00.000Z",
  },
];

export class DailyOSDatabase extends Dexie {
  habits!: Table<Habit, string>;
  habit_logs!: Table<HabitLog, string>;
  sleep_logs!: Table<SleepLog, string>;
  mood_logs!: Table<MoodLog, string>;
  reflections!: Table<Reflection, string>;
  settings!: Table<Setting, string>;
  outbox!: Table<OutboxItem, number>;

  constructor(dbName = "habittracker_db") {
    super(dbName);
    this.version(1).stores({
      habits: "id, sort, isActive, createdAt",
      habit_logs: "id, habitId, date, [habitId+date], updatedAt",
      sleep_logs: "date, durationMin, updatedAt",
      mood_logs: "date, score, updatedAt",
      reflections: "date, updatedAt",
      settings: "key",
      outbox: "++id, table, op, ts",
    });
  }
}

export const db = new DailyOSDatabase();

export async function deduplicateHabits(): Promise<void> {
  const habits = await db.habits.toArray();
  const seen = new Set<string>();
  const toDelete: string[] = [];

  for (const h of habits) {
    const key = h.name.trim().toLowerCase();
    if (seen.has(key)) {
      toDelete.push(h.id);
    } else {
      seen.add(key);
    }
  }

  if (toDelete.length > 0) {
    for (const id of toDelete) {
      await deleteHabit(id);
    }
  }
}

/**
 * In Habit Tracker clone mode (seedZero = true default), habits table starts empty with 0 habits.
 */
export async function initDatabase(seedZero = true): Promise<void> {
  const count = await db.habits.count();
  if (count === 0 && !seedZero) {
    await db.habits.bulkAdd(DEFAULT_HABITS);
  }
  await deduplicateHabits().catch(() => {});
}

/**
 * Completely wipe all data across all Dexie tables and legacy localStorage keys
 * (clean slate: 0 habits, 0 logs, 0 reflections, 0 settings)
 */
export async function clearAllData(): Promise<void> {
  await db.transaction(
    "rw",
    [db.habits, db.habit_logs, db.sleep_logs, db.mood_logs, db.reflections, db.settings, db.outbox],
    async () => {
      await db.habits.clear();
      await db.habit_logs.clear();
      await db.sleep_logs.clear();
      await db.mood_logs.clear();
      await db.reflections.clear();
      await db.settings.clear();
      await db.outbox.clear();
    }
  );
  if (typeof window !== "undefined" && window.localStorage) {
    const keepKeys = new Set(["theme"]);
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && !keepKeys.has(k) && !k.startsWith("habittracker_fresh_clean_")) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
  }
}

/**
 * Wipe all user-recorded log entries (habits logs, sleep logs, mood logs, reflections),
 * preserving habit definitions.
 */
export async function clearAllEntries(): Promise<void> {
  await db.transaction(
    "rw",
    [db.habit_logs, db.sleep_logs, db.mood_logs, db.reflections, db.outbox],
    async () => {
      await db.habit_logs.clear();
      await db.sleep_logs.clear();
      await db.mood_logs.clear();
      await db.reflections.clear();
      await db.outbox.clear();
    }
  );
}

/**
 * Purge all legacy test data and old local storage keys
 */
export function purgeLegacyStorage(): void {
  if (typeof window !== "undefined" && window.localStorage) {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && (key.startsWith("dailyos:") || key.startsWith("daily_os_"))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
  }
}

// In-flight state tracker to prevent click races before Dexie transaction finishes
const inFlightToggles = new Map<string, number>();

// -----------------------------------------------------------------------------
// MUTATIONS (All mutations update Dexie first, then push to outbox)
// -----------------------------------------------------------------------------

export async function toggleHabit(
  habitId: string,
  date: string,
  today: string
): Promise<number> {
  if (!isHabitEditable(date, today)) {
    throw new Error(`Habit for ${date} is locked (only today and yesterday can be edited).`);
  }

  const logId = `${habitId}_${date}`;
  let currentState = 0;
  if (inFlightToggles.has(logId)) {
    currentState = inFlightToggles.get(logId)!;
  } else {
    const existing = await db.habit_logs.get(logId);
    currentState = existing ? existing.state : 0;
  }

  // Cycle: Pending (0) -> Full (2) -> Half (1) -> Pending (0)
  let nextState = 0;
  if (currentState === 0) nextState = 2;
  else if (currentState === 2) nextState = 1;
  else nextState = 0;

  inFlightToggles.set(logId, nextState);

  const now = new Date().toISOString();
  const row: HabitLog = {
    id: logId,
    habitId,
    date,
    state: nextState,
    updatedAt: now,
  };

  try {
    await db.habit_logs.put(row);
    try {
      await db.outbox.add({
        table: "habit_logs",
        op: "update",
        row,
        ts: Date.now(),
      });
    } catch {}
  } finally {
    setTimeout(() => {
      if (inFlightToggles.get(logId) === nextState) {
        inFlightToggles.delete(logId);
      }
    }, 300);
  }

  return nextState;
}

export async function setHabitState(
  habitId: string,
  date: string,
  state: number,
  today: string
): Promise<void> {
  if (!isHabitEditable(date, today)) {
    throw new Error(`Habit for ${date} is locked.`);
  }

  const logId = `${habitId}_${date}`;
  const now = new Date().toISOString();
  const row: HabitLog = {
    id: logId,
    habitId,
    date,
    state,
    updatedAt: now,
  };

  await db.habit_logs.put(row);
  try {
    await db.outbox.add({
      table: "habit_logs",
      op: "update",
      row,
      ts: Date.now(),
    });
  } catch {}
}

export async function saveSleep(
  date: string,
  bedAt: string,
  wakeAt: string,
  durationMin: number,
  today: string
): Promise<void> {
  if (!isSleepOrMoodEditable(date, today)) {
    throw new Error(`Sleep for ${date} is locked.`);
  }

  const now = new Date().toISOString();
  const row: SleepLog = {
    date,
    bedAt,
    wakeAt,
    durationMin,
    updatedAt: now,
  };

  await db.transaction("rw", db.sleep_logs, db.outbox, async () => {
    await db.sleep_logs.put(row);
    await db.outbox.add({
      table: "sleep_logs",
      op: "update",
      row,
      ts: Date.now(),
    });
  });
}

export const MAX_MOOD_CHANGES = 3;

export async function saveMood(
  date: string,
  score: number,
  emotions: string[],
  today: string
): Promise<MoodLog> {
  if (!isSleepOrMoodEditable(date, today)) {
    throw new Error(`Mood for ${date} is locked.`);
  }

  const existing = await db.mood_logs.get(date);
  const currentCount = existing?.changeCount ?? (existing?.isLocked ? MAX_MOOD_CHANGES : 0);

  if (existing?.isLocked || currentCount >= MAX_MOOD_CHANGES) {
    throw new Error(`Feeling changes limit reached (${MAX_MOOD_CHANGES}/${MAX_MOOD_CHANGES} used for today).`);
  }

  const nextCount = currentCount + 1;
  const isLocked = nextCount >= MAX_MOOD_CHANGES;
  const now = new Date().toISOString();

  const row: MoodLog = {
    date,
    score,
    emotions,
    updatedAt: now,
    changeCount: nextCount,
    isLocked,
  };

  await db.transaction("rw", db.mood_logs, db.outbox, async () => {
    await db.mood_logs.put(row);
    await db.outbox.add({
      table: "mood_logs",
      op: "update",
      row,
      ts: Date.now(),
    });
  });
  return row;
}

export async function saveReflection(
  date: string,
  content: string,
  today: string
): Promise<void> {
  if (!isReflectionEditable(date, today)) {
    throw new Error(`Past reflections cannot be edited (locked at local midnight).`);
  }

  const now = new Date().toISOString();
  const row: Reflection = {
    date,
    content,
    updatedAt: now,
  };

  await db.transaction("rw", db.reflections, db.outbox, async () => {
    await db.reflections.put(row);
    await db.outbox.add({
      table: "reflections",
      op: "update",
      row,
      ts: Date.now(),
    });
  });
}

const HABITS_CACHE_KEY = "dailyos_habits_cache_v1";

export function getCachedHabits(): Habit[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(HABITS_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Habit[]) : [];
  } catch {
    return [];
  }
}

export function setCachedHabits(habits: Habit[]): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(HABITS_CACHE_KEY, JSON.stringify(habits));
  } catch {}
}

export async function saveHabit(habit: Habit): Promise<void> {
  try {
    const list = getCachedHabits();
    const idx = list.findIndex((h) => h.id === habit.id);
    if (idx >= 0) {
      list[idx] = habit;
    } else {
      list.push(habit);
    }
    setCachedHabits(list);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dailyos_habits_updated"));
    }
  } catch {}

  await db.habits.put(habit);

  try {
    await db.outbox.add({
      table: "habits",
      op: "update",
      row: habit,
      ts: Date.now(),
    });
  } catch {}
}

export async function deleteHabit(id: string): Promise<void> {
  try {
    const list = getCachedHabits().filter((h) => h.id !== id);
    setCachedHabits(list);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dailyos_habits_updated"));
    }
  } catch {}

  await db.habits.delete(id);

  try {
    await db.outbox.add({
      table: "habits",
      op: "delete",
      row: { id },
      ts: Date.now(),
    });
  } catch {}
}

export async function getSetting(key: string, defaultValue = ""): Promise<string> {
  const row = await db.settings.get(key);
  return row ? row.value : defaultValue;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const row: Setting = { key, value };
  await db.transaction("rw", db.settings, db.outbox, async () => {
    await db.settings.put(row);
    await db.outbox.add({
      table: "settings",
      op: "update",
      row,
      ts: Date.now(),
    });
  });
}

// -----------------------------------------------------------------------------
// EXPORT / IMPORT
// -----------------------------------------------------------------------------

export async function exportAllData(): Promise<DailyOSExport> {
  const [habits, habit_logs, sleep_logs, mood_logs, reflections, settings] = await Promise.all([
    db.habits.toArray(),
    db.habit_logs.toArray(),
    db.sleep_logs.toArray(),
    db.mood_logs.toArray(),
    db.reflections.toArray(),
    db.settings.toArray(),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    habits,
    habit_logs,
    sleep_logs,
    mood_logs,
    reflections,
    settings,
  };
}

export async function importAllData(data: DailyOSExport): Promise<void> {
  if (!data || typeof data.version !== "number") {
    throw new Error("Invalid backup file: missing version field");
  }

  await db.transaction("rw", [db.habits, db.habit_logs, db.sleep_logs, db.mood_logs, db.reflections, db.settings, db.outbox], async () => {
    if (data.habits?.length) await db.habits.bulkPut(data.habits);
    if (data.habit_logs?.length) await db.habit_logs.bulkPut(data.habit_logs);
    if (data.sleep_logs?.length) await db.sleep_logs.bulkPut(data.sleep_logs);
    if (data.mood_logs?.length) await db.mood_logs.bulkPut(data.mood_logs);
    if (data.reflections?.length) await db.reflections.bulkPut(data.reflections);
    if (data.settings?.length) await db.settings.bulkPut(data.settings);
  });
}
