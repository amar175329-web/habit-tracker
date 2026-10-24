import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { sign, verify } from "hono/jwt";
import bcrypt from "bcryptjs";
import { db } from "../lib/db.js";
import { env } from "../lib/env.js";

type Bindings = {
  DB?: any;
  APP_TZ: string;
  APP_PASSWORD_HASH: string;
  APP_JWT_SECRET: string;
  DEV_PASSWORD_HASH?: string;
  DEV_JWT_SECRET?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

const VALID_HABITS = new Set(["workout", "study", "ai", "book", "video"]);
const VALID_STATES = new Set([0, 1, 2]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateKey(s: string) {
  return DATE_RE.test(s);
}
function todayKeyAsia(tz = "Asia/Kolkata"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function isFutureDate(dateKey: string, tz = "Asia/Kolkata"): boolean {
  // lexical YYYY-MM-DD comparison works because ISO
  return dateKey > todayKeyAsia(tz);
}

function sleepMinutes(bedAt: string, wakeAt: string): number {
  const bed = new Date(bedAt);
  const wake = new Date(wakeAt);
  if (Number.isNaN(bed.getTime()) || Number.isNaN(wake.getTime())) throw new Error("Invalid datetime");
  let diff = wake.getTime() - bed.getTime();
  if (diff < 0) diff += 24 * 3600 * 1000;
  return Math.round(diff / 60000);
}

function getDb(c?: any) {
  return c?.env?.DB || db;
}

function getPasswordHash(c?: any) {
  return c?.env?.APP_PASSWORD_HASH || c?.env?.DEV_PASSWORD_HASH || env("APP_PASSWORD_HASH") || env("DEV_PASSWORD_HASH");
}

function getJwtSecret(c?: any): string {
  const secret = c?.env?.APP_JWT_SECRET || c?.env?.DEV_JWT_SECRET || env("APP_JWT_SECRET") || env("DEV_JWT_SECRET");
  if (!secret) {
    throw new Error("APP_JWT_SECRET is required but not set in environment or bindings");
  }
  return secret;
}

let dbMigrationDone = false;
let dbInitPromise: Promise<void> | null = null;
function ensureDbInitialized(database: any): Promise<void> {
  if (dbMigrationDone) return Promise.resolve();
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      try {
        const seedHabit = database.prepare(
          `INSERT INTO habits (id, label, sort_order, color_full, color_light, is_active, created_at) VALUES ('video', 'Video', 5, '#22c55e', '#86efac', 1, datetime('now')) ON CONFLICT(id) DO NOTHING`
        );
        const createMood = database.prepare(
          `CREATE TABLE IF NOT EXISTS mood_logs (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL UNIQUE,
            score INTEGER NOT NULL,
            tag TEXT,
            updated_at TEXT NOT NULL
          )`
        );
        const idx1 = database.prepare(`CREATE INDEX IF NOT EXISTS habit_logs_date_idx ON habit_logs(date)`);
        const idx2 = database.prepare(`CREATE INDEX IF NOT EXISTS daily_logs_date_idx ON daily_logs(date)`);
        const idx3 = database.prepare(`CREATE INDEX IF NOT EXISTS sleep_logs_date_idx ON sleep_logs(date)`);
        const idx4 = database.prepare(`CREATE INDEX IF NOT EXISTS mood_logs_date_idx ON mood_logs(date)`);

        if (typeof database.batch === "function") {
          await database.batch([seedHabit, createMood, idx1, idx2, idx3, idx4]).catch(() => {});
        } else {
          await seedHabit.run().catch(() => {});
          await createMood.run().catch(() => {});
          await idx1.run().catch(() => {});
          await idx2.run().catch(() => {});
          await idx3.run().catch(() => {});
          await idx4.run().catch(() => {});
        }
        dbMigrationDone = true;
      } catch {
        // Ignore if table/constraint already exists or in read-only environment
      }
    })();
  }
  return dbInitPromise;
}

