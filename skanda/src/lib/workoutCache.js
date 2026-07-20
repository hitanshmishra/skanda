// Offline-first workout session cache using localStorage
// The day's workout is cached locally so sessions work without connectivity

const CACHE_KEY    = 'skanda_active_session'
const PLAN_KEY     = 'skanda_cached_plan'
const PROFILE_KEY  = 'skanda_profile_cache'
const USAGE_KEY    = 'skanda_usage'

// ── Trial system ─────────────────────────────────────────────────────────────
// 30-day full-access trial. After expiry the post-trial free limits apply.

const TRIAL_KEY = 'skanda_trial_start'
const TRIAL_DAYS = 30

export function initTrial() {
  // Only set once — the day the user completes Six Trials for the first time
  if (!localStorage.getItem(TRIAL_KEY)) {
    localStorage.setItem(TRIAL_KEY, Date.now().toString())
  }
}

export function getTrialStart() {
  const v = localStorage.getItem(TRIAL_KEY)
  return v ? parseInt(v) : null
}

export function isTrialActive() {
  const start = getTrialStart()
  if (!start) return true   // trial not yet started → first-run, treat as active
  return (Date.now() - start) / 86_400_000 < TRIAL_DAYS
}

// Returns days left in trial (0 if expired, 30 if not started)
export function getTrialDaysLeft() {
  const start = getTrialStart()
  if (!start) return TRIAL_DAYS
  return Math.max(0, Math.ceil(TRIAL_DAYS - (Date.now() - start) / 86_400_000))
}

export function trialExpired() {
  const start = getTrialStart()
  if (!start) return false
  return (Date.now() - start) / 86_400_000 >= TRIAL_DAYS
}

// ── Post-trial free limits ────────────────────────────────────────────────────
// These only apply AFTER the 30-day trial ends.
// Tighter than the old limits — the "loss" vs unlimited trial drives upgrades.
export const FREE_LIMITS = {
  scansPerWeek:   3,   // was unlimited during trial → noticeable downgrade
  insightsPerDay: 1,   // was unlimited during trial → very noticeable
  planEvolutions: 0,   // Pro only after trial — this is the #1 upsell lever
}

// Returns Monday 00:00 UTC of the current week as a timestamp string
function thisWeekKey() {
  const now = new Date()
  const day = now.getUTCDay()                  // 0=Sun, 1=Mon…
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - ((day + 6) % 7))  // roll back to Monday
  monday.setUTCHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]    // e.g. "2024-01-15"
}

function todayKey() {
  return new Date().toISOString().split('T')[0]
}

function getUsage() {
  try {
    return JSON.parse(localStorage.getItem(USAGE_KEY) || '{}')
  } catch { return {} }
}

function saveUsage(u) {
  localStorage.setItem(USAGE_KEY, JSON.stringify(u))
}

// ── Scan credits ──────────────────────────────────────────────────────────────

export function getScansRemaining() {
  if (isTrialActive()) return Infinity          // unlimited during trial
  const u    = getUsage()
  const week = thisWeekKey()
  if (u.scanWeek !== week) return FREE_LIMITS.scansPerWeek
  return Math.max(0, FREE_LIMITS.scansPerWeek - (u.scanCount || 0))
}

export function consumeScan() {
  if (isTrialActive()) return true              // never gate during trial
  const u    = getUsage()
  const week = thisWeekKey()
  if (u.scanWeek !== week) {
    saveUsage({ ...u, scanWeek: week, scanCount: 1 })
    return true
  }
  if ((u.scanCount || 0) >= FREE_LIMITS.scansPerWeek) return false
  saveUsage({ ...u, scanWeek: week, scanCount: (u.scanCount || 0) + 1 })
  return true
}

export function refundScan() {
  if (isTrialActive()) return                     // nothing to refund during trial
  const u = getUsage()
  const week = thisWeekKey()
  if (u.scanWeek === week && (u.scanCount || 0) > 0) {
    saveUsage({ ...u, scanCount: u.scanCount - 1 })
  }
}

// ── Oracle insight credits ────────────────────────────────────────────────────

export function getInsightsRemaining() {
  if (isTrialActive()) return Infinity          // unlimited during trial
  const u   = getUsage()
  const day = todayKey()
  if (u.insightDay !== day) return FREE_LIMITS.insightsPerDay
  return Math.max(0, FREE_LIMITS.insightsPerDay - (u.insightCount || 0))
}

