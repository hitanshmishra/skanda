// Home Workouts & Calisthenics — AI engine + localStorage helpers

const GROQ_KEY = import.meta.env.VITE_GROQ_KEY

// ── Skill progression definitions ─────────────────────────────────────────────

export const SKILL_PROGRESSIONS = {
  push: [
    { level: 1, name: 'Foundation Push-ups',  description: 'Master the perfect push-up with full ROM', target: '3 × 15 reps', requires_bar: false },
    { level: 2, name: 'Push-up Variations',   description: 'Diamond, wide, and decline push-ups',      target: '3 × 12 each variation', requires_bar: false },
    { level: 3, name: 'Archer Push-ups',       description: 'Unilateral loading for one-arm prep',     target: '3 × 8 each side', requires_bar: false },
    { level: 4, name: 'Pike Push-ups',         description: 'Overhead pressing strength from the floor', target: '3 × 10 reps', requires_bar: false },
    { level: 5, name: 'HSPU Progressions',    description: 'Wall-supported handstand push-ups',        target: '3 × 5 reps', requires_bar: false },
  ],
  pull: [
    { level: 1, name: 'Dead Hang & Scapular Pulls', description: 'Grip endurance and shoulder blade control', target: '3 × 30 seconds', requires_bar: true },
    { level: 2, name: 'Negative Pull-ups',          description: 'Lower slowly to build pulling strength',   target: '3 × 8 reps (5s descent)', requires_bar: true },
    { level: 3, name: 'Full Pull-ups',              description: 'Chin over bar with complete range',        target: '3 × 10 reps', requires_bar: true },
    { level: 4, name: 'L-sit Pull-ups',             description: 'Core-integrated pulling power',            target: '3 × 6 reps', requires_bar: true },
    { level: 5, name: 'Muscle-up Progressions',     description: 'Transition from pull to push above bar',   target: '3 × 3 reps', requires_bar: true },
  ],
  core: [
    { level: 1, name: 'Plank & Hollow Body',  description: 'Full-body tension and spinal control',    target: '3 × 45 seconds', requires_bar: false },
    { level: 2, name: 'Hollow Body Rocks',    description: 'Dynamic core compression',                target: '3 × 15 reps', requires_bar: false },
    { level: 3, name: 'L-sit Tuck Hold',      description: 'Hip flexor and compression strength',     target: '3 × 20 seconds', requires_bar: false },
    { level: 4, name: 'Full L-sit',           description: 'Legs straight, compressed core hold',     target: '3 × 15 seconds', requires_bar: false },
    { level: 5, name: 'Dragon Flag',          description: 'Full-body lever from the shoulders',      target: '3 × 5 controlled reps', requires_bar: false },
  ],
  legs: [
    { level: 1, name: 'Air Squat & Glute Bridge', description: 'Movement pattern mastery and glute activation', target: '3 × 20 reps', requires_bar: false },
    { level: 2, name: 'Bulgarian Split Squat',    description: 'Single-leg strength foundation',                target: '3 × 12 each leg', requires_bar: false },
    { level: 3, name: 'Pistol Squat Negatives',   description: 'Single-leg eccentric control',                  target: '3 × 8 each leg (slow descent)', requires_bar: false },
    { level: 4, name: 'Full Pistol Squats',       description: 'Single-leg full depth squat',                   target: '3 × 6 each leg', requires_bar: false },
    { level: 5, name: 'Shrimp Squats',            description: 'Advanced single-leg depth with rear knee bend', target: '3 × 5 each leg', requires_bar: false },
  ],
}

// ── localStorage helpers ───────────────────────────────────────────────────────

const EQUIPMENT_KEY     = 'skanda_home_equipment'
const SKILL_KEY         = 'skanda_skill_levels'
const HOME_SESSIONS_KEY = 'skanda_home_sessions'