async function authMiddleware(c: any, next: any) {
  let token = getCookie(c, "token");
  if (!token) {
    const authHeader = c.req.header("Authorization") || c.req.header("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }
  }
  if (!token) return c.json({ error: "Unauthorized" }, 401);
  try {
    const payload = await verify(token, getJwtSecret(c), "HS256");
    // exp check is done by verify; ensure sub
    if (!payload || (payload as any).sub !== "me") throw new Error("bad sub");
    // set user in context
    c.set("user", payload);
    await next();
  } catch {
    return c.json({ error: "Unauthorized" }, 401);
  }
}

app.get("/api/health", async (c) => {
  let dbOk = false;
  try {
    const database = getDb(c);
    await ensureDbInitialized(database);
    const raw = await database.prepare("SELECT COUNT(*) as c FROM habits").first();
    dbOk = Number((raw as any)?.c) >= 0;
  } catch {
    dbOk = false;
  }
  return c.json({
    ok: true,
    db: dbOk,
    tz: env("APP_TZ", "Asia/Kolkata"),
    time: new Date().toISOString(),
  });
});

// Auth — login (public)
app.post("/api/auth/login", async (c) => {
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const password = body.password as string | undefined;
  if (!password) return c.json({ error: "Password required" }, 400);

  const hash = getPasswordHash(c);
  if (!hash) return c.json({ error: "Server misconfigured: no password hash" }, 500);

  const ok = await bcrypt.compare(password, hash);
  if (!ok) return c.json({ error: "Invalid password" }, 401);

  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: "me", iat: now, exp: now + 7 * 24 * 3600 };
  const token = await sign(payload, getJwtSecret(c), "HS256");

  // Secure true in production (https), false for local http
  const isSecure = c.req.url.startsWith("https://") || c.req.header("x-forwarded-proto") === "https";
  setCookie(c, "token", token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "Lax",
    path: "/",
    maxAge: 7 * 24 * 3600,
  });

  return c.json({ ok: true, token });
});

app.post("/api/auth/logout", (c) => {
  deleteCookie(c, "token", { path: "/" });
  return c.json({ ok: true });
});

app.get("/api/auth/me", authMiddleware, (c) => {
  return c.json({ authenticated: true, tz: env("APP_TZ", "Asia/Kolkata") });
});

// Protected routes use authMiddleware per-route

// Habits list (protected)
app.get("/api/habits", authMiddleware, async (c) => {
  try {
    const database = getDb(c);
    if (!dbMigrationDone) ensureDbInitialized(database).catch(() => {});
    const habitsRes = await database.prepare(
      "SELECT id, label, sort_order as sortOrder, color_full as colorFull, color_light as colorLight, is_active as isActive, created_at as createdAt FROM habits ORDER BY sort_order"
    ).all();
    const habits = (habitsRes as any).results ?? habitsRes;
    return c.json({ habits });
  } catch (e) {
    return c.json({ error: String(e).slice(0, 500) }, 500);
  }
});