export function consumeInsight() {
  if (isTrialActive()) return true              // never gate during trial
  const u   = getUsage()
  const day = todayKey()
  if (u.insightDay !== day) {
    saveUsage({ ...u, insightDay: day, insightCount: 1 })
    return true
  }
  if ((u.insightCount || 0) >= FREE_LIMITS.insightsPerDay) return false
  saveUsage({ ...u, insightDay: day, insightCount: (u.insightCount || 0) + 1 })
  return true
}

// ── Plan evolution credits ────────────────────────────────────────────────────

export function getEvolutionsUsed() {
  if (isTrialActive()) return 0                 // always allowed during trial
  return getUsage().evolutionsUsed || 0
}

export function consumeEvolution() {
  if (isTrialActive()) return 0   // don't burn free-tier credit during trial
  const u = getUsage()
  const used = (u.evolutionsUsed || 0) + 1
  saveUsage({ ...u, evolutionsUsed: used })
  return used
}

// ── Active session ────────────────────────────────────────────────────────────

export function cacheSession(session) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ ...session, cachedAt: Date.now() }))
}

export function getCachedSession() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function clearSession() {
  localStorage.removeItem(CACHE_KEY)
}

// ── Plan cache ────────────────────────────────────────────────────────────────

export function cachePlan(plan) {
  localStorage.setItem(PLAN_KEY, JSON.stringify({ plan, cachedAt: Date.now() }))
}

export function getCachedPlan() {
  try {
    const raw = localStorage.getItem(PLAN_KEY)
    if (!raw) return null
    const { plan } = JSON.parse(raw)
    return plan || null
  } catch { return null }
}

// Returns days since current plan was cached (null if no plan)
export function getPlanAgeDays() {
  try {
    const raw = localStorage.getItem(PLAN_KEY)
    if (!raw) return null
    const { cachedAt } = JSON.parse(raw)
    return Math.floor((Date.now() - cachedAt) / 86_400_000)
  } catch { return null }
}

// ── Profile cache ─────────────────────────────────────────────────────────────

export function cacheProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export function getCachedProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function clearProfile() {
  localStorage.removeItem(PROFILE_KEY)
  localStorage.removeItem(PLAN_KEY)
  localStorage.removeItem(CACHE_KEY)
}

// ── Weight log (offline / demo) ───────────────────────────────────────────────

const WEIGHT_LOG_KEY = 'skanda_weight_log'

export function logWeightLocal(weightLbs) {
  const logs = getWeightLogsLocal()
  const entry = { weight_lbs: parseFloat(weightLbs), logged_at: new Date().toISOString() }
  localStorage.setItem(WEIGHT_LOG_KEY, JSON.stringify([entry, ...logs].slice(0, 104))) // 2 yrs weekly
  return entry
}

export function getWeightLogsLocal() {
  try { return JSON.parse(localStorage.getItem(WEIGHT_LOG_KEY) || '[]') }
  catch { return [] }
}

// Returns true when it's been 7+ days since the last log (or never logged)
export function needsWeighIn() {
  const logs = getWeightLogsLocal()
  if (logs.length === 0) return true
  const daysSince = (Date.now() - new Date(logs[0].logged_at).getTime()) / 86_400_000
  return daysSince >= 7
}

// ── Exercise history (previous weights memory) ───────────────────────────────
// Keyed by lowercase exercise name → { weight, reps, date }
// Used to pre-fill set rows and show "Last: X lbs × Y reps" hints.

const EX_HISTORY_KEY = 'skanda_ex_history'

export function getExerciseLast(exerciseName) {
  try {
    const h = JSON.parse(localStorage.getItem(EX_HISTORY_KEY) || '{}')
    return h[exerciseName.trim().toLowerCase()] || null
  } catch { return null }
}

export function saveExerciseLogs(exerciseName, logs) {
  if (!logs?.length) return
  // Save the top-weight set so the hint reflects the best effort
  const best = logs.reduce((b, l) => ((l?.weight || 0) > (b?.weight || 0) ? l : b), null)
  if (!best?.weight) return
  try {
    const h = JSON.parse(localStorage.getItem(EX_HISTORY_KEY) || '{}')
    h[exerciseName.trim().toLowerCase()] = { weight: best.weight, reps: best.reps, date: new Date().toISOString() }
    localStorage.setItem(EX_HISTORY_KEY, JSON.stringify(h))
  } catch {}
}