export function getHomeEquipment() {
  try {
    return JSON.parse(localStorage.getItem(EQUIPMENT_KEY) || 'null') ||
      { pullup_bar: false, resistance_bands: false, dip_bars: false }
  } catch {
    return { pullup_bar: false, resistance_bands: false, dip_bars: false }
  }
}

export function saveHomeEquipment(equipment) {
  localStorage.setItem(EQUIPMENT_KEY, JSON.stringify(equipment))
}

export function getSkillLevels(tier) {
  try {
    const stored = JSON.parse(localStorage.getItem(SKILL_KEY) || 'null')
    if (stored) return stored
  } catch {}
  // Default starting levels by tier
  const defaults = {
    arambha: { push: { level: 1, sessions: 0 }, pull: { level: 1, sessions: 0 }, core: { level: 1, sessions: 0 }, legs: { level: 1, sessions: 0 } },
    veer:    { push: { level: 2, sessions: 0 }, pull: { level: 2, sessions: 0 }, core: { level: 2, sessions: 0 }, legs: { level: 2, sessions: 0 } },
    skanda:  { push: { level: 3, sessions: 0 }, pull: { level: 3, sessions: 0 }, core: { level: 2, sessions: 0 }, legs: { level: 3, sessions: 0 } },
  }
  return defaults[tier] || defaults.arambha
}

export function saveSkillLevels(levels) {
  localStorage.setItem(SKILL_KEY, JSON.stringify(levels))
}

export function getRecentHomeSessions() {
  try { return JSON.parse(localStorage.getItem(HOME_SESSIONS_KEY) || '[]') }
  catch { return [] }
}

export function saveHomeSessionLocal(session) {
  const sessions = getRecentHomeSessions()
  localStorage.setItem(HOME_SESSIONS_KEY, JSON.stringify([session, ...sessions].slice(0, 5)))
}

// Returns the suggested day type based on day of week and recent sessions
export function getTodayDayType() {
  const dow = new Date().getDay() // 0=Sun
  if (dow === 0 || dow === 3) return 'full'
  if (dow === 1 || dow === 4) return 'upper'
  if (dow === 2 || dow === 5) return 'lower'
  return 'full' // Saturday
}

// ── Local workout generator (fallback when API is unavailable) ────────────────

