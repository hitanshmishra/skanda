import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('[SKANDA] Supabase env vars missing — running in demo mode')
}

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null

// Demo users have id='demo' — all writes must be no-ops to avoid FK errors
const isDemo = (userId) => !userId || userId === 'demo'

// ── Auth helpers ─────────────────────────────────────────────────────────────

const PAUSED_MSG = 'Cannot reach the server — your Supabase project may be paused. Visit app.supabase.com to restore it, then try again.'

function isNetworkError(errOrMsg) {
  const m = (typeof errOrMsg === 'string' ? errOrMsg : errOrMsg?.message || '').toLowerCase()
  return m.includes('fetch') || m.includes('network') || m.includes('failed to fetch') || m.includes('load failed') || m.includes('timed out')
}

function withTimeout(promise, ms = 10000) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject({ message: 'Request timed out', paused: true }), ms)
  )
  return Promise.race([promise, timeout])
}

export async function signUp(email, password, name) {
  if (!supabase) return { error: { message: 'Demo mode — connect Supabase to persist data' } }
  try {
    const { data, error } = await withTimeout(
      supabase.auth.signUp({ email, password, options: { data: { name } } })
    )
    if (error && isNetworkError(error.message)) return { error: { message: PAUSED_MSG, paused: true } }
    return { data, error }
  } catch (err) {
    if (err.paused || isNetworkError(err)) return { error: { message: PAUSED_MSG, paused: true } }
    return { error: err }
  }
}

export async function signIn(email, password) {
  if (!supabase) return { error: { message: 'Demo mode — connect Supabase to persist data' } }
  try {
    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({ email, password })
    )
    if (error && isNetworkError(error.message)) return { error: { message: PAUSED_MSG, paused: true } }
    return { data, error }
  } catch (err) {
    if (err.paused || isNetworkError(err)) return { error: { message: PAUSED_MSG, paused: true } }
    return { error: err }
  }
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}

export function onAuthChange(cb) {
  if (!supabase) return () => {}
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => cb(session))
  return () => subscription.unsubscribe()
}

export async function getSession() {
  if (!supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function upsertProfile(userId, profile) {
  if (!supabase || isDemo(userId)) return { error: null }
  return supabase.from('profiles').upsert({ id: userId, ...profile, updated_at: new Date().toISOString() })
}

export async function getProfile(userId) {
  if (!supabase) return null
  try {
    const { data } = await withTimeout(
      supabase.from('profiles').select('*').eq('id', userId).single(),
      8000
    )
    return data
  } catch {
    return null
  }
}

// ── Fitness tests ─────────────────────────────────────────────────────────────

export async function saveFitnessTest(userId, testData) {
  if (!supabase || isDemo(userId)) return { error: null }
  return supabase.from('fitness_tests').insert({ user_id: userId, ...testData })
}

// ── Workout plans ─────────────────────────────────────────────────────────────

export async function saveWorkoutPlan(userId, plan) {
  if (!supabase || isDemo(userId)) return { data: [{ id: 'demo' }], error: null }
  return supabase.from('workout_plans').insert({ user_id: userId, ...plan }).select()
}

export async function getLatestPlan(userId) {
  if (!supabase) return null
  const { data } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return data
}

export async function getWorkoutPlans(userId, limit = 10) {
  if (!supabase) return []
  const { data } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}

// ── Workout sessions ──────────────────────────────────────────────────────────

export async function saveWorkoutSession(userId, session) {
  if (!supabase || isDemo(userId)) return { data: [{ id: 'demo' }], error: null }
  return supabase.from('workout_sessions').insert({ user_id: userId, ...session }).select()
}

export async function getRecentSessions(userId, limit = 10) {
  if (!supabase) return []
  const { data } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}

// ── Nutrition logs ────────────────────────────────────────────────────────────

export async function logNutrition(userId, entry) {
  if (!supabase || isDemo(userId)) return { error: null }
  return supabase.from('nutrition_logs').insert({ user_id: userId, ...entry })
}

export async function getTodayNutrition(userId) {
  if (!supabase) return null
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('nutrition_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', today)
    .order('created_at', { ascending: false })
  return data || []
}

// ── Weight logs ───────────────────────────────────────────────────────────────

export async function logWeightDB(userId, weightLbs) {
  if (!supabase || isDemo(userId)) return { error: null }
  return supabase.from('weight_logs').insert({ user_id: userId, weight_lbs: weightLbs })
}

export async function getWeightHistory(userId, limit = 12) {
  if (!supabase) return []
  const { data } = await supabase
    .from('weight_logs')
    .select('weight_lbs, logged_at')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false })
    .limit(limit)
  return data || []
}