// Day aggregate — protected
app.get("/api/day/:date", authMiddleware, async (c) => {
  const date = c.req.param("date");
  if (!isValidDateKey(date)) return c.json({ error: "Invalid date YYYY-MM-DD" }, 400);

  try {
    const database = getDb(c);
    if (!dbMigrationDone) ensureDbInitialized(database).catch(() => {});

    const habitsStmt = database.prepare("SELECT id, label, sort_order as sortOrder, color_full as colorFull, color_light as colorLight, is_active as isActive, created_at as createdAt FROM habits ORDER BY sort_order");
    const logsStmt = database.prepare("SELECT id, habit_id as habitId, date, state, updated_at as updatedAt FROM habit_logs WHERE date = ?").bind(date);
    const dailyStmt = database.prepare("SELECT id, date, content, updated_at as updatedAt FROM daily_logs WHERE date = ?").bind(date);
    const sleepStmt = database.prepare("SELECT id, date, bed_at as bedAt, wake_at as wakeAt, duration_minutes as durationMinutes, updated_at as updatedAt FROM sleep_logs WHERE date = ?").bind(date);
    const moodStmt = database.prepare("SELECT id, date, score, tag, updated_at as updatedAt FROM mood_logs WHERE date = ?").bind(date);

    let habitsRes: any, logsRes: any, dailyRes: any, sleepRes: any, moodRes: any;
    if (typeof database.batch === "function") {
      try {
        [habitsRes, logsRes, dailyRes, sleepRes, moodRes] = await database.batch([habitsStmt, logsStmt, dailyStmt, sleepStmt, moodStmt]);
      } catch {
        [habitsRes, logsRes, dailyRes, sleepRes, moodRes] = await Promise.all([
          habitsStmt.all(),
          logsStmt.all(),
          dailyStmt.first(),
          sleepStmt.first(),
          moodStmt.first().catch(() => null),
        ]);
      }
    } else {
      [habitsRes, logsRes, dailyRes, sleepRes, moodRes] = await Promise.all([
        habitsStmt.all(),
        logsStmt.all(),
        dailyStmt.first(),
        sleepStmt.first(),
        moodStmt.first().catch(() => null),
      ]);
    }

    const habits = (habitsRes as any)?.results ?? (habitsRes as any)?.rows ?? habitsRes;
    const logs = (logsRes as any)?.results ?? (logsRes as any)?.rows ?? logsRes ?? [];
    const daily = (dailyRes as any)?.rows ? (dailyRes as any).rows[0] : ((dailyRes as any)?.results ? (dailyRes as any).results[0] : dailyRes);
    const sleep = (sleepRes as any)?.rows ? (sleepRes as any).rows[0] : ((sleepRes as any)?.results ? (sleepRes as any).results[0] : sleepRes);
    const mood = (moodRes as any)?.rows ? (moodRes as any).rows[0] : ((moodRes as any)?.results ? (moodRes as any).results[0] : moodRes);

    c.header("Cache-Control", "private, max-age=60, stale-while-revalidate=300");
    return c.json({
      date,
      habits,
      habitLogs: logs,
      dailyLog: (daily as any) ?? null,
      sleepLog: (sleep as any) ?? null,
      moodLog: (mood as any) ?? null,
    });
  } catch (e) {
    return c.json({ error: String(e).slice(0, 500) }, 500);
  }
});

