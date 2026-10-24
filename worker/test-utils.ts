import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

// Minimal D1-compatible mock wrapping better-sqlite3
export function createMockD1() {
  const sqlite = new Database(":memory:");

  // Apply migration SQL
  for (const fname of ["0000_fair_sentinel.sql", "0001_search_fts.sql", "0002_add_video_and_mood.sql"]) {
    const migrationPath = path.join(process.cwd(), `drizzle/migrations/${fname}`);
    if (!fs.existsSync(migrationPath)) continue;
    const raw = fs.readFileSync(migrationPath, "utf-8");
    const statements = raw.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      try { sqlite.exec(stmt); } catch (e: any) { /* fts may fail on older sqlite - ignore and fallback to LIKE */ }
    }
  }

  // Seed habits — Workout/Study/AI/Book/Video — GREEN theme
  sqlite.exec(`
    INSERT INTO habits (id, label, sort_order, color_full, color_light, is_active, created_at) VALUES
      ('workout', 'Workout', 1, '#22c55e', '#86efac', 1, datetime('now')),
      ('study', 'Study', 2, '#22c55e', '#86efac', 1, datetime('now')),
      ('ai', 'AI', 3, '#22c55e', '#86efac', 1, datetime('now')),
      ('book', 'Book Listening', 4, '#22c55e', '#86efac', 1, datetime('now')),
      ('video', 'Video', 5, '#22c55e', '#86efac', 1, datetime('now'))
    ON CONFLICT(id) DO NOTHING;
  `);

  const mock = {
    _sqlite: sqlite,
    prepare(sql: string) {
      let stmt: any;
      try {
        stmt = sqlite.prepare(sql);
      } catch (e) {
        throw e;
      }
      const make = (...params: any[]) => ({
        all: async () => {
          const rows = stmt.all(...params);
          return { results: rows, success: true };
        },
        first: async () => {
          const row = stmt.get(...params);
          return row ?? null;
        },
        run: async () => {
          const info = stmt.run(...params);
          return { success: true, meta: { changes: info.changes, last_row_id: info.lastInsertRowid } };
        },
      });
      return {
        bind(...params: any[]) {
          return make(...params);
        },
        // D1 also allows .all()/.first()/.run() without bind for no-param queries
        all: async () => {
          const rows = stmt.all();
          return { results: rows, success: true };
        },
        first: async () => {
          const row = stmt.get();
          return row ?? null;
        },
        run: async () => {
          const info = stmt.run();
          return { success: true, meta: { changes: info.changes, last_row_id: info.lastInsertRowid } };
        },
      };
    },
    batch(statements: any[]) {
      // Not used in our routes, but implement for drizzle
      return Promise.all(statements.map((s: any) => s.all ? s.all() : s.run()));
    },
    exec(sql: string) {
      return Promise.resolve(sqlite.exec(sql));
    },
  };

  return mock as unknown as D1Database & { _sqlite: typeof sqlite };
}

export const TEST_ENV = {
  APP_TZ: "Asia/Kolkata",
  APP_PASSWORD_HASH: "$2b$10$LpFevy1e2TVhVa.uDaFCveZ1xYB.eS/MA8iXLcHEnmiwxl1w9TpWa", // dailyos
  APP_JWT_SECRET: "dev-jwt-secret-32chars-for-local-only-12345",
  DEV_PASSWORD_HASH: "$2b$10$LpFevy1e2TVhVa.uDaFCveZ1xYB.eS/MA8iXLcHEnmiwxl1w9TpWa",
  DEV_JWT_SECRET: "dev-jwt-secret-32chars-for-local-only-12345",
};
