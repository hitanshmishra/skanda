-- SKANDA Database Schema
-- Run this in the Supabase SQL editor: https://app.supabase.com → SQL Editor

-- ── Enable UUID extension ────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Profiles ─────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  name          text,
  age           int,
  weight_lbs    float,
  height_in     float,
  sex           text check (sex in ('male', 'female', 'other')),
  goal          text check (goal in ('muscle_gain', 'fat_loss', 'performance')),
  tier          text check (tier in ('arambha', 'veer', 'skanda')),
  tier_score    float,
  tier_label    text,
  nutrition_targets jsonb,
  test_data     jsonb,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users can read/write own profile"
  on profiles for all using (auth.uid() = id);

-- ── Fitness tests ─────────────────────────────────────────────────────────────
create table if not exists fitness_tests (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references profiles(id) on delete cascade,
  pushups     int,
  pullups     int,
  bench_lbs   float,
  squat_lbs   float,
  mile_secs   int,
  tier        text,
  tier_score  float,
  created_at  timestamptz default now()
);

alter table fitness_tests enable row level security;
create policy "Users can access own fitness tests"
  on fitness_tests for all using (auth.uid() = user_id);

-- ── Workout plans ─────────────────────────────────────────────────────────────
create table if not exists workout_plans (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references profiles(id) on delete cascade,
  week_number   int default 1,
  plan_json     jsonb not null,
  coaching_note text,
  created_at    timestamptz default now()
);

alter table workout_plans enable row level security;
create policy "Users can access own workout plans"
  on workout_plans for all using (auth.uid() = user_id);

-- ── Workout sessions ──────────────────────────────────────────────────────────
create table if not exists workout_sessions (
  id                 uuid default uuid_generate_v4() primary key,
  user_id            uuid references profiles(id) on delete cascade,
  plan_day_name      text,
  exercises_json     jsonb,
  total_volume_lbs   float default 0,
  duration_secs      int   default 0,
  prs_hit            int   default 0,
  created_at         timestamptz default now()
);

alter table workout_sessions enable row level security;
create policy "Users can access own sessions"
  on workout_sessions for all using (auth.uid() = user_id);

-- ── Nutrition logs ────────────────────────────────────────────────────────────
create table if not exists nutrition_logs (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references profiles(id) on delete cascade,
  meal_name   text,
  calories    float default 0,
  protein_g   float default 0,
  carbs_g     float default 0,
  fat_g       float default 0,
  created_at  timestamptz default now()
);

alter table nutrition_logs enable row level security;
create policy "Users can access own nutrition logs"
  on nutrition_logs for all using (auth.uid() = user_id);

-- ── PR records ────────────────────────────────────────────────────────────────
create table if not exists pr_records (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references profiles(id) on delete cascade,
  exercise_name text,
  weight_lbs    float,
  reps          int,
  created_at    timestamptz default now()
);

alter table pr_records enable row level security;
create policy "Users can access own PRs"
  on pr_records for all using (auth.uid() = user_id);

-- ── Indexes for performance ───────────────────────────────────────────────────
create index if not exists idx_workout_plans_user_created
  on workout_plans(user_id, created_at desc);

create index if not exists idx_workout_sessions_user_created
  on workout_sessions(user_id, created_at desc);

create index if not exists idx_nutrition_logs_user_created
  on nutrition_logs(user_id, created_at desc);

create index if not exists idx_pr_records_user_exercise
  on pr_records(user_id, exercise_name, created_at desc);

-- ── Home workout sessions ─────────────────────────────────────────────────────
create table if not exists home_workout_sessions (
  id             uuid default uuid_generate_v4() primary key,
  user_id        uuid references profiles(id) on delete cascade,
  day_type       text check (day_type in ('upper', 'lower', 'full')),
  exercises_json jsonb,
  duration_secs  int default 0,
  completed_at   timestamptz default now()
);

alter table home_workout_sessions enable row level security;
create policy "Users can access own home sessions"
  on home_workout_sessions for all using (auth.uid() = user_id);

create index if not exists idx_home_sessions_user_completed
  on home_workout_sessions(user_id, completed_at desc);

-- ── Calisthenics skill progress ───────────────────────────────────────────────
create table if not exists calisthenics_skills (
  id           uuid default uuid_generate_v4() primary key,
  user_id      uuid references profiles(id) on delete cascade unique,
  skill_levels jsonb not null default '{}',
  updated_at   timestamptz default now()
);

alter table calisthenics_skills enable row level security;
create policy "Users can access own skill progress"
  on calisthenics_skills for all using (auth.uid() = user_id);

-- ── Add home equipment column to profiles ─────────────────────────────────────
alter table profiles
  add column if not exists home_equipment jsonb
  default '{"pullup_bar":false,"resistance_bands":false,"dip_bars":false}';