// Range — authenticated, validated, efficient
app.get("/api/days", authMiddleware, async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");
  if (!from || !to) return c.json({ error: "from and to required (YYYY-MM-DD)" }, 400);
  if (!isValidDateKey(from) || !isValidDateKey(to)) return c.json({ error: "Invalid date YYYY-MM-DD" }, 400);
  if (from > to) return c.json({ error: "from must be <= to" }, 400);
  // Limit range to 400 days to protect DB
  const fromD = new Date(`${from}T00:00:00`);
  const toD = new Date(`${to}T00:00:00`);
  const diffDays = Math.round((toD.getTime() - fromD.getTime()) / (86400000)) + 1;
  if (diffDays > 400) return c.json({ error: "Range too large (max 400 days)" }, 400);
  if (diffDays <= 0) return c.json({ error: "Invalid range" }, 400);

  try {
    const database = getDb(c);
    if (!dbMigrationDone) {
      ensureDbInitialized(database).catch(() => {});
    }

    const include = c.req.query("include");
    const habitsStmt = database.prepare("SELECT id, label, sort_order as sortOrder, color_full as colorFull, color_light as colorLight, is_active as isActive, created_at as createdAt FROM habits ORDER BY sort_order");
    const habitLogsStmt = database.prepare("SELECT id, habit_id as habitId, date, state, updated_at as updatedAt FROM habit_logs WHERE date BETWEEN ? AND ? ORDER BY date, habit_id").bind(from, to);

    let habitsRes: any, habitLogsRes: any, dailyRes: any, sleepRes: any, moodRes: any;
    if (include === "habits") {
      if (typeof database.batch === "function") {
        try {
          [habitsRes, habitLogsRes] = await database.batch([habitsStmt, habitLogsStmt]);
        } catch {
          [habitsRes, habitLogsRes] = await Promise.all([habitsStmt.all(), habitLogsStmt.all()]);
        }
      } else {
        [habitsRes, habitLogsRes] = await Promise.all([habitsStmt.all(), habitLogsStmt.all()]);
      }
    } else {
      const dailyStmt = database.prepare("SELECT id, date, content, updated_at as updatedAt FROM daily_logs WHERE date BETWEEN ? AND ? ORDER BY date").bind(from, to);
      const sleepStmt = database.prepare("SELECT id, date, bed_at as bedAt, wake_at as wakeAt, duration_minutes as durationMinutes, updated_at as updatedAt FROM sleep_logs WHERE date BETWEEN ? AND ? ORDER BY date").bind(from, to);
      const moodStmt = database.prepare("SELECT id, date, score, tag, updated_at as updatedAt FROM mood_logs WHERE date BETWEEN ? AND ? ORDER BY date").bind(from, to);

      if (typeof database.batch === "function") {
        try {
          [habitsRes, habitLogsRes, dailyRes, sleepRes, moodRes] = await database.batch([
            habitsStmt,
            habitLogsStmt,
            dailyStmt,
            sleepStmt,
            moodStmt,
          ]);
        } catch {
          [habitsRes, habitLogsRes, dailyRes, sleepRes, moodRes] = await Promise.all([
            habitsStmt.all(),
            habitLogsStmt.all(),
            dailyStmt.all(),
            sleepStmt.all(),
            moodStmt.all().catch(() => ({ results: [] })),
          ]);
        }
      } else {
        [habitsRes, habitLogsRes, dailyRes, sleepRes, moodRes] = await Promise.all([
          habitsStmt.all(),
          habitLogsStmt.all(),
          dailyStmt.all(),
          sleepStmt.all(),
          moodStmt.all().catch(() => ({ results: [] })),
        ]);
      }
    }

    const habits = (habitsRes as any).results ?? habitsRes;
    const habitLogs = (habitLogsRes as any).results ?? habitLogsRes ?? [];
    const dailyRows = (dailyRes as any)?.results ?? dailyRes ?? [];
    const sleepRows = (sleepRes as any)?.results ?? sleepRes ?? [];
    const moodRows = (moodRes as any)?.results ?? moodRes ?? [];

    // Build map date -> {habitLogs, dailyLog, sleepLog, moodLog}
    const byDate: Record<string, { habitLogs: any[]; dailyLog: any | null; sleepLog: any | null; moodLog: any | null }> = {};
    for (let d = new Date(`${from}T12:00:00`); d <= new Date(`${to}T12:00:00`); d.setDate(d.getDate() + 1)) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const key = `${y}-${m}-${day}`;
      byDate[key] = { habitLogs: [], dailyLog: null, sleepLog: null, moodLog: null };
    }
    for (const r of habitLogs) {
      if (byDate[r.date]) byDate[r.date].habitLogs.push(r);
    }
    for (const r of dailyRows) {
      if (byDate[r.date]) byDate[r.date].dailyLog = r;
    }
    for (const r of sleepRows) {
      if (byDate[r.date]) byDate[r.date].sleepLog = r;
    }
    for (const r of moodRows) {
      if (byDate[r.date]) byDate[r.date].moodLog = r;
    }

    const days = Object.keys(byDate)
      .sort()
      .map((date) => ({ date, ...byDate[date] }));

    c.header("Cache-Control", "private, max-age=60, stale-while-revalidate=86400");
    return c.json({ from, to, habits, days });
  } catch (e) {
    return c.json({ error: String(e).slice(0, 500) }, 500);
  }
});

// Lightweight Yearly Consistency — only habits & habit logs (instant, low bandwidth, 0ms render)
app.get("/api/habits/consistency", authMiddleware, async (c) => {
  const yearStr = c.req.query("year") || String(new Date().getFullYear());
  const year = parseInt(yearStr, 10);
  if (isNaN(year) || year < 2000 || year > 2100) {
    return c.json({ error: "Invalid year" }, 400);
  }
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;

  try {
    const database = getDb(c);
    if (!dbMigrationDone) {
      ensureDbInitialized(database).catch(() => {});
    }

    const habitsStmt = database.prepare(
      "SELECT id, label, sort_order as sortOrder, color_full as colorFull, color_light as colorLight, is_active as isActive, created_at as createdAt FROM habits ORDER BY sort_order"
    );
    const habitLogsStmt = database.prepare(
      "SELECT id, habit_id as habitId, date, state, updated_at as updatedAt FROM habit_logs WHERE date BETWEEN ? AND ? ORDER BY date, habit_id"
    ).bind(from, to);

    let habitsRes: any, habitLogsRes: any;
    if (typeof database.batch === "function") {
      try {
        [habitsRes, habitLogsRes] = await database.batch([habitsStmt, habitLogsStmt]);
      } catch {
        [habitsRes, habitLogsRes] = await Promise.all([habitsStmt.all(), habitLogsStmt.all()]);
      }
    } else {
      [habitsRes, habitLogsRes] = await Promise.all([habitsStmt.all(), habitLogsStmt.all()]);
    }

    const habits = (habitsRes as any).results ?? habitsRes;
    const habitLogs = (habitLogsRes as any).results ?? habitLogsRes ?? [];

    const byDate: Record<string, any[]> = {};
    for (let d = new Date(`${from}T12:00:00`); d <= new Date(`${to}T12:00:00`); d.setDate(d.getDate() + 1)) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      byDate[`${y}-${m}-${day}`] = [];
    }
    for (const r of habitLogs) {
      if (byDate[r.date]) byDate[r.date].push(r);
    }

    const days = Object.keys(byDate)
      .sort()
      .map((date) => ({
        date,
        habitLogs: byDate[date],
        dailyLog: null,
        sleepLog: null,
        moodLog: null,
      }));

    c.header("Cache-Control", "private, max-age=120, stale-while-revalidate=86400");
    return c.json({ year, from, to, habits, days });
  } catch (e) {
    return c.json({ error: String(e).slice(0, 500) }, 500);
  }
});