// ── Streak tracking ───────────────────────────────────────────────────────────

const STREAK_KEY = 'skanda_streak'

export function getStreak() {
  try {
    return JSON.parse(localStorage.getItem(STREAK_KEY) || '{"current":0,"longest":0,"lastDate":null}')
  } catch { return { current: 0, longest: 0, lastDate: null } }
}

export function updateStreak() {
  const s = getStreak()
  const today = todayKey()
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]
  if (s.lastDate === today) return s  // already counted today
  const newCurrent = s.lastDate === yesterday ? (s.current || 0) + 1 : 1
  const longest = Math.max(newCurrent, s.longest || 0)
  const updated = { current: newCurrent, longest, lastDate: today }
  localStorage.setItem(STREAK_KEY, JSON.stringify(updated))
  return updated
}

// ── Tier helpers ──────────────────────────────────────────────────────────────

export function calculateTier(data) {
  const { pushups, pullups, bench_lbs, squat_lbs, mile_secs, weight_lbs } = data
  let score = 0

  // Push-ups (0-25 pts)
  if (pushups >= 50) score += 25
  else if (pushups >= 35) score += 18
  else if (pushups >= 20) score += 10
  else score += pushups * 0.3

  // Pull-ups (0-25 pts)
  if (pullups >= 15) score += 25
  else if (pullups >= 8) score += 18
  else if (pullups >= 4) score += 10
  else score += pullups * 1.5

  // Bench ratio (0-20 pts)
  if (weight_lbs > 0) {
    const benchRatio = bench_lbs / weight_lbs
    if (benchRatio >= 1.5) score += 20
    else if (benchRatio >= 1.0) score += 14
    else if (benchRatio >= 0.75) score += 8
    else score += benchRatio * 8
  }

  // Squat ratio (0-20 pts)
  if (weight_lbs > 0) {
    const squatRatio = squat_lbs / weight_lbs
    if (squatRatio >= 2.0) score += 20
    else if (squatRatio >= 1.5) score += 14
    else if (squatRatio >= 1.0) score += 8
    else score += squatRatio * 6
  }

  // Mile time (0-10 pts)
  const mileMins = mile_secs / 60
  if (mileMins <= 6.0) score += 10
  else if (mileMins <= 7.0) score += 8
  else if (mileMins <= 8.0) score += 5
  else if (mileMins <= 10.0) score += 2

  const rounded = Math.round(score * 10) / 10

  if (rounded >= 70) return { tier: 'skanda',  score: rounded, label: 'SKANDA',  subtitle: 'The God Tier' }
  if (rounded >= 45) return { tier: 'veer',    score: rounded, label: 'VEER',    subtitle: 'The Brave Warrior' }
  return                     { tier: 'arambha', score: rounded, label: 'ARAMBHA', subtitle: 'The Beginning' }
}

export function getNutritionTargets(weightLbs, goal) {
  const protein = Math.round(weightLbs * 1.0)
  let calories
  if (goal === 'muscle_gain')   calories = Math.round(weightLbs * 18)
  else if (goal === 'fat_loss') calories = Math.round(weightLbs * 13)
  else                          calories = Math.round(weightLbs * 15)

  const fat = Math.round(weightLbs * 0.38)
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4))
  return { calories, protein_g: protein, carbs_g: carbs, fat_g: fat }
}

// ── Local plan adapter (no API needed) ───────────────────────────────────────
// Fallback for adaptWeeklyPlan when Claude API is unavailable or over quota.
// Applies real progressive overload rules: rep progression → set addition → deload.