// ── PR records ────────────────────────────────────────────────────────────────

export async function savePR(userId, exercise, weightLbs, reps) {
  if (!supabase || isDemo(userId)) return { error: null }
  return supabase.from('pr_records').insert({ user_id: userId, exercise_name: exercise, weight_lbs: weightLbs, reps })
}

export async function getPRs(userId) {
  if (!supabase) return []
  const { data } = await supabase
    .from('pr_records')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return data || []
}

// ── Home workout sessions ─────────────────────────────────────────────────────

export async function saveHomeWorkoutSession(userId, session) {
  if (!supabase || isDemo(userId)) return { data: [{ id: 'demo' }], error: null }
  return supabase.from('home_workout_sessions').insert({
    user_id:        userId,
    day_type:       session.day_type,
    exercises_json: session.exercises,
    duration_secs:  session.duration_secs,
    completed_at:   new Date().toISOString(),
  }).select()
}

export async function getRecentHomeWorkoutSessions(userId, limit = 5) {
  if (!supabase) return []
  const { data } = await supabase
    .from('home_workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(limit)
  return data || []
}

// ── Calisthenics skills ───────────────────────────────────────────────────────

export async function saveSkillProgress(userId, skillLevels) {
  if (!supabase || isDemo(userId)) return { error: null }
  return supabase.from('calisthenics_skills').upsert({
    user_id:      userId,
    skill_levels: skillLevels,
    updated_at:   new Date().toISOString(),
  })
}

export async function getSkillProgress(userId) {
  if (!supabase) return null
  const { data } = await supabase
    .from('calisthenics_skills')
    .select('skill_levels')
    .eq('user_id', userId)
    .single()
  return data?.skill_levels || null
}

// ── Cloud backup: body measurements ──────────────────────────────────────────

export async function cloudSaveMeasurement(userId, entry) {
  if (!supabase || isDemo(userId) || !entry?.id) return
  const { id, date, ...fields } = entry
  const { error } = await supabase.from('user_measurements').upsert({
    id,
    user_id:   userId,
    logged_at: date,
    ...fields,
  })
  if (error) console.warn('[SKANDA] measurement backup failed:', error.message)
}

export async function cloudGetMeasurements(userId) {
  if (!supabase || isDemo(userId)) return []
  const { data } = await supabase
    .from('user_measurements')
    .select('*')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false })
    .limit(52)
  return data || []
}

// ── Cloud backup: daily nutrition totals ─────────────────────────────────────

export async function cloudSaveNutritionDay(userId, date, totals) {
  if (!supabase || isDemo(userId)) return
  await supabase.from('nutrition_daily').upsert({
    user_id:    userId,
    date,
    calories:   Math.round(totals.calories || 0),
    protein:    Math.round(totals.protein  || 0),
    carbs:      Math.round(totals.carbs    || 0),
    fat:        Math.round(totals.fat      || 0),
    updated_at: new Date().toISOString(),
  })
}

export async function cloudGetNutritionDays(userId, days = 14) {
  if (!supabase || isDemo(userId)) return []
  const since = new Date(Date.now() - days * 86_400_000).toISOString().split('T')[0]
  const { data } = await supabase
    .from('nutrition_daily')
    .select('*')
    .eq('user_id', userId)
    .gte('date', since)
  return data || []
}

// ── Cloud backup: progress photos ────────────────────────────────────────────

export async function cloudSavePhoto(userId, photo) {
  if (!supabase || isDemo(userId)) return
  const { id, date, dataUrl, note } = photo
  await supabase.from('progress_photos').upsert({
    id,
    user_id:    userId,
    photo_data: dataUrl,
    note:       note || '',
    taken_at:   date,
  })
}

export async function cloudDeletePhoto(userId, id) {
  if (!supabase || isDemo(userId)) return
  await supabase.from('progress_photos').delete().eq('id', id).eq('user_id', userId)
}

export async function cloudGetPhotos(userId) {
  if (!supabase || isDemo(userId)) return []
  const { data } = await supabase
    .from('progress_photos')
    .select('id, photo_data, note, taken_at')
    .eq('user_id', userId)
    .order('taken_at', { ascending: false })
    .limit(20)
  return data || []
}