function generateHomeWorkoutLocal({ tier, equipment, skillLevels, dayType }) {
  const hasPullBar  = equipment.pullup_bar
  const hasBands    = equipment.resistance_bands
  const hasDipBars  = equipment.dip_bars
  const sets        = tier === 'skanda' ? 4 : 3
  const isUpper     = dayType === 'upper' || dayType === 'full'
  const isLower     = dayType === 'lower' || dayType === 'full'

  const warmup = [
    { name: 'Arm Circles',       reps_or_duration: '30 sec each direction', cue: 'Full shoulder range of motion' },
    { name: 'Leg Swings',        reps_or_duration: '10 each side',           cue: 'Hold a wall for balance' },
    { name: 'Hip Circles',       reps_or_duration: '10 each direction',      cue: 'Hands on hips, big circles' },
    { name: 'Cat-Cow Stretch',   reps_or_duration: '10 reps',                cue: 'Breathe with the movement' },
  ]

  const skill_block = []
  if (isUpper) {
    const p = SKILL_PROGRESSIONS.push[skillLevels.push.level - 1]
    skill_block.push({ skill_track: 'push', name: p.name, sets: 3, reps_or_duration: p.target, rest_secs: 90,
      cue: 'Form over speed — every rep perfect', why: `Level ${skillLevels.push.level}/5 push track`, level_up_target: p.target })
    if (hasPullBar) {
      const pu = SKILL_PROGRESSIONS.pull[skillLevels.pull.level - 1]
      skill_block.push({ skill_track: 'pull', name: pu.name, sets: 3, reps_or_duration: pu.target, rest_secs: 120,
        cue: 'Control every rep — no kipping', why: `Level ${skillLevels.pull.level}/5 pull track` })
    }
  }
  if (isLower) {
    const lg = SKILL_PROGRESSIONS.legs[skillLevels.legs.level - 1]
    skill_block.push({ skill_track: 'legs', name: lg.name, sets: 3, reps_or_duration: lg.target, rest_secs: 90,
      cue: 'Full depth, controlled descent', why: `Level ${skillLevels.legs.level}/5 legs track` })
  }
  const cr = SKILL_PROGRESSIONS.core[skillLevels.core.level - 1]
  skill_block.push({ skill_track: 'core', name: cr.name, sets: 3, reps_or_duration: cr.target, rest_secs: 60,
    cue: 'Hollow body — squeeze everything', why: `Level ${skillLevels.core.level}/5 core track` })

  const main_work = []
  if (isUpper) {
    const pushReps = tier === 'skanda' ? '15-20' : tier === 'veer' ? '12-15' : '8-12'
    main_work.push({ name: 'Push-ups', sets, target_reps: pushReps, rest_secs: 60,
      cue: 'Elbows 45°. Chest to floor. Full lockout at top.',
      regression: 'Incline push-ups with hands on a chair', progression: '3-second descent' })
    main_work.push({ name: 'Pike Push-ups', sets: 3, target_reps: '8-10', rest_secs: 75,
      cue: 'Hips high. Head between arms at bottom.',
      regression: 'Reduce the elevation angle', progression: 'Elevate feet on a chair' })
    if (hasDipBars) main_work.push({ name: 'Dips', sets, target_reps: '8-12', rest_secs: 90,
      cue: 'Lean forward slightly. Control the descent.',
      regression: 'Bench dips', progression: 'Pause 1 second at the bottom' })
    if (hasPullBar) {
      const pullReps = tier === 'skanda' ? '8-12' : tier === 'veer' ? '5-8' : '3-5'
      main_work.push({ name: 'Pull-ups', sets, target_reps: pullReps, rest_secs: 120,
        cue: 'Dead hang start. Chin clearly over bar.',
        regression: 'Jumping pull-up + slow 5s descent', progression: 'Pause 2s at top' })
    } else if (hasBands) {
      main_work.push({ name: 'Band Pull-Aparts', sets: 3, target_reps: '15-20', rest_secs: 60,
        cue: 'Arms straight. Pull to chest height.', regression: 'Lighter band', progression: '1-second pause at full stretch' })
    }
    main_work.push({ name: 'Diamond Push-ups', sets: 3, target_reps: '8-12', rest_secs: 60,
      cue: 'Thumbs touching. Elbows track back, not out.', regression: 'Wide push-ups', progression: 'Elevate feet' })
    main_work.push({ name: 'Plank', sets: 3, target_reps: '40 seconds', rest_secs: 45,
      cue: 'Hollow body — squeeze abs, glutes, quads.', regression: 'Knee plank', progression: 'Add shoulder taps' })
  }
  if (isLower) {
    main_work.push({ name: 'Bodyweight Squats', sets, target_reps: '15-20', rest_secs: 60,
      cue: 'Hip crease below knee. Knees track toes. Chest up.',
      regression: 'Squat to a chair', progression: '3-second pause at the bottom' })
    main_work.push({ name: 'Reverse Lunges', sets: 3, target_reps: '10 each leg', rest_secs: 60,
      cue: 'Upright torso. Back knee hovers above floor.', regression: 'Hold wall for balance', progression: 'Add a tempo — 2s down' })
    main_work.push({ name: 'Glute Bridges', sets: 3, target_reps: '15-20', rest_secs: 45,
      cue: 'Drive hips up, not lower back. Squeeze hard at top.', regression: 'Reduce range', progression: 'Single-leg variation' })
    main_work.push({ name: 'Wall Sit', sets: 3, target_reps: '40 seconds', rest_secs: 60,
      cue: 'Thighs parallel. Back flat. No hands on knees.', regression: 'Shorten hold time', progression: 'Add calf raises during hold' })
    main_work.push({ name: 'Standing Calf Raises', sets: 3, target_reps: '20-25', rest_secs: 45,
      cue: 'Full stretch at bottom. Pause at top.', regression: 'Seated variation', progression: 'Single-leg' })
  }

  const finisherMap = {
    upper: { name: 'Push-up AMRAP', description: 'One all-out set to complete muscular failure. Record your reps.', duration_est: '2-3 min', notes: 'This is your benchmark — beat it next upper session.' },
    lower: { name: 'Squat AMRAP',   description: 'One all-out set of bodyweight squats to failure. Record your reps.', duration_est: '2-3 min', notes: 'Beat this number next lower session.' },
    full:  { name: '60-Second Burpee Blitz', description: 'Max burpees in 60 seconds. Full push-up down, full jump up — no shortcuts.', duration_est: '2-3 min', notes: 'Record your reps — this is your conditioning baseline.' },
  }

  return {
    day_type:    dayType,
    estimated_duration: dayType === 'full' ? '50-60 min' : '35-45 min',
    intensity:   tier === 'skanda' ? 'high' : 'moderate',
    warmup,
    skill_block,
    main_work,
    finisher:    finisherMap[dayType] || finisherMap.full,
    progressive_overload_note: 'Complete all reps → add 1 rep per set next session. Miss more than 1 set → hold same numbers.',
    _fromLocal: true,
  }
}