// PATCH habit state — protected
async function handleHabitLog(c: any) {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const { date, habitId, state } = body as { date: string; habitId: string; state: number };
  if (!date || !isValidDateKey(date)) return c.json({ error: "Invalid or missing date YYYY-MM-DD" }, 400);
  if (isFutureDate(date, env("APP_TZ", "Asia/Kolkata"))) return c.json({ error: "Future date is locked — will unlock when that date arrives (Asia/Kolkata)" }, 403);
  if (!habitId || !VALID_HABITS.has(habitId)) return c.json({ error: "Invalid habitId. Must be workout|study|ai|book|video" }, 400);
  if (!VALID_STATES.has(state)) return c.json({ error: "Invalid state. Must be 0|1|2" }, 400);

  try {
    const database = getDb(c);
    await ensureDbInitialized(database);
    const now = new Date().toISOString();
    if (state === 0) {
      await database.prepare("DELETE FROM habit_logs WHERE habit_id = ? AND date = ?").bind(habitId, date).run();
      return c.json({ ok: true, deleted: true, date, habitId, state });
    }
    const id = crypto.randomUUID();
    // Upsert: ON CONFLICT(habit_id, date) DO UPDATE
    await database.prepare(
      `INSERT INTO habit_logs (id, habit_id, date, state, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(habit_id, date) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at`
    ).bind(id, habitId, date, state, now).run();

    const row = await database.prepare("SELECT id, habit_id as habitId, date, state, updated_at as updatedAt FROM habit_logs WHERE habit_id = ? AND date = ?").bind(habitId, date).first();
    return c.json({ ok: true, habitLog: row });
  } catch (e) {
    return c.json({ error: String(e).slice(0, 500) }, 500);
  }
}
app.patch("/api/habit-logs", authMiddleware, handleHabitLog);
app.post("/api/habit-logs", authMiddleware, handleHabitLog);
// GET fallback for networks that block PATCH/POST/PUT (e.g., some mobile carriers/WAF)
app.get("/api/habit-logs/set", authMiddleware, async (c) => {
  const date = c.req.query("date") || "";
  const habitId = c.req.query("habitId") || "";
  const state = Number(c.req.query("state"));
  // delegate to same logic via synthetic body
  return handleHabitLog({ req: { json: async () => ({ date, habitId, state }) }, env: c.env, json: c.json.bind(c) } as any);
});

// PUT daily log — protected
async function handleDailyLog(c: any) {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const { date, content } = body as { date: string; content: string };
  if (!date || !isValidDateKey(date)) return c.json({ error: "Invalid or missing date YYYY-MM-DD" }, 400);
  if (isFutureDate(date, env("APP_TZ", "Asia/Kolkata"))) return c.json({ error: "Future date is locked — will unlock when that date arrives (Asia/Kolkata)" }, 403);
  if (content !== undefined && typeof content !== "string") return c.json({ error: "content must be string" }, 400);

  try {
    const database = getDb(c);
    await ensureDbInitialized(database);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const safeContent = content ?? "";
    await database.prepare(
      `INSERT INTO daily_logs (id, date, content, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at`
    ).bind(id, date, safeContent, now).run();

    const row = await database.prepare("SELECT id, date, content, updated_at as updatedAt FROM daily_logs WHERE date = ?").bind(date).first();
    return c.json({ ok: true, dailyLog: row });
  } catch (e) {
    return c.json({ error: String(e).slice(0, 500) }, 500);
  }
}
app.put("/api/daily-log", authMiddleware, handleDailyLog);
app.post("/api/daily-log", authMiddleware, handleDailyLog);
app.get("/api/daily-log/set", authMiddleware, async (c) => {
  const date = c.req.query("date") || "";
  const content = c.req.query("content") || "";
  return handleDailyLog({ req: { json: async () => ({ date, content }) }, env: c.env, json: c.json.bind(c) } as any);
});

