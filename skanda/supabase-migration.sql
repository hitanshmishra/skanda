-- SKANDA Cloud Backup Migration
-- Run this in your Supabase SQL Editor (app.supabase.com → SQL Editor)

-- ── Body measurements history ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_measurements (
  id          TEXT PRIMARY KEY,               -- timestamp string from client
  user_id     UUID REFERENCES auth.users NOT NULL,
  waist_in    REAL,
  chest_in    REAL,
  left_arm_in REAL,
  right_arm_in REAL,
  thighs_in   REAL,
  logged_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_measurements" ON user_measurements
  FOR ALL USING (auth.uid() = user_id);

-- ── Daily nutrition totals (for streaks) ──────────────────────────────────────
-- One row per user per day — UPSERT on (user_id, date)
CREATE TABLE IF NOT EXISTS nutrition_daily (
  user_id    UUID    REFERENCES auth.users NOT NULL,
  date       DATE    NOT NULL,
  calories   INTEGER,
  protein    INTEGER,
  carbs      INTEGER,
  fat        INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, date)
);

ALTER TABLE nutrition_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_nutrition_daily" ON nutrition_daily
  FOR ALL USING (auth.uid() = user_id);

-- ── Progress photos ───────────────────────────────────────────────────────────
-- photo_data stores compressed base64 JPEG (~50-150 KB each, max 20 per user)
CREATE TABLE IF NOT EXISTS progress_photos (
  id         TEXT PRIMARY KEY,               -- timestamp string from client
  user_id    UUID REFERENCES auth.users NOT NULL,
  photo_data TEXT NOT NULL,
  note       TEXT DEFAULT '',
  taken_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_photos" ON progress_photos
  FOR ALL USING (auth.uid() = user_id);