export function adaptPlanLocally({ currentPlan, sessions, totalVolume, prsHit }) {
  const weekNum          = (currentPlan.week_number || 1) + 1
  const sessionsComplete = sessions.length
  const planDays         = currentPlan.days?.length || 4
  const goodWeek         = sessionsComplete / Math.max(planDays, 1) >= 0.75

  const changes = []

  // Deload every 4th week — reduce volume by ~40% to let the body supercompensate
  const isDeload = weekNum % 4 === 0

  const days = (currentPlan.days || []).map(day => ({
    ...day,
    exercises: (day.exercises || []).map(ex => {
      if (isDeload) {
        // Deload: drop to 60% of sets, keep reps the same
        const deloadSets = Math.max(2, Math.round(ex.sets * 0.6))
        if (deloadSets !== ex.sets) {
          changes.push(`${ex.name}: Reduced to ${deloadSets} sets (planned deload week — recovery drives adaptation)`)
        }
        return { ...ex, sets: deloadSets }
      }

      if (!goodWeek) return ex   // missed too many sessions → hold load, no progression

      // Double-progression: push rep range up first, then add weight (reflected as +1 set here)
      let newReps = ex.reps
      let newSets = ex.sets

      if (typeof ex.reps === 'string' && ex.reps.includes('-')) {
        const [lo, hi] = ex.reps.split('-').map(Number)
        if (hi < lo + 6) {
          // Still room to progress reps
          newReps = `${lo + 1}-${hi + 1}`
          changes.push(`${ex.name}: Rep range → ${newReps} (double-progression: push reps before adding load)`)
        } else {
          // Rep ceiling hit — add a set instead
          newSets = ex.sets + 1
          newReps = `${lo - 2}-${hi - 2}`   // reset rep range slightly
          changes.push(`${ex.name}: +1 set, rep range reset to ${newReps} (rep ceiling reached → volume increase)`)
        }
      } else if (weekNum % 2 === 0) {
        newSets = Math.min(ex.sets + 1, 6)
        changes.push(`${ex.name}: +1 set (even-week volume block)`)
      }

      return { ...ex, reps: newReps, sets: newSets }
    }),
  }))

  if (changes.length === 0) {
    changes.push('Holding current load — focus on tempo and mind-muscle connection this week')
    changes.push('Missed sessions limit progression — consistency is the prerequisite for overload')
  }

  const coachingNote = isDeload
    ? `Week ${weekNum} — Planned deload. Volume is down intentionally. Your nervous system and connective tissue recover now, then you come back stronger. Do not skip this week.`
    : goodWeek
    ? `Week ${weekNum} — Strong compliance last week (${sessionsComplete}/${planDays} sessions). Progressive overload applied. Keep the same intensity — the adaptations are compounding.`
    : `Week ${weekNum} — Only ${sessionsComplete}/${planDays} sessions last week. Load held constant. Hit every session this week before progression resumes.`

  return {
    ...currentPlan,
    week_number: weekNum,
    days,
    coaching_note: coachingNote,
    changes_from_last_week: changes.slice(0, 6),
    generated_locally: true,
  }
}

// ── Avatar ────────────────────────────────────────────────────────────────────
const AVATAR_KEY = 'skanda_avatar'
export function getAvatar() { return localStorage.getItem(AVATAR_KEY) || null }
export function saveAvatar(dataUrl) { localStorage.setItem(AVATAR_KEY, dataUrl) }
export function clearAvatar() { localStorage.removeItem(AVATAR_KEY) }

// ── Nutrition day log (streak + weekly summary) ───────────────────────────────
// Stores rolling 14-day record: { "YYYY-MM-DD": { calories, protein, carbs, fat } }

const NUTR_LOG_KEY = 'skanda_nutrition_daily'

export function saveNutritionDay(totals) {
  const today = new Date().toISOString().split('T')[0]
  if (!totals.calories && !totals.protein) return
  try {
    const log = JSON.parse(localStorage.getItem(NUTR_LOG_KEY) || '{}')
    log[today] = totals
    // Prune entries older than 14 days
    const cutoff = new Date(Date.now() - 14 * 86_400_000).toISOString().split('T')[0]
    Object.keys(log).forEach(k => { if (k < cutoff) delete log[k] })
    localStorage.setItem(NUTR_LOG_KEY, JSON.stringify(log))
  } catch {}
}

export function getNutritionStreak() {
  try {
    const log = JSON.parse(localStorage.getItem(NUTR_LOG_KEY) || '{}')
    let streak = 0
    const d = new Date()
    // Allow today OR yesterday to be the most recent logged day
    const todayKey = d.toISOString().split('T')[0]
    const d1 = new Date(d); d1.setDate(d1.getDate() - 1)
    const yesterdayKey = d1.toISOString().split('T')[0]
    let cursor = log[todayKey] ? new Date(d) : (log[yesterdayKey] ? new Date(d1) : null)
    if (!cursor) return 0
    while (true) {
      const key = cursor.toISOString().split('T')[0]
      if (!log[key]) break
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }
    return streak
  } catch { return 0 }
}

