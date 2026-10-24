-- Seed default habits: Workout, Study, AI, Book Listening, Video
INSERT INTO habits (id, label, sort_order, color_full, color_light, is_active, created_at) VALUES
  ('workout', 'Workout', 1, '#22c55e', '#86efac', 1, datetime('now')),
  ('study', 'Study', 2, '#22c55e', '#86efac', 1, datetime('now')),
  ('ai', 'AI', 3, '#22c55e', '#86efac', 1, datetime('now')),
  ('book', 'Book Listening', 4, '#22c55e', '#86efac', 1, datetime('now')),
  ('video', 'Video', 5, '#22c55e', '#86efac', 1, datetime('now'))
ON CONFLICT(id) DO NOTHING;

