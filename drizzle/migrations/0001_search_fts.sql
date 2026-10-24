-- FTS5 for daily_logs search; fallback to LIKE if FTS unavailable
CREATE VIRTUAL TABLE IF NOT EXISTS daily_logs_fts USING fts5(content, date, content='daily_logs', content_rowid='rowid', tokenize='porter unicode61');
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS daily_logs_ai AFTER INSERT ON daily_logs BEGIN INSERT INTO daily_logs_fts(rowid, content, date) VALUES (new.rowid, new.content, new.date); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS daily_logs_ad AFTER DELETE ON daily_logs BEGIN INSERT INTO daily_logs_fts(daily_logs_fts, rowid, content, date) VALUES('delete', old.rowid, old.content, old.date); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS daily_logs_au AFTER UPDATE ON daily_logs BEGIN INSERT INTO daily_logs_fts(daily_logs_fts, rowid, content, date) VALUES('delete', old.rowid, old.content, old.date); INSERT INTO daily_logs_fts(rowid, content, date) VALUES (new.rowid, new.content, new.date); END;
--> statement-breakpoint
INSERT INTO daily_logs_fts(rowid, content, date) SELECT rowid, content, date FROM daily_logs WHERE content != '';