export function getWeeklyNutritionSummary(calorieTarget = 2000, proteinTarget = 150) {
  try {
    const log = JSON.parse(localStorage.getItem(NUTR_LOG_KEY) || '{}')
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000)
      const key = d.toISOString().split('T')[0]
      if (log[key]) days.push({ date: key, ...log[key] })
    }
    if (days.length === 0) return null
    const avgCalories  = Math.round(days.reduce((s, d) => s + (d.calories || 0), 0) / days.length)
    const proteinHits  = days.filter(d => (d.protein || 0) >= proteinTarget * 0.9).length
    const bestDay      = days.reduce((best, d) => (!best || (d.protein || 0) > (best.protein || 0)) ? d : best, null)
    const loggedDays   = days.length
    return { avgCalories, proteinHits, loggedDays, bestDay, calorieTarget }
  } catch { return null }
}

// ── Local Oracle insight (no API needed) ─────────────────────────────────────
// Rotates daily so it never feels stale. Falls back to this when Claude is down.

export function getLocalInsight({ goal, protein = 0 }) {
  const banks = {
    muscle_gain: [
      `Progressive overload is the only variable that guarantees growth. If you are not adding weight or reps every 1-2 weeks, something in your recovery is broken — fix sleep or food first.`,
      `Protein synthesis peaks at roughly 0.7-1g per pound of bodyweight. At ${protein}g today, ${protein < 120 ? 'you are under target — this single habit outweighs any training variable' : 'you are on track — stay consistent through the weekend'}.`,
      `The warriors who build the most muscle sleep the most. 7-9 hours is when you actually grow. Training is just the signal.`,
      `Compound lifts — squat, bench, deadlift, row — account for 80% of your results. Do not let accessory work crowd them out.`,
      `A slight caloric surplus (200-300 kcal above maintenance) maximises muscle gain while minimising fat accumulation. Eating at maintenance builds almost nothing.`,
    ],
    fat_loss: [
      `A 300-500 calorie deficit is the optimal range. Aggressive cuts destroy the muscle you worked to build. Slow cuts win.`,
      `Protein intake during a cut is more critical than during a bulk. High protein protects muscle tissue when calories are low. Do not drop it.`,
      `The scale lies short-term — water, sodium, and glycogen fluctuate by 2-4 lbs daily. Track weekly averages, not daily numbers.`,
      `Strength training during a cut preserves muscle and keeps your metabolism elevated. Cardio is a tool, not the strategy.`,
      `Hunger is not an emergency. It is a signal that often passes within 20 minutes. Delay, hydrate, then decide.`,
    ],
    performance: [
      `Zone 2 cardio (conversational pace, 60-70% max HR) builds the aerobic engine that powers all other performance. Most people do none of it.`,
      `Speed and power are neural skills — they require fresh legs, not fatigued ones. Always train them first in a session, never at the end.`,
      `Recovery is not passive. Cold exposure, deliberate breathing, and sleep quality actively accelerate CNS restoration between hard sessions.`,
      `Mobility work done consistently for 10 minutes daily produces more performance gains than most people get from an extra training session.`,
      `Your one-rep maxes are a lagging indicator. Track speed of movement at submaximal loads — when bar speed drops, fatigue is accumulating.`,
    ],
  }
  const arr = banks[goal] || banks.muscle_gain
  // Rotate by day so it changes every 24 hours
  return arr[Math.floor(Date.now() / 86_400_000) % arr.length]
}

// ── Local plan generator (no API needed) ─────────────────────────────────────
// Used as fallback when Claude API is unavailable or over quota.