// ── AI workout generator ───────────────────────────────────────────────────────

export async function generateHomeWorkout({ tier, weight, goal, equipment, skillLevels, dayType, recentSessions, testData }) {
  if (!GROQ_KEY) {
    return generateHomeWorkoutLocal({ tier, equipment, skillLevels, dayType })
  }

  const tierNames = { arambha: 'ARAMBHA (Beginner)', veer: 'VEER (Intermediate)', skanda: 'SKANDA (Elite)' }
  const goalLabels = { muscle_gain: 'Muscle Gain', fat_loss: 'Fat Loss', performance: 'Performance' }

  const equipList = [
    equipment.pullup_bar       && 'Pull-up bar',
    equipment.resistance_bands && 'Resistance bands',
    equipment.dip_bars         && 'Dip bars / parallel bars',
  ].filter(Boolean)

  const equipStr = equipList.length ? equipList.join(', ') : 'Bodyweight only (no equipment)'

  const skillDesc = {
    push: SKILL_PROGRESSIONS.push[skillLevels.push.level - 1]?.name || 'Foundation',
    pull: equipment.pullup_bar
      ? SKILL_PROGRESSIONS.pull[skillLevels.pull.level - 1]?.name || 'Foundation'
      : 'No pull-up bar — inverted rows / bands only',
    core: SKILL_PROGRESSIONS.core[skillLevels.core.level - 1]?.name || 'Foundation',
    legs: SKILL_PROGRESSIONS.legs[skillLevels.legs.level - 1]?.name || 'Foundation',
  }

  const sessionHistory = recentSessions.length > 0
    ? `Recent home sessions (use for progressive overload):\n${recentSessions.slice(0, 2).map(s =>
        `  ${s.date} (${s.day_type}): ${(s.exercises || []).slice(0, 4).map(e =>
          `${e.name}: ${(e.sets_completed || []).map(st => `${st.reps}r/${st.difficulty}`).join(', ')}`
        ).join(' | ')}`
      ).join('\n')}`
    : 'No previous home sessions — start conservatively.'

  const ORACLE_HOME = `You are the Oracle of SKANDA — elite AI fitness coach. You generate precise, safe, scientifically-grounded home workouts.
Personality: sharp, direct, data-driven. Every exercise choice must be justified by the user's level and equipment.
Return ONLY valid JSON — no prose, no markdown fences.`

  const prompt = `Generate a complete home workout.

USER PROFILE:
- Tier: ${tierNames[tier] || tier}
- Body weight: ${weight || 170} lbs
- Goal: ${goalLabels[goal] || 'Muscle Gain'}
- Equipment available: ${equipStr}
- Six Trials baseline: push-ups=${testData?.pushups || 'unknown'}, pull-ups=${testData?.pullups || 'unknown'}

TODAY'S SESSION: ${dayType === 'upper' ? 'UPPER BODY' : dayType === 'lower' ? 'LOWER BODY' : 'FULL BODY'}

CURRENT CALISTHENICS SKILL LEVELS:
- Push: Level ${skillLevels.push.level}/5 — "${skillDesc.push}"
- Pull: Level ${skillLevels.pull.level}/5 — "${skillDesc.pull}"
- Core: Level ${skillLevels.core.level}/5 — "${skillDesc.core}"
- Legs: Level ${skillLevels.legs.level}/5 — "${skillDesc.legs}"

${sessionHistory}

RULES:
1. WARMUP: 4 exercises, 4-5 min total — joint mobility + activation
2. SKILL BLOCK: 2-3 exercises targeting their current calisthenics skill levels — this is the TEACHING component
   - For upper day: push + pull (if bar) + core
   - For lower day: legs + core
   - For full day: 1 from each relevant track
   - Each skill exercise must have a clear "why" explaining what skill it builds toward
3. MAIN WORK: 4-6 strength exercises appropriate to day type and tier
   - NO equipment the user doesn't have
   - Apply progressive overload from recent session data
   - Include regression (easier) AND progression (harder) option
4. FINISHER: 1 high-intensity element — AMRAP, circuit, or time challenge
5. Progressive overload: if this is their first session, give baseline numbers. If they have history, prescribe specific progression.

Return ONLY this JSON (no markdown, no prose before or after):
{
  "day_type": "${dayType}",
  "estimated_duration": "40-50 min",
  "intensity": "moderate",
  "warmup": [
    { "name": "Arm Circles", "reps_or_duration": "30 sec each direction", "cue": "Full range of motion, slow and controlled" }
  ],
  "skill_block": [
    {
      "skill_track": "push",
      "exercise": "Archer Push-ups",
      "sets": 3,
      "reps_or_duration": "6-8 each side",
      "rest_secs": 90,
      "cue": "Shift your full bodyweight to one arm. Guide arm stays extended but doesn't push. Keep hips level.",
      "why": "Level 3 push skill — builds the unilateral arm strength that leads to one-arm push-ups",
      "level_up_target": "3 sets × 8 each side with full control and no hip rotation"
    }
  ],
  "main_work": [
    {
      "name": "Push-ups",
      "sets": 4,
      "target_reps": "12-15",
      "rest_secs": 60,
      "cue": "Elbows 45° from torso. Chest touches floor. Full lockout at top. No sagging hips.",
      "regression": "Incline push-ups with hands on a table or chair",
      "progression": "Slow the descent to 3 seconds for more time under tension",
      "overload_note": "From last session: aim for 1 more rep per set"
    }
  ],
  "finisher": {
    "name": "Push-up AMRAP",
    "description": "One set to complete muscular failure. Record your total reps.",
    "duration_est": "2-4 min",
    "notes": "This is your benchmark — beat it next upper body session"
  },
  "progressive_overload_note": "Complete all target reps → add 1 rep per set next session. Miss more than 1 set → hold same numbers."
}`

  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1800,
      messages: [
        { role: 'system', content: ORACLE_HOME },
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (!resp.ok) {
    return generateHomeWorkoutLocal({ tier, equipment, skillLevels, dayType })
  }

  const data = await resp.json()
  const text = data.choices?.[0]?.message?.content || ''
  if (!text) return generateHomeWorkoutLocal({ tier, equipment, skillLevels, dayType })

  try {
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return generateHomeWorkoutLocal({ tier, equipment, skillLevels, dayType })
  }
}
