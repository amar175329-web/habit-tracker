import Dexie, { type Table } from "dexie";
import { isHabitEditable, isReflectionEditable, isSleepOrMoodEditable, weekStart } from "./habitRules";

export interface Habit {
  id: string;
  name: string;
  icon: string;
  goalDays: number;
  sort: number;
  isActive: boolean;
  createdAt: string;
  archivedAt?: string;
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

export interface EditPass {
  id: string; // `${week_start}_${date}`
  week_start: string;
  date: string;
  used_at: string;
}

export interface StreakFreeze {
  id: string; // YYYY-MM
  month: string;
  available: number; // default 2
  usedDates: string[];
  updatedAt: string;
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
  deletedHabitIds?: string[];
  habit_logs: HabitLog[];
  sleep_logs: SleepLog[];
  mood_logs: MoodLog[];
  reflections: Reflection[];
  settings: Setting[];
  edit_passes?: EditPass[];
  streak_freezes?: StreakFreeze[];
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
  edit_passes!: Table<EditPass, string>;
  streak_freezes!: Table<StreakFreeze, string>;

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
    this.version(2).stores({
      edit_passes: "id, week_start, date, used_at",
      streak_freezes: "id, month, updatedAt",
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
    [db.habits, db.habit_logs, db.sleep_logs, db.mood_logs, db.reflections, db.settings, db.outbox, db.edit_passes, db.streak_freezes],
    async () => {
      await db.habits.clear();
      await db.habit_logs.clear();
      await db.sleep_logs.clear();
      await db.mood_logs.clear();
      await db.reflections.clear();
      await db.settings.clear();
      await db.outbox.clear();
      await db.edit_passes.clear();
      await db.streak_freezes.clear();
    }
  );

  // Trigger server-side complete data purge if hosted
  try {
    if (typeof window !== "undefined" && window.location && window.location.origin?.startsWith("http")) {
      fetch("/api/purge-all-data", { method: "POST" }).catch(() => {});
    }
  } catch {}

  if (typeof window !== "undefined" && window.localStorage) {
    const currentTheme = window.localStorage.getItem("dailyos_theme") || window.localStorage.getItem("theme") || "light";
    const keepKeys = new Set(["habittracker_clean_restart_v13", "habittracker_db_purged_v13", "dailyos_theme", "theme"]);
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && !keepKeys.has(k) && !k.startsWith("habittracker_clean_restart_")) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
    window.localStorage.setItem("theme", currentTheme);
    window.localStorage.setItem("dailyos_theme", currentTheme);
    window.dispatchEvent(new CustomEvent("dailyos_habits_updated"));
  }
  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      window.sessionStorage.clear();
    } catch {}
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
  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      window.sessionStorage.clear();
    } catch {}
  }
}

// In-flight state tracker to prevent click races before Dexie transaction finishes
const inFlightToggles = new Map<string, number>();

// In-memory unlocked dates for 0ms instant real-time checks
const inMemoryUnlockedDates = new Set<string>();

export function getSessionUnlockedDates(): string[] {
  try {
    if (typeof sessionStorage !== "undefined") {
      const raw = sessionStorage.getItem("dailyos_unlocked_dates");
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          arr.forEach((d) => inMemoryUnlockedDates.add(d));
        }
      }
    }
  } catch {}
  return Array.from(inMemoryUnlockedDates);
}

export function markDateUnlocked(date: string): void {
  inMemoryUnlockedDates.add(date);
  try {
    if (typeof sessionStorage !== "undefined") {
      const dates = Array.from(inMemoryUnlockedDates);
      sessionStorage.setItem("dailyos_unlocked_dates", JSON.stringify(dates));
    }
  } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("dailyos_unlocked_updated", { detail: { date } }));
  }
}

export async function isDateUnlocked(date: string, today: string): Promise<boolean> {
  if (date > today) return false;
  if (inMemoryUnlockedDates.has(date)) return true;
  try {
    const stored = getSessionUnlockedDates();
    if (stored.includes(date)) return true;
    const currentWeek = weekStart(today);
    const pass = await db.edit_passes.get(`${currentWeek}_${date}`);
    if (pass) {
      inMemoryUnlockedDates.add(date);
      return true;
    }
    const anyPass = await db.edit_passes.where("date").equals(date).first();
    if (anyPass) {
      inMemoryUnlockedDates.add(date);
      return true;
    }
  } catch {}
  return false;
}

// -----------------------------------------------------------------------------
// MUTATIONS (All mutations update Dexie first, then push to outbox)
// -----------------------------------------------------------------------------