export function generateLocalPlan({ tier, goal, weight, daysPerWeek }) {
  const isElite     = tier === 'skanda'
  const isInter     = tier === 'veer'

  const reps  = (lo, hi) => `${lo}-${hi}`
  const rest  = (s) => s

  const push = {
    day_name: 'Push Day', focus: 'Chest · Shoulders · Triceps',
    exercises: [
      { name: 'Barbell Bench Press',      sets: isElite ? 5 : 4, reps: isElite ? reps(4,6)  : reps(8,10),  rest_secs: rest(180), cue: 'Drive feet into floor. Bar to lower chest. Full lockout.' },
      { name: 'Overhead Press',           sets: 4,               reps: isElite ? reps(5,7)  : reps(8,12),  rest_secs: rest(150), cue: 'Brace core. Bar in front of face on the way down.' },
      { name: 'Incline Dumbbell Press',   sets: 3,               reps: reps(10,12),                        rest_secs: rest(120), cue: 'Control the descent. Elbows at 45°.' },
      { name: 'Lateral Raises',           sets: 4,               reps: reps(12,15),                        rest_secs: rest(60),  cue: 'Lead with elbows. Slight forward lean.' },
      { name: 'Tricep Pushdowns',         sets: 3,               reps: reps(12,15),                        rest_secs: rest(60),  cue: 'Lock upper arms. Full extension at bottom.' },
    ],
  }
  const pull = {
    day_name: 'Pull Day', focus: 'Back · Biceps',
    exercises: [
      { name: 'Deadlift',                  sets: isElite ? 5 : 4, reps: isElite ? reps(3,5) : reps(5,7),   rest_secs: rest(240), cue: 'Hips hinge, bar over mid-foot, push floor away.' },
      { name: 'Pull-ups',                  sets: 4,               reps: isElite ? reps(6,8) : reps(5,8),   rest_secs: rest(150), cue: 'Dead hang start. Chin clearly over bar.' },
      { name: 'Barbell Row',               sets: 3,               reps: reps(8,10),                        rest_secs: rest(120), cue: 'Chest up, pull to lower stomach, squeeze at top.' },
      { name: 'Face Pulls',                sets: 3,               reps: reps(15,20),                       rest_secs: rest(60),  cue: 'Pull to forehead level. External rotation at end.' },
      { name: 'Hammer Curls',              sets: 3,               reps: reps(10,12),                       rest_secs: rest(60),  cue: 'No swinging. Supinate at top.' },
    ],
  }
  const legs = {
    day_name: 'Legs Day', focus: 'Quads · Hamstrings · Glutes',
    exercises: [
      { name: 'Back Squat',               sets: isElite ? 5 : 4, reps: isElite ? reps(4,6) : reps(6,8),   rest_secs: rest(240), cue: 'Hip crease below knee. Knees track toes. Chest up.' },
      { name: 'Romanian Deadlift',        sets: 3,               reps: reps(8,10),                        rest_secs: rest(150), cue: 'Hinge at hips. Feel hamstring stretch. No knee bend.' },
      { name: 'Leg Press',                sets: 3,               reps: reps(10,12),                       rest_secs: rest(120), cue: 'Full depth. Do not lock knees at top.' },
      { name: 'Walking Lunges',           sets: 3,               reps: '12 each leg',                     rest_secs: rest(90),  cue: 'Front knee tracks over toe. Upright torso.' },
      { name: 'Calf Raises',              sets: 4,               reps: reps(15,20),                       rest_secs: rest(60),  cue: 'Full stretch at bottom. Pause at top.' },
    ],
  }
  const fullBody = {
    day_name: 'Full Body', focus: 'All Major Muscle Groups',
    exercises: [
      { name: 'Back Squat',       sets: 3, reps: reps(8,10),  rest_secs: rest(180), cue: 'Hip crease below knee.' },
      { name: 'Bench Press',      sets: 3, reps: reps(8,10),  rest_secs: rest(150), cue: 'Bar to lower chest. Full lockout.' },
      { name: 'Barbell Row',      sets: 3, reps: reps(8,10),  rest_secs: rest(150), cue: 'Pull to lower stomach.' },
      { name: 'Overhead Press',   sets: 3, reps: reps(10,12), rest_secs: rest(120), cue: 'Brace core throughout.' },
      { name: 'Romanian Deadlift',sets: 3, reps: reps(10,12), rest_secs: rest(120), cue: 'Hinge, feel the stretch.' },
    ],
  }

  let days
  if (tier === 'arambha') {
    days = Array(Math.min(daysPerWeek, 4)).fill(null).map((_, i) => ({ ...fullBody, day_name: `Full Body Day ${i + 1}` }))
  } else {
    const rotation = [push, pull, legs, push, pull, legs]
    days = rotation.slice(0, daysPerWeek)
  }

  const nutrition = getNutritionTargets(weight, goal)
  const structure = tier === 'arambha' ? 'Full Body' : tier === 'veer' ? 'Upper / Lower / Push-Pull-Legs' : 'Push / Pull / Legs'

  return {
    week_number: 1,
    structure,
    coaching_note: `Week 1 baseline — track every set, log your weights. Progressive overload is the only variable that matters. Hit your protein target within 2 hours of training.`,
    days,
    nutrition_targets: nutrition,
    generated_locally: true,
  }
}
