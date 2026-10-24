import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

// Asia/Kolkata is canonical timezone for date keys. Dates stored as YYYY-MM-DD strings in that TZ.
// Sleep bed_at/wake_at stored as ISO 8601 with offset.

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // 'me'
  passwordHash: text("password_hash").notNull(),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const habits = sqliteTable("habits", {
  id: text("id").primaryKey(), // workout | study | ai | book
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull(),
  colorFull: text("color_full").notNull().default("#22c55e"),
  colorLight: text("color_light").notNull().default("#86efac"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const habitLogs = sqliteTable(
  "habit_logs",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    habitId: text("habit_id")
      .notNull()
      .references(() => habits.id),
    date: text("date").notNull(), // YYYY-MM-DD Asia/Kolkata
    state: integer("state").notNull(), // 0 WHITE, 1 LIGHT RED, 2 RED
    updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    uniqueIndex("habit_logs_habit_date_idx").on(t.habitId, t.date),
    index("habit_logs_date_idx").on(t.date),
  ],
);

export const dailyLogs = sqliteTable(
  "daily_logs",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    date: text("date").notNull().unique(), // YYYY-MM-DD
    content: text("content").notNull().default(""),
    updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (t) => [index("daily_logs_date_idx").on(t.date)],
);

export const sleepLogs = sqliteTable(
  "sleep_logs",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    date: text("date").notNull().unique(), // wake date YYYY-MM-DD
    bedAt: text("bed_at").notNull(), // ISO with offset
    wakeAt: text("wake_at").notNull(), // ISO with offset
    durationMinutes: integer("duration_minutes").notNull(), // computed server-side
    updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (t) => [index("sleep_logs_date_idx").on(t.date)],
);

export const moodLogs = sqliteTable(
  "mood_logs",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    date: text("date").notNull().unique(), // YYYY-MM-DD
    score: integer("score").notNull(), // 1=Rough, 2=Low, 3=Okay, 4=Good, 5=Great
    tag: text("tag"), // optional thought/note
    updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (t) => [index("mood_logs_date_idx").on(t.date)],
);

export type HabitId = "workout" | "study" | "ai" | "book" | "video";
export type HabitState = 0 | 1 | 2; // 0 WHITE, 1 LIGHT, 2 FULL

// Scoring: RED=1, LIGHT=0.5, WHITE=0
export function habitScore(state: HabitState): number {
  if (state === 2) return 1;
  if (state === 1) return 0.5;
  return 0;
}

export function nextHabitState(current: HabitState): HabitState {
  // WHITE(0) -> GREEN(2) -> LIGHT GREEN(1) -> WHITE(0)
  if (current === 0) return 2;
  if (current === 2) return 1;
  return 0;
}