export async function toggleHabit(
  habitId: string,
  date: string,
  today: string
): Promise<number> {
  let canEdit = isHabitEditable(date, today);
  if (!canEdit && date < today && weekStart(date) === weekStart(today)) {
    if (await isDateUnlocked(date, today)) canEdit = true;
  }
  if (!canEdit) {
    throw new Error(`Habit for ${date} is locked.`);
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
  let canEdit = isHabitEditable(date, today);
  if (!canEdit && date < today && weekStart(date) === weekStart(today)) {
    if (await isDateUnlocked(date, today)) canEdit = true;
  }
  if (!canEdit) {
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
  let canEdit = isSleepOrMoodEditable(date, today);
  if (!canEdit && date < today && weekStart(date) === weekStart(today)) {
    if (await isDateUnlocked(date, today)) canEdit = true;
  }
  if (!canEdit) {
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

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("dailyos_sleep_updated", { detail: { date } }));
  }
}

export const MAX_MOOD_CHANGES = 3;

export async function saveMood(
  date: string,
  score: number,
  emotions: string[],
  today: string
): Promise<MoodLog> {
  let canEdit = isSleepOrMoodEditable(date, today);
  if (!canEdit && date < today && weekStart(date) === weekStart(today)) {
    if (await isDateUnlocked(date, today)) canEdit = true;
  }
  if (!canEdit) {
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

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("dailyos_mood_updated", { detail: { date, score } }));
  }
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
const DELETED_HABITS_KEY = "dailyos_deleted_habits_v1";

export function getDeletedHabitIds(): Set<string> {
  if (typeof window === "undefined" || !window.localStorage) return new Set();
  try {
    const raw = window.localStorage.getItem(DELETED_HABITS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function markHabitDeleted(id: string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const set = getDeletedHabitIds();
    set.add(id);
    window.localStorage.setItem(DELETED_HABITS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export function clearHabitDeletedMark(id: string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const set = getDeletedHabitIds();
    if (set.delete(id)) {
      window.localStorage.setItem(DELETED_HABITS_KEY, JSON.stringify(Array.from(set)));
    }
  } catch {}
}

export function clearAllDeletedMarks(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.removeItem(DELETED_HABITS_KEY);
  } catch {}
}

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
    window.dispatchEvent(new CustomEvent("dailyos_habits_updated"));
  } catch {}
}

export async function saveHabit(habit: Habit): Promise<void> {
  clearHabitDeletedMark(habit.id);
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

export async function deleteHabit(id: string, purgeLogs: boolean = false): Promise<void> {
  markHabitDeleted(id);
  try {
    const list = getCachedHabits().filter((h) => h.id !== id);
    setCachedHabits(list);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dailyos_habits_updated"));
    }
  } catch {}

  if (purgeLogs) {
    // Complete purge: delete habit record and all logged history for charts/calendar
    await db.transaction("rw", [db.habits, db.habit_logs, db.outbox], async () => {
      await db.habits.delete(id);
      await db.habit_logs.where("habitId").equals(id).delete();
      await db.outbox.add({
        table: "habits",
        op: "delete",
        row: { id },
        ts: Date.now(),
      });
      await db.outbox.add({
        table: "habit_logs",
        op: "delete",
        row: { habitId: id },
        ts: Date.now(),
      });
    });
  } else {
    // Soft delete / Archive: Keep past history intact!
    // Leaves all past habit_logs untouched for past streaks, heatmaps, charts and reports.
    const todayStr = new Date().toISOString().slice(0, 10);
    const existing = await db.habits.get(id);
    if (existing) {
      const updated: Habit = {
        ...existing,
        isActive: false,
        archivedAt: todayStr,
      };
      await db.habits.put(updated);
      try {
        await db.outbox.add({
          table: "habits",
          op: "update",
          row: updated,
          ts: Date.now(),
        });
      } catch {}
    } else {
      await db.habits.delete(id);
    }
  }
}

export async function restoreHabit(id: string): Promise<void> {
  clearHabitDeletedMark(id);
  const existing = await db.habits.get(id);
  if (existing) {
    const updated: Habit = {
      ...existing,
      isActive: true,
      archivedAt: undefined,
    };
    await db.habits.put(updated);
    try {
      const list = getCachedHabits();
      if (!list.some((h) => h.id === id)) {
        list.push(updated);
        setCachedHabits(list);
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dailyos_habits_updated"));
      }
    } catch {}
    try {
      await db.outbox.add({
        table: "habits",
        op: "update",
        row: updated,
        ts: Date.now(),
      });
    } catch {}
  }
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
  const deleted = getDeletedHabitIds();
  const cached = getCachedHabits();
  const dbHabits = await db.habits.toArray().catch(() => []);
  const map = new Map<string, Habit>();
  cached.forEach((h) => map.set(h.id, h));
  dbHabits.forEach((h) => map.set(h.id, h));

  // Preserve all habits (active and soft-deleted)
  const habits = Array.from(map.values()).map((h) => ({
    ...h,
    isActive: deleted.has(h.id) ? false : h.isActive,
  })).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

  const [habit_logs, sleep_logs, mood_logs, reflections, settings, edit_passes, streak_freezes] = await Promise.all([
    db.habit_logs.toArray().catch(() => []),
    db.sleep_logs.toArray().catch(() => []),
    db.mood_logs.toArray().catch(() => []),
    db.reflections.toArray().catch(() => []),
    db.settings.toArray().catch(() => []),
    db.edit_passes.toArray().catch(() => []),
    db.streak_freezes.toArray().catch(() => []),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    habits,
    deletedHabitIds: Array.from(deleted),
    habit_logs,
    sleep_logs,
    mood_logs,
    reflections,
    settings,
    edit_passes,
    streak_freezes,
  };
}

export async function importAllData(data: DailyOSExport): Promise<void> {
  if (!data || typeof data.version !== "number") {
    throw new Error("Invalid backup file: missing version field");
  }

  await db.transaction("rw", [db.habits, db.habit_logs, db.sleep_logs, db.mood_logs, db.reflections, db.settings, db.edit_passes, db.streak_freezes, db.outbox], async () => {
    if (data.habits?.length) await db.habits.bulkPut(data.habits);
    if (data.habit_logs?.length) await db.habit_logs.bulkPut(data.habit_logs);
    if (data.sleep_logs?.length) await db.sleep_logs.bulkPut(data.sleep_logs);
    if (data.mood_logs?.length) await db.mood_logs.bulkPut(data.mood_logs);
    if (data.reflections?.length) await db.reflections.bulkPut(data.reflections);
    if (data.settings?.length) await db.settings.bulkPut(data.settings);
    if (data.edit_passes?.length) await db.edit_passes.bulkPut(data.edit_passes);
    if (data.streak_freezes?.length) await db.streak_freezes.bulkPut(data.streak_freezes);
  });

  if (data.deletedHabitIds && Array.isArray(data.deletedHabitIds)) {
    data.deletedHabitIds.forEach((id) => markHabitDeleted(id));
  }

  if (data.habits && Array.isArray(data.habits)) {
    const deleted = getDeletedHabitIds();
    setCachedHabits(data.habits.filter((h) => h.isActive && !deleted.has(h.id)));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dailyos_habits_updated"));
    }
  }
}

export { useHabits } from "./useHabits";

// ==========================================
// EDIT PASSES & STREAK FREEZE HELPERS
// ==========================================

import { unlock as computeUnlock, weekStart as getWeekStart } from "./editPasses";

export async function getUnlockedDates(weekStartStr: string): Promise<string[]> {
  try {
    const records = await db.edit_passes.where("week_start").equals(weekStartStr).toArray();
    const dates = records.map((r) => r.date);
    for (const d of inMemoryUnlockedDates) {
      if (weekStart(d) === weekStartStr && !dates.includes(d)) {
        dates.push(d);
      }
    }
    return dates;
  } catch {
    return Array.from(inMemoryUnlockedDates).filter((d) => weekStart(d) === weekStartStr);
  }
}

export async function useEditPass(
  date: string,
  today: string
): Promise<{ ok: boolean; reason?: string; unlocked: string[] }> {
  const currentWeek = getWeekStart(today);
  const currentUnlocked = await getUnlockedDates(currentWeek);
  const result = computeUnlock(date, today, currentUnlocked);
  if (!result.ok) {
    return result;
  }
  markDateUnlocked(date);
  if (!currentUnlocked.includes(date)) {
    await db.edit_passes.put({
      id: `${currentWeek}_${date}`,
      week_start: currentWeek,
      date,
      used_at: new Date().toISOString(),
    });
  }
  return result;
}

export async function getFreezeTokens(monthStr?: string): Promise<{ available: number; usedDates: string[] }> {
  const currentMonth = monthStr || new Date().toISOString().slice(0, 7);
  try {
    const record = await db.streak_freezes.get(currentMonth);
    if (record) {
      return { available: record.available, usedDates: record.usedDates || [] };
    }
  } catch {}
  // Default: 2 available freezes per month
  return { available: 2, usedDates: [] };
}

export async function useFreezeToken(date: string): Promise<{ ok: boolean; error?: string }> {
  const currentMonth = date.slice(0, 7);
  const current = await getFreezeTokens(currentMonth);
  if (current.usedDates.includes(date)) {
    return { ok: true };
  }
  if (current.available <= 0) {
    return { ok: false, error: "No freeze tokens left for this month" };
  }
  const updatedUsed = [...current.usedDates, date];
  const updatedAvailable = current.available - 1;
  await db.streak_freezes.put({
    id: currentMonth,
    month: currentMonth,
    available: updatedAvailable,
    usedDates: updatedUsed,
    updatedAt: new Date().toISOString(),
  });
  return { ok: true };
}

export async function rewardCompletedWeekFreeze(monthStr?: string): Promise<boolean> {
  const currentMonth = monthStr || new Date().toISOString().slice(0, 7);
  const current = await getFreezeTokens(currentMonth);
  if (current.available >= 2) return false; // Capped at 2
  await db.streak_freezes.put({
    id: currentMonth,
    month: currentMonth,
    available: Math.min(2, current.available + 1),
    usedDates: current.usedDates,
    updatedAt: new Date().toISOString(),
  });
  return true;
}


