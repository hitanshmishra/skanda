-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New Query)
-- Adds the weight_logs table for tracking weekly weigh-ins

CREATE TABLE IF NOT EXISTS weight_logs (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  weight_lbs NUMERIC(6,2) NOT NULL,
  logged_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for fast user lookups sorted by date
CREATE INDEX IF NOT EXISTS weight_logs_user_date ON weight_logs(user_id, logged_at DESC);

-- Row-level security: users can only see and write their own logs
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own weight logs"
  ON weight_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
