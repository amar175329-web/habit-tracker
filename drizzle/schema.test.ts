import { describe, it, expect, beforeAll } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { eq } from "drizzle-orm";
import { sleepMinutes } from "../src/lib/sleep";
import { nextHabitState } from "../src/lib/habits";

describe("DB persistence & isolation", () => {
  let db: ReturnType<typeof drizzle>;

  beforeAll(() => {
    const sqlite = new Database(":memory:");
    sqlite.exec(`
      CREATE TABLE users (id TEXT PRIMARY KEY, password_hash TEXT NOT NULL, timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata', created_at TEXT NOT NULL);
      CREATE TABLE habits (id TEXT PRIMARY KEY, label TEXT NOT NULL, sort_order INTEGER NOT NULL, color_full TEXT NOT NULL DEFAULT '#22c55e', color_light TEXT NOT NULL DEFAULT '#86efac', is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
      CREATE TABLE habit_logs (id TEXT PRIMARY KEY, habit_id TEXT NOT NULL REFERENCES habits(id), date TEXT NOT NULL, state INTEGER NOT NULL, updated_at TEXT NOT NULL, UNIQUE(habit_id, date));
      CREATE INDEX habit_logs_date_idx ON habit_logs(date);
      CREATE UNIQUE INDEX habit_logs_habit_date_idx ON habit_logs(habit_id, date);
      CREATE TABLE daily_logs (id TEXT PRIMARY KEY, date TEXT NOT NULL UNIQUE, content TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL);
      CREATE INDEX daily_logs_date_idx ON daily_logs(date);
      CREATE TABLE sleep_logs (id TEXT PRIMARY KEY, date TEXT NOT NULL UNIQUE, bed_at TEXT NOT NULL, wake_at TEXT NOT NULL, duration_minutes INTEGER NOT NULL, updated_at TEXT NOT NULL);
      CREATE INDEX sleep_logs_date_idx ON sleep_logs(date);
    `);
    db = drizzle(sqlite, { schema });

    // seed 4 habits — must be Workout/Study/AI/Book, NOT English/EI
    db.insert(schema.habits).values([
      { id: "workout", label: "Workout", sortOrder: 1 },
      { id: "study", label: "Study", sortOrder: 2 },
      { id: "ai", label: "AI", sortOrder: 3 },
      { id: "book", label: "Book Listening", sortOrder: 4 },
    ]).run();
  });

  it("seed has exactly 4 habits with correct labels (AI not English/EI)", () => {
    const habits = db.select().from(schema.habits).all();
    expect(habits).toHaveLength(4);
    expect(habits.map(h => h.id).sort()).toEqual(["ai", "book", "study", "workout"]);
    expect(habits.find(h => h.id === "ai")!.label).toBe("AI");
    expect(habits.find(h => h.id === "book")!.label).toBe("Book Listening");
    expect(habits.some(h => h.label.includes("English") || h.label.includes("EI"))).toBe(false);
  });

  it("habit 3-state cycle persists and isolates by date", () => {
    // 2026-09-01: workout = RED(2)
    db.insert(schema.habitLogs).values({ habitId: "workout", date: "2026-09-01", state: 2 }).run();
    // 2026-09-01: study = LIGHT(1)
    db.insert(schema.habitLogs).values({ habitId: "study", date: "2026-09-01", state: 1 }).run();
    // 2026-09-02: workout = WHITE(0) -> not inserted, query should return 0
    const logsSep01 = db.select().from(schema.habitLogs).all().filter(r => r.date === "2026-09-01");
    const logsSep02 = db.select().from(schema.habitLogs).all().filter(r => r.date === "2026-09-02");
    expect(logsSep01).toHaveLength(2);
    expect(logsSep02).toHaveLength(0);
    // cycle logic: WHITE->RED->LIGHT->WHITE
    expect(nextHabitState(0)).toBe(2);
    expect(nextHabitState(2)).toBe(1);
    expect(nextHabitState(1)).toBe(0);
  });

  it("sleep duration correctly stored and crosses midnight (wake date)", () => {
    const bedAt = "2026-09-01T23:45:00+05:30";
    const wakeAt = "2026-09-02T07:15:00+05:30";
    const mins = sleepMinutes(bedAt, wakeAt); // 450
    expect(mins).toBe(450);
    db.insert(schema.sleepLogs).values({
      date: "2026-09-02", // wake date
      bedAt,
      wakeAt,
      durationMinutes: mins,
    }).run();
    const row = db.select().from(schema.sleepLogs).where(eq(schema.sleepLogs.date, "2026-09-02")).get();
    expect(row!.durationMinutes).toBe(450);
    expect(row!.bedAt).toBe(bedAt);
    // Different date must not leak
    const other = db.select().from(schema.sleepLogs).where(eq(schema.sleepLogs.date, "2026-09-01")).get();
    expect(other).toBeUndefined();
  });

  it("daily log isolated by date", () => {
    db.insert(schema.dailyLogs).values({ date: "2026-09-02", content: "What happened today: studied AI" }).run();
    db.insert(schema.dailyLogs).values({ date: "2026-09-01", content: "Yesterday stuff" }).run();
    const sep02 = db.select().from(schema.dailyLogs).where(eq(schema.dailyLogs.date, "2026-09-02")).get();
    const sep01 = db.select().from(schema.dailyLogs).where(eq(schema.dailyLogs.date, "2026-09-01")).get();
    expect(sep02!.content).toContain("studied AI");
    expect(sep01!.content).toContain("Yesterday");
    expect(sep02!.content).not.toBe(sep01!.content);
  });
});