// PUT sleep log — protected
async function handleSleepLog(c: any) {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const { date, bedAt, wakeAt } = body as { date: string; bedAt: string; wakeAt: string };
  if (!date || !isValidDateKey(date)) return c.json({ error: "Invalid or missing date YYYY-MM-DD (wake date)" }, 400);
  if (isFutureDate(date, env("APP_TZ", "Asia/Kolkata"))) return c.json({ error: "Future date is locked — will unlock when that date arrives (Asia/Kolkata)" }, 403);
  if (!bedAt || !wakeAt) return c.json({ error: "bedAt and wakeAt required (ISO)" }, 400);

  let minutes: number;
  try {
    minutes = sleepMinutes(bedAt, wakeAt);
  } catch {
    return c.json({ error: "Invalid bedAt/wakeAt datetime" }, 400);
  }
  if (minutes < 0 || minutes > 24 * 60) return c.json({ error: "Duration must be 0-1440 minutes" }, 400);
  if (Number.isNaN(minutes)) return c.json({ error: "Invalid duration" }, 400);

  try {
    const database = getDb(c);
    await ensureDbInitialized(database);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    await database.prepare(
      `INSERT INTO sleep_logs (id, date, bed_at, wake_at, duration_minutes, updated_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET bed_at = excluded.bed_at, wake_at = excluded.wake_at, duration_minutes = excluded.duration_minutes, updated_at = excluded.updated_at`
    ).bind(id, date, bedAt, wakeAt, minutes, now).run();

    const row = await database.prepare("SELECT id, date, bed_at as bedAt, wake_at as wakeAt, duration_minutes as durationMinutes, updated_at as updatedAt FROM sleep_logs WHERE date = ?").bind(date).first();
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return c.json({ ok: true, sleepLog: row, label: `${h}h ${m}m`, minutes });
  } catch (e) {
    return c.json({ error: String(e).slice(0, 500) }, 500);
  }
}
app.put("/api/sleep-log", authMiddleware, handleSleepLog);
app.post("/api/sleep-log", authMiddleware, handleSleepLog);
app.get("/api/sleep-log/set", authMiddleware, async (c) => {
  const date = c.req.query("date") || "";
  const bedAt = c.req.query("bedAt") || "";
  const wakeAt = c.req.query("wakeAt") || "";
  return handleSleepLog({ req: { json: async () => ({ date, bedAt, wakeAt }) }, env: c.env, json: c.json.bind(c) } as any);
});

// PUT / POST mood log — protected
async function handleMoodLog(c: any) {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const { date, score, tag } = body as { date: string; score: number; tag?: string };
  if (!date || !isValidDateKey(date)) return c.json({ error: "Invalid or missing date YYYY-MM-DD" }, 400);
  if (isFutureDate(date, env("APP_TZ", "Asia/Kolkata"))) return c.json({ error: "Future date is locked — will unlock when that date arrives (Asia/Kolkata)" }, 403);
  if (typeof score !== "number" || score < 1 || score > 5) return c.json({ error: "Score must be between 1 and 5" }, 400);

  try {
    const database = getDb(c);
    await ensureDbInitialized(database);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const safeTag = tag ? String(tag).slice(0, 500) : null;
    await database.prepare(
      `INSERT INTO mood_logs (id, date, score, tag, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET score = excluded.score, tag = excluded.tag, updated_at = excluded.updated_at`
    ).bind(id, date, Math.round(score), safeTag, now).run();

    const row = await database.prepare("SELECT id, date, score, tag, updated_at as updatedAt FROM mood_logs WHERE date = ?").bind(date).first();
    return c.json({ ok: true, moodLog: row });
  } catch (e) {
    return c.json({ error: String(e).slice(0, 500) }, 500);
  }
}
app.put("/api/mood-log", authMiddleware, handleMoodLog);
app.post("/api/mood-log", authMiddleware, handleMoodLog);
app.get("/api/mood-log/set", authMiddleware, async (c) => {
  const date = c.req.query("date") || "";
  const score = Number(c.req.query("score"));
  const tag = c.req.query("tag") || undefined;
  return handleMoodLog({ req: { json: async () => ({ date, score, tag }) }, env: c.env, json: c.json.bind(c) } as any);
});

