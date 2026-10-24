-- Migration 0002: Add Video habit and mood_logs table
INSERT INTO habits (id, label, sort_order, color_full, color_light, is_active, created_at)
VALUES ('video', 'Video', 5, '#22c55e', '#86efac', 1, datetime('now'))
ON CONFLICT(id) DO NOTHING;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS mood_logs (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  score INTEGER NOT NULL,
  tag TEXT,
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS mood_logs_date_idx ON mood_logs (date);
