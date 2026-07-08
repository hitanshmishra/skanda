-- SKANDA Admin Analytics Migration
-- Run in Supabase SQL Editor (app.supabase.com → SQL Editor)

-- Aggregate stats function — SECURITY DEFINER bypasses RLS
-- Only callable by the admin email; all other authenticated users get an error
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Guard: only admin email may call this
  IF (auth.jwt() ->> 'email') != 'hitanshmishra10@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    'total_users',          (SELECT COUNT(*) FROM profiles),
    'tiers',                (
                              SELECT COALESCE(json_object_agg(tier, cnt), '{}')
                              FROM (
                                SELECT tier, COUNT(*) AS cnt
                                FROM profiles
                                GROUP BY tier
                              ) t
                            ),
    'gym_sessions_week',    (SELECT COUNT(*) FROM workout_sessions
                              WHERE created_at > NOW() - INTERVAL '7 days'),
    'home_sessions_week',   (SELECT COUNT(*) FROM home_workout_sessions
                              WHERE completed_at > NOW() - INTERVAL '7 days'),
    'gym_sessions_total',   (SELECT COUNT(*) FROM workout_sessions),
    'nutrition_logs_week',  (SELECT COUNT(*) FROM nutrition_logs
                              WHERE created_at > NOW() - INTERVAL '7 days'),
    'plans_total',          (SELECT COUNT(*) FROM workout_plans),
    'prs_total',            (SELECT COUNT(*) FROM pr_records),
    'active_users_week',    (SELECT COUNT(DISTINCT user_id) FROM workout_sessions
                              WHERE created_at > NOW() - INTERVAL '7 days'),
    'measurements_total',   (SELECT COUNT(*) FROM user_measurements),
    'photos_total',         (SELECT COUNT(*) FROM progress_photos),
    'new_users_week',       (SELECT COUNT(*) FROM profiles
                              WHERE created_at > NOW() - INTERVAL '7 days')
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_stats() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- User list function — returns email, name, tier, joined, last seen
-- Run this block in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (auth.jwt() ->> 'email') != 'hitanshmishra10@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN (
    SELECT COALESCE(json_agg(row_to_json(u)), '[]'::json)
    FROM (
      SELECT
        au.email,
        au.last_sign_in_at  AS last_seen,
        au.created_at       AS joined,
        p.name,
        p.tier
      FROM auth.users au
      LEFT JOIN public.profiles p ON p.id = au.id
      ORDER BY au.created_at DESC
      LIMIT 200
    ) u
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_users() TO authenticated;