// Search daily logs — authenticated
app.get("/api/search", authMiddleware, async (c) => {
  const q = (c.req.query("q") || "").trim();
  const from = c.req.query("from");
  const to = c.req.query("to");
  if (!q || q.length < 2) return c.json({ error: "q required (min 2 chars)" }, 400);
  if (q.length > 100) return c.json({ error: "q too long (max 100)" }, 400);
  if (from && !isValidDateKey(from)) return c.json({ error: "Invalid from YYYY-MM-DD" }, 400);
  if (to && !isValidDateKey(to)) return c.json({ error: "Invalid to YYYY-MM-DD" }, 400);
  if (from && to && from > to) return c.json({ error: "from must be <= to" }, 400);

  try {
    const database = getDb(c);
    await ensureDbInitialized(database);
    let rows: any[] = [];
    try {
      const ftsQuery = q.replace(/"/g, '""');
      let sql = `SELECT d.date, d.content, d.updated_at as updatedAt FROM daily_logs_fts f JOIN daily_logs d ON d.rowid = f.rowid WHERE daily_logs_fts MATCH ?`;
      const params: any[] = [ftsQuery];
      if (from) { sql += ` AND d.date >= ?`; params.push(from); }
      if (to) { sql += ` AND d.date <= ?`; params.push(to); }
      sql += ` ORDER BY d.date DESC LIMIT 50`;
      const res = await database.prepare(sql).bind(...params).all();
      rows = (res as any).results ?? [];
    } catch {
      const like = `%${q}%`;
      let sql = `SELECT date, content, updated_at as updatedAt FROM daily_logs WHERE content LIKE ?`;
      const params: any[] = [like];
      if (from) { sql += ` AND date >= ?`; params.push(from); }
      if (to) { sql += ` AND date <= ?`; params.push(to); }
      sql += ` ORDER BY date DESC LIMIT 50`;
      const res = await database.prepare(sql).bind(...params).all();
      rows = (res as any).results ?? [];
    }

    const results = rows.map((r: any) => {
      const idx = r.content.toLowerCase().indexOf(q.toLowerCase());
      let snippet = r.content;
      if (idx !== -1) {
        const start = Math.max(0, idx - 40);
        const end = Math.min(r.content.length, idx + q.length + 40);
        snippet = (start > 0 ? "…" : "") + r.content.slice(start, end) + (end < r.content.length ? "…" : "");
      } else {
        snippet = r.content.slice(0, 80) + (r.content.length > 80 ? "…" : "");
      }
      return { date: r.date, snippet, content: r.content, updatedAt: r.updatedAt };
    });

    return c.json({ q, from: from || null, to: to || null, results, fts: true });
  } catch (e) {
    return c.json({ error: String(e).slice(0, 500) }, 500);
  }
});

// Export JSON — authenticated
app.get("/api/export", authMiddleware, async (c) => {
  try {
    const database = getDb(c);
    await ensureDbInitialized(database);
    const habitsRes = await database.prepare("SELECT id, label, sort_order as sortOrder, color_full as colorFull, color_light as colorLight FROM habits ORDER BY sort_order").all();
    const habits = (habitsRes as any).results ?? habitsRes ?? [];
    const habitLogsRes = await database.prepare("SELECT id, habit_id as habitId, date, state, updated_at as updatedAt FROM habit_logs ORDER BY date, habit_id").all();
    const habitLogs = (habitLogsRes as any).results ?? habitLogsRes ?? [];
    const dailyRes = await database.prepare("SELECT id, date, content, updated_at as updatedAt FROM daily_logs ORDER BY date").all();
    const dailyLogs = (dailyRes as any).results ?? dailyRes ?? [];
    const sleepRes = await database.prepare("SELECT id, date, bed_at as bedAt, wake_at as wakeAt, duration_minutes as durationMinutes, updated_at as updatedAt FROM sleep_logs ORDER BY date").all();
    const sleepLogs = (sleepRes as any).results ?? sleepRes ?? [];
    const moodRes = await database.prepare("SELECT id, date, score, tag, updated_at as updatedAt FROM mood_logs ORDER BY date").all().catch(() => ({ results: [] }));
    const moodLogs = (moodRes as any).results ?? moodRes ?? [];
    const exportDate = new Date().toISOString().slice(0, 10);
    return c.json({
      exportDate,
      timezone: "Asia/Kolkata",
      habits,
      habitLogs,
      dailyLogs,
      sleepLogs,
      moodLogs,
    });
  } catch (e) {
    return c.json({ error: String(e).slice(0, 500) }, 500);
  }
});

// Export CSV — authenticated, habit-oriented
app.get("/api/export.csv", authMiddleware, async (c) => {
  try {
    const database = getDb(c);
    await ensureDbInitialized(database);
    const habitLogsRes = await database.prepare("SELECT habit_id as habitId, date, state FROM habit_logs ORDER BY date").all();
    const habitLogs = (habitLogsRes as any).results ?? habitLogsRes ?? [];
    const dailyRes = await database.prepare("SELECT date, content FROM daily_logs").all();
    const dailyRows = (dailyRes as any).results ?? dailyRes ?? [];
    const dailyMap: Record<string, string> = {};
    for (const r of dailyRows) dailyMap[r.date] = r.content;
    const sleepRes = await database.prepare("SELECT date, duration_minutes as durationMinutes FROM sleep_logs").all();
    const sleepRows = (sleepRes as any).results ?? sleepRes ?? [];
    const sleepMap: Record<string, number> = {};
    for (const r of sleepRows) sleepMap[r.date] = r.durationMinutes;
    const moodRes = await database.prepare("SELECT date, score FROM mood_logs").all().catch(() => ({ results: [] }));
    const moodRows = (moodRes as any).results ?? moodRes ?? [];
    const moodMap: Record<string, number> = {};
    for (const r of moodRows) moodMap[r.date] = r.score;

    // Collect all dates
    const allDates = new Set<string>();
    for (const r of habitLogs) allDates.add(r.date);
    for (const r of dailyRows) allDates.add(r.date);
    for (const r of sleepRows) allDates.add(r.date);
    for (const r of moodRows) allDates.add(r.date);
    const sorted = Array.from(allDates).sort();

    // Build CSV with video & mood
    const header = "date,workout,study,ai,book,video,mood,sleep_minutes,daily_log_words\n";
    const lines = [header];
    for (const date of sorted) {
      const getState = (hid: string) => {
        const l = habitLogs.find((x: any) => x.date === date && x.habitId === hid);
        return l ? l.state : 0;
      };
      const words = dailyMap[date] ? dailyMap[date].trim().split(/\s+/).filter(Boolean).length : 0;
      const mins = sleepMap[date] ?? "";
      const moodVal = moodMap[date] ?? "";
      lines.push(`${date},${getState("workout")},${getState("study")},${getState("ai")},${getState("book")},${getState("video")},${moodVal},${mins},${words}\n`);
    }

    c.header("Content-Type", "text/csv; charset=utf-8");
    c.header("Content-Disposition", `attachment; filename="daily-os-${new Date().toISOString().slice(0, 10)}.csv"`);
    return c.text(lines.join(""));
  } catch (e) {
    return c.json({ error: String(e).slice(0, 500) }, 500);
  }
});

// Legacy sleep calc (public for compat)
app.post("/api/sleep/calc", async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const { bedAt, wakeAt } = body;
  if (!bedAt || !wakeAt) return c.json({ error: "bedAt and wakeAt required" }, 400);
  try {
    const minutes = sleepMinutes(bedAt, wakeAt);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return c.json({ minutes, label: `${h}h ${m}m` });
  } catch {
    return c.json({ error: "Invalid datetime" }, 400);
  }
});

export default app;
