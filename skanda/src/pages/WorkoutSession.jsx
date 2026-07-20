import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { saveWorkoutSession, savePR } from '../lib/supabase'
import { cacheSession, getCachedSession, clearSession, updateStreak, getExerciseLast, saveExerciseLogs } from '../lib/workoutCache'
import { verifyWorkoutPhoto, fileToBase64 } from '../lib/gemini'
import { ChevronLeft, Check, Trophy, SkipForward, Info, ExternalLink, Dumbbell, AlertTriangle, Camera, ShieldCheck, ShieldX, Loader, X } from 'lucide-react'

// ── Exercise knowledge base ───────────────────────────────────────────────────
// muscles: what it works | mistakes: common beginner errors
const EXERCISE_GUIDE = {
  'Barbell Bench Press': {
    muscles: 'Chest (primary) · Front Shoulders · Triceps',
    why: 'The king of upper-body pushing strength. Builds a thick, powerful chest.',
    mistakes: ['Elbows flaring out to 90° — keep them at 45–75°', 'Bouncing the bar off your chest instead of controlling it', 'Arching your lower back excessively or lifting your hips off the bench'],
  },
  'Bench Press': {
    muscles: 'Chest (primary) · Front Shoulders · Triceps',
    why: 'The king of upper-body pushing strength. Builds a thick, powerful chest.',
    mistakes: ['Elbows flaring out to 90° — keep them at 45–75°', 'Bouncing the bar off chest', 'Lifting hips off the bench'],
  },
  'Overhead Press': {
    muscles: 'Shoulders (primary) · Upper Chest · Triceps · Core (stability)',
    why: 'Builds wide, capped shoulders and serious pressing strength.',
    mistakes: ['Leaning back too far — stay upright with a tight core', 'Not fully locking out elbows at the top', 'Letting the bar drift forward instead of straight up'],
  },
  'Incline Dumbbell Press': {
    muscles: 'Upper Chest (primary) · Front Shoulders · Triceps',
    why: 'Develops the upper-chest shelf — what makes a chest look full from the front.',
    mistakes: ['Setting the bench too steep (above 45°) — becomes a shoulder exercise', 'Elbows flaring wide', 'Not lowering dumbbells to chest level'],
  },
  'Lateral Raises': {
    muscles: 'Side Delts (primary) — this is what creates shoulder width',
    why: 'No other exercise targets the side head of your shoulder as directly. Essential for a broad look.',
    mistakes: ['Using momentum and swinging the weight up', 'Raising above shoulder height — risks impingement', 'Shrugging your traps — keep shoulders down'],
  },
  'Tricep Pushdowns': {
    muscles: 'Triceps (all 3 heads) — triceps make up 2/3 of your arm',
    why: 'Isolates the triceps through their full range. Bigger arms require big triceps.',
    mistakes: ['Moving your upper arms — they must stay pinned at your sides', 'Leaning forward excessively', 'Not fully extending the elbow at the bottom'],
  },
  'Deadlift': {
    muscles: 'Hamstrings · Glutes · Lower Back · Upper Back · Core · Forearms — full body',
    why: 'The most total-muscle activation of any single exercise. Nothing builds raw posterior strength like deadlifts.',
    mistakes: ['Rounding the lower back — keep your spine neutral throughout', 'Bar drifting away from your body — keep it dragging up your shins', 'Jerking the bar — take the slack out first, then push the floor away'],
  },
  'Pull-ups': {
    muscles: 'Lats (primary) · Biceps · Rear Delts · Core',
    why: 'The upper-body squat. Builds the V-taper that makes your waist look smaller.',
    mistakes: ['Not starting from a dead hang — each rep must start with straight arms', 'Chin not clearing the bar — partial reps do not count', 'Kipping or swinging your legs for momentum'],
  },
  'Barbell Row': {
    muscles: 'Upper Back · Lats · Rear Delts · Biceps · Lower Back (stability)',
    why: 'Builds the thick middle back that makes you look powerful from behind.',
    mistakes: ['Rounding the upper back at the top — keep chest up', 'Pulling to your upper chest instead of your belly button', 'Using too much leg drive and turning it into a deadlift'],
  },
  'Face Pulls': {
    muscles: 'Rear Delts · External Rotators · Upper Traps',
    why: 'Protects your shoulders from long-term injury. Counterbalances all the pressing you do.',
    mistakes: ['Pulling to your chin — pull to your forehead', 'Not externally rotating at the end — that is the whole point', 'Going too heavy — this is a high-rep health exercise'],
  },
  'Hammer Curls': {
    muscles: 'Brachialis (forearm muscle between bicep and tricep) · Biceps · Forearms',
    why: 'Builds arm thickness and forearm strength better than standard curls.',
    mistakes: ['Swinging your body — only your forearms should move', 'Not supinating at the top — keep the neutral grip throughout', 'Going too heavy before mastering the movement'],
  },
  'Back Squat': {
    muscles: 'Quads (primary) · Glutes · Hamstrings · Core · Lower Back',
    why: 'The single best lower-body exercise. Builds legs and glutes from every angle.',
    mistakes: ['Knees caving inward — push them out actively', 'Not hitting depth (hip crease must go below knee)', 'Chest falling forward — keep it tall throughout'],
  },
  'Romanian Deadlift': {
    muscles: 'Hamstrings (primary) · Glutes · Lower Back',
    why: 'Specifically targets the hamstrings through a stretch. Most people have undertrained hamstrings.',
    mistakes: ['Bending the knees too much — this is a hip hinge, not a squat', 'Rounding the lower back — maintain a neutral spine', 'Not feeling the hamstring stretch at the bottom — that means you are squatting'],
  },
  'Leg Press': {
    muscles: 'Quads (primary) · Glutes · Hamstrings',
    why: 'Allows high quad volume without the balance demands of squats. Great for size.',
    mistakes: ['Letting your lower back round off the pad at the bottom', 'Locking out your knees at the top — keep a slight bend', 'Feet too close together — targets quads less effectively'],
  },
  'Walking Lunges': {
    muscles: 'Quads · Glutes · Hamstrings · Core (balance)',
    why: 'Trains each leg independently — exposes and fixes strength imbalances between sides.',
    mistakes: ['Front knee going past your toes — step further forward', 'Torso leaning forward excessively', 'Pushing off the back foot — drive through the front heel'],
  },
  'Calf Raises': {
    muscles: 'Gastrocnemius (upper calf) · Soleus (lower calf)',
    why: 'Calves respond to high volume and full range of motion. Most people never train them properly.',
    mistakes: ['Not going through full range — pausing at the stretch at the bottom matters', 'Bouncing at the bottom — control the stretch', 'Only doing 10–12 reps — calves need 15–25 per set'],
  },
}

// For any exercise not in the guide above, generate a YouTube search link
function getVideoUrl(exerciseName) {
  const q = encodeURIComponent(`how to ${exerciseName} proper form tutorial beginners`)
  return `https://www.youtube.com/results?search_query=${q}`
}

function getGuide(name) {
  return EXERCISE_GUIDE[name] || {
    muscles: 'Multiple muscle groups',
    why: 'A core movement in this program selected for your tier and goal.',
    mistakes: [],
  }
}

// ── Rest timer ────────────────────────────────────────────────────────────────

function RestTimer({ seconds, onDone }) {
  const [remaining, setRemaining] = useState(seconds)
  const circumference = 2 * Math.PI * 40
  // Keep onDone in a ref so the effect never needs to re-run when the parent
  // re-renders (which would clear and reset the interval, losing real time).
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    // Anchor to wall-clock so the displayed value is drift-free even if React
    // batches renders or the tab is briefly throttled.
    const endsAt = Date.now() + seconds * 1000
    const id = setInterval(() => {
      const left = Math.ceil((endsAt - Date.now()) / 1000)
      if (left <= 0) {
        clearInterval(id)
        setRemaining(0)
        onDoneRef.current()
        return
      }
      setRemaining(left)
    }, 250) // poll 4× / sec — display stays crisp, still lightweight
    return () => clearInterval(id)
  }, [seconds]) // runs exactly once per rest period

  const progress = remaining / seconds
  const offset   = circumference * (1 - progress)
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <p className="text-skanda-dim text-xs uppercase tracking-widest">Rest Period</p>
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#1e1b2e" strokeWidth="6" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="#c8922a" strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-cinzel font-bold text-2xl text-skanda-text">
            {mins > 0 ? `${mins}:${secs.toString().padStart(2,'0')}` : secs}
          </span>
        </div>
      </div>
      <button onClick={onDone} className="btn-ghost px-4 py-2 text-xs flex items-center gap-1.5">
        <SkipForward className="w-3.5 h-3.5" /> Skip Rest
      </button>
    </div>
  )
}

// ── PR badge ──────────────────────────────────────────────────────────────────

function PRBadge() {
  return (
    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-skanda-gold text-skanda-bg text-xs font-black animate-pulse-gold">
      <Trophy className="w-3 h-3" /> PR
    </div>
  )
}

// ── Set row ───────────────────────────────────────────────────────────────────

function SetRow({ set, setNum, onLog, logged, isPR, lastLog }) {
  // Pre-fill with previous session weight if available, else fall back to AI suggestion
  const [weight, setWeight] = useState(lastLog?.weight ? String(lastLog.weight) : (set.suggested_weight || ''))
  const [reps, setReps]     = useState(set.target_reps ? String(set.target_reps).split('-')[1] || String(set.target_reps) : '')

  return (
    <div className={`py-2 border-b border-skanda-border last:border-0 transition-all ${logged ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-skanda-muted text-xs w-4 shrink-0">{setNum}</span>

        <input
          type="number"
          className={`skanda-input px-2 py-1.5 text-center text-sm w-20 ${logged ? 'opacity-50' : ''}`}
          placeholder="lbs"
          value={weight}
          onChange={e => setWeight(e.target.value)}
          disabled={logged}
        />
        <span className="text-skanda-muted text-xs">×</span>
        <input
          type="number"
          className={`skanda-input px-2 py-1.5 text-center text-sm w-16 ${logged ? 'opacity-50' : ''}`}
          placeholder="reps"
          value={reps}
          onChange={e => setReps(e.target.value)}
          disabled={logged}
        />

        <div className="flex-1" />
        {isPR && <PRBadge />}

        {logged ? (
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <Check className="w-4 h-4 text-emerald-400" />
          </div>
        ) : (
          <button
            onClick={() => onLog(parseFloat(weight) || 0, parseInt(reps) || 0)}
            disabled={!weight || !reps}
            className="btn-gold w-8 h-8 text-xs font-black flex items-center justify-center disabled:opacity-30"
          >
            ✓
          </button>
        )}
      </div>
      {/* Last session hint — shown only on set 1 and only before logging */}
      {setNum === 1 && !logged && lastLog && (
        <p className="text-skanda-muted text-xs mt-1 ml-6">
          Last session: <span className="text-skanda-dim font-semibold">{lastLog.weight} lbs × {lastLog.reps} reps</span>
        </p>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function WorkoutSession() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { session, profile } = useAuth()

  const stateDay  = location.state?.day
  const statePlan = location.state?.plan

  // Try cached session first (offline support)
  const cached = getCachedSession()
  const day    = stateDay || cached?.day || statePlan?.days?.[0]
  const plan   = statePlan

  const [elapsed, setElapsed]     = useState(0)
  const [activeEx, setActiveEx]   = useState(0)
  const [setLogs, setSetLogs]     = useState({})  // { "exIdx-setIdx": { weight, reps } }
  const [resting, setResting]     = useState(null) // { restSecs }
  const [prs, setPRs]             = useState({})   // { "exIdx-setIdx": true }
  const [showCue, setShowCue]     = useState(null)
  const [saving, setSaving]       = useState(false)
  const [skipped, setSkipped]     = useState({})    // { exIdx: true }
  const [verifying, setVerifying] = useState(null)  // exIdx being verified
  const [verifyResults, setVerifyResults] = useState({})  // { exIdx: result }
  const verifyInputRef = useRef({})

  const startTime = useRef(Date.now())

  // Elapsed timer
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime.current) / 1000)), 1000)
    return () => clearInterval(id)
  }, [])

  if (!day) {
    return (
      <div className="min-h-dvh bg-skanda-bg flex flex-col items-center justify-center px-5">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: 'rgba(200,146,42,0.1)', border: '1px solid rgba(200,146,42,0.3)' }}>
            <Dumbbell className="w-8 h-8 text-skanda-gold" />
          </div>
          <div>
            <p className="font-cinzel font-bold text-skanda-text text-lg mb-1">No workout loaded</p>
            <p className="text-skanda-dim text-sm leading-relaxed">
              To start a gym session, go to your Dashboard and tap <span className="text-skanda-gold font-semibold">BEGIN</span> on today's workout card.
              No gym? Start a home workout instead.
            </p>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-gold w-full py-3 text-sm font-bold"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => navigate('/home-workouts')}
              className="btn-ghost w-full py-3 text-sm"
            >
              Home Training (No gym)
            </button>
          </div>
        </div>
      </div>
    )
  }

  const exercises = day.exercises || []

  function formatTime(s) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  function logSet(exIdx, setIdx, weight, reps) {
    const key = `${exIdx}-${setIdx}`
    // PR detection: beat both in-session max AND all-time historical best
    const sessionMax = Object.entries(setLogs)
      .filter(([k]) => k.startsWith(`${exIdx}-`))
      .reduce((max, [, v]) => Math.max(max, v.weight || 0), 0)
    const historicalBest = getExerciseLast(exercises[exIdx]?.name)?.weight || 0
    const isNewPR = weight > 0 && weight > sessionMax && weight > historicalBest

    setSetLogs(prev => ({ ...prev, [key]: { weight, reps } }))
    if (isNewPR) {
      // Clear all previous PR flags for this exercise so only the best set shows the badge
      setPRs(prev => {
        const cleared = Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith(`${exIdx}-`)))
        return { ...cleared, [key]: true }
      })
    }

    // Auto-start rest timer
    const restSecs = exercises[exIdx]?.rest_secs || 90
    setResting({ restSecs, exIdx, setIdx })
  }

  function allSetsLogged(exIdx) {
    const ex = exercises[exIdx]
    return [...Array(ex.sets)].every((_, si) => setLogs[`${exIdx}-${si}`])
  }

  const totalSetsLogged = Object.keys(setLogs).length
  const totalSets = exercises.reduce((sum, ex, i) => sum + (skipped[i] ? 0 : ex.sets), 0)
  const totalVolume = Object.values(setLogs).reduce((sum, { weight, reps }) => sum + weight * reps, 0)
  const prCount = Object.keys(prs).length

  function skipExercise(exIdx) {
    setSkipped(prev => ({ ...prev, [exIdx]: true }))
    setActiveEx(prev => Math.min(prev + 1, exercises.length - 1))
  }

  async function handleVerifyPhoto(exIdx, file) {
    if (!file) return
    setVerifying(exIdx)
    try {
      const b64 = await fileToBase64(file)
      const result = await verifyWorkoutPhoto(b64, file.type, exercises[exIdx]?.name)
      setVerifyResults(prev => ({ ...prev, [exIdx]: result }))
    } catch {
      setVerifyResults(prev => ({ ...prev, [exIdx]: { error: true, message: 'Scan failed. Try again.' } }))
    } finally {
      setVerifying(null)
    }
  }

  async function finishSession() {
    setSaving(true)
    const exerciseSummary = exercises
      .filter((_, i) => !skipped[i])
      .map((ex, i) => {
        // map back to original index for setLogs keys
        const origIdx = exercises.indexOf(ex)
        const logs = [...Array(ex.sets)].map((_, si) => setLogs[`${origIdx}-${si}`]).filter(Boolean)
        saveExerciseLogs(ex.name, logs)
        return { name: ex.name, sets_logged: logs.length, logs }
      })

    const sessionData = {
      plan_day_name: day.day_name,
      exercises_json: exerciseSummary,
      total_volume_lbs: Math.round(totalVolume),
      duration_secs: elapsed,
      prs_hit: prCount,
    }

    if (session?.user?.id) {
      const { error: sessionErr } = await saveWorkoutSession(session.user.id, sessionData)
      if (sessionErr) console.warn('[SKANDA] session save failed:', sessionErr)

      // Deduplicate PRs by exercise — keep only the highest-weight set per exercise
      const prEntries = Object.entries(prs).map(([key]) => {
        const [exIdx, setIdx] = key.split('-').map(Number)
        const ex  = exercises[exIdx]
        const log = setLogs[`${exIdx}-${setIdx}`]
        return { name: ex?.name, weight: log?.weight || 0, reps: log?.reps || 0 }
      }).filter(e => e.name && e.weight > 0)

      const deduped = Object.values(
        prEntries.reduce((acc, e) => {
          if (!acc[e.name] || e.weight > acc[e.name].weight) acc[e.name] = e
          return acc
        }, {})
      )

      for (const pr of deduped) {
        const { error: prErr } = await savePR(session.user.id, pr.name, pr.weight, pr.reps)
        if (prErr) console.warn('[SKANDA] PR save failed:', prErr)
      }
    }

    const streak = updateStreak()
    clearSession()

    navigate('/summary', {
      state: {
        session: sessionData,
        plan,
        dayName: day.day_name,
        streak,
      },
    })
  }

  return (
    <div className="min-h-dvh bg-skanda-bg flex flex-col">
      {/* ── Header ── */}
      <header className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-skanda-border">
        <button onClick={() => navigate(-1)} className="text-skanda-dim hover:text-skanda-text">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="font-cinzel font-bold text-skanda-text text-sm">{day.day_name}</p>
          <p className="text-skanda-dim text-xs">{day.focus}</p>
        </div>
        <div className="text-right">
          <p className="text-skanda-gold font-mono text-sm font-bold">{formatTime(elapsed)}</p>
          <p className="text-skanda-muted text-xs">{totalSetsLogged}/{totalSets} sets</p>
        </div>
      </header>

      {/* ── Progress bar ── */}
      <div className="progress-bar mx-5 mt-2">
        <div className="progress-fill" style={{ width: `${(totalSetsLogged / (totalSets || 1)) * 100}%` }} />
      </div>

      {/* ── Live stats ── */}
      <div className="grid grid-cols-3 gap-2 mx-5 mt-3">
        {[
          { label: 'Volume', value: `${(totalVolume / 1000).toFixed(1)}k lbs` },
          { label: 'Sets Done', value: `${totalSetsLogged}/${totalSets}` },
          { label: 'PRs', value: prCount },
        ].map(({ label, value }) => (
          <div key={label} className="skanda-card p-2 text-center">
            <p className="text-skanda-text font-bold text-sm">{value}</p>
            <p className="text-skanda-muted text-xs">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Rest timer overlay ── */}
      {resting && (
        <div className="mx-5 mt-3 skanda-card border-skanda-gold/20">
          <RestTimer
            seconds={resting.restSecs}
            onDone={() => {
              setResting(null)
              // Auto-advance to next exercise if this one is done
              if (resting.exIdx !== undefined && allSetsLogged(resting.exIdx)) {
                setActiveEx(prev => Math.min(prev + 1, exercises.length - 1))
              }
            }}
          />
        </div>
      )}

      {/* ── Exercise list ── */}
      <div className="flex-1 overflow-auto px-5 mt-3 pb-28">
        {exercises.map((ex, exIdx) => {
          const done    = allSetsLogged(exIdx)
          const isSkipped = !!skipped[exIdx]
          const active  = exIdx === activeEx && !resting && !isSkipped

          return (
            <div key={exIdx}
              onClick={() => !resting && !isSkipped && setActiveEx(exIdx)}
              className={`skanda-card p-4 mb-3 transition-all cursor-pointer ${
                isSkipped ? 'opacity-40' : done ? 'opacity-60' : active ? 'border-skanda-gold/40' : ''
              }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isSkipped ? 'bg-skanda-surface text-skanda-muted border border-skanda-border'
                    : done    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                             : active ? 'bg-skanda-gold/20 text-skanda-gold border border-skanda-gold/40'
                             : 'bg-skanda-surface text-skanda-muted border border-skanda-border'
                  }`}>
                    {isSkipped ? '—' : done ? '✓' : exIdx + 1}
                  </div>
                  <div>
                    <span className={`font-semibold text-sm ${isSkipped ? 'line-through text-skanda-muted' : active ? 'text-skanda-text' : 'text-skanda-dim'}`}>
                      {ex.name}
                    </span>
                    {isSkipped && (
                      <span className="ml-2 text-xs text-skanda-muted">skipped</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-skanda-muted text-xs">{ex.sets}×{ex.reps}</span>
                  {!isSkipped && !done && (
                    <button
                      onClick={e => { e.stopPropagation(); skipExercise(exIdx) }}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-skanda-muted hover:text-red-400 transition-colors"
                      title="Skip this exercise"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span className="text-xs">Skip</span>
                    </button>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); setShowCue(showCue === exIdx ? null : exIdx) }}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-colors ${
                      showCue === exIdx ? 'bg-skanda-gold/20 text-skanda-gold' : 'text-skanda-muted hover:text-skanda-gold'
                    }`}
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span className="text-xs">Guide</span>
                  </button>
                  {/* Prove It button — Bug fix: clear input value before each click so re-scan always fires */}
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      const input = verifyInputRef.current[exIdx]
                      if (input) { input.value = ''; input.click() }
                    }}
                    disabled={verifying === exIdx}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-colors ${
                      verifyResults[exIdx]?.verified ? 'bg-emerald-500/20 text-emerald-400'
                      : verifyResults[exIdx] ? 'bg-orange-500/15 text-orange-400'
                      : 'text-skanda-muted hover:text-skanda-gold'
                    }`}
                  >
                    {verifying === exIdx
                      ? <Loader className="w-3.5 h-3.5 animate-spin" />
                      : verifyResults[exIdx]?.verified
                      ? <ShieldCheck className="w-3.5 h-3.5" />
                      : <Camera className="w-3.5 h-3.5" />
                    }
                    <span className="text-xs">
                      {verifying === exIdx ? 'Scanning...'
                        : verifyResults[exIdx]?.verified ? 'Verified'
                        : verifyResults[exIdx] ? 'Retry'
                        : 'Prove It'}
                    </span>
                  </button>
                  <input
                    ref={el => verifyInputRef.current[exIdx] = el}
                    type="file" accept="image/*" capture="environment"
                    className="hidden"
                    onChange={e => handleVerifyPhoto(exIdx, e.target.files?.[0])}
                  />
                </div>
              </div>

              {showCue === exIdx && (() => {
                const guide = getGuide(ex.name)
                return (
                  <div className="mb-3 space-y-2">

                    {/* Muscles worked */}
                    <div className="p-3 bg-skanda-surface rounded-xl border border-skanda-border">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Dumbbell className="w-3 h-3 text-skanda-gold" />
                        <p className="text-skanda-gold text-xs font-bold uppercase tracking-widest">Muscles Worked</p>
                      </div>
                      <p className="text-skanda-text text-xs font-semibold mb-1">{guide.muscles}</p>
                      <p className="text-skanda-dim text-xs leading-relaxed">{guide.why}</p>
                    </div>

                    {/* Numbers explained */}
                    <div className="p-3 bg-skanda-surface rounded-xl border border-skanda-border space-y-2">
                      <p className="text-skanda-gold text-xs font-bold uppercase tracking-widest">What do these numbers mean?</p>
                      <div className="flex gap-2">
                        <span className="text-skanda-gold font-bold text-xs w-16 shrink-0">{ex.sets} sets</span>
                        <span className="text-skanda-dim text-xs leading-relaxed">
                          You do this exercise {ex.sets} separate times with a rest between each. Each round is one "set."
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-skanda-gold font-bold text-xs w-16 shrink-0">{ex.reps} reps</span>
                        <span className="text-skanda-dim text-xs leading-relaxed">
                          Reps = repetitions. One rep = one full movement down and back up. If the range is "8-12", start in the middle. When it feels easy, aim for the higher number.
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-skanda-gold font-bold text-xs w-16 shrink-0">{ex.rest_secs}s rest</span>
                        <span className="text-skanda-dim text-xs leading-relaxed">
                          Rest {ex.rest_secs}s ({Math.round(ex.rest_secs / 60)} min) between sets. The timer starts automatically when you log a set. Rest fully — do not rush.
                        </span>
                      </div>
                    </div>

                    {/* Form cue */}
                    {ex.cue && (
                      <div className="p-3 bg-skanda-gold/5 border border-skanda-gold/20 rounded-xl">
                        <p className="text-skanda-gold text-xs font-bold uppercase tracking-widest mb-1.5">Form Cue</p>
                        <p className="text-skanda-dim text-xs leading-relaxed">{ex.cue}</p>
                      </div>
                    )}

                    {/* Common mistakes */}
                    {guide.mistakes.length > 0 && (
                      <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl">
                        <div className="flex items-center gap-1.5 mb-2">
                          <AlertTriangle className="w-3 h-3 text-red-400" />
                          <p className="text-red-400 text-xs font-bold uppercase tracking-widest">Common Beginner Mistakes</p>
                        </div>
                        <div className="space-y-1.5">
                          {guide.mistakes.map((m, mi) => (
                            <div key={mi} className="flex gap-2">
                              <span className="text-red-500 text-xs shrink-0 mt-0.5">✕</span>
                              <p className="text-skanda-dim text-xs leading-relaxed">{m}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Video tutorial link */}
                    <a
                      href={getVideoUrl(ex.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-semibold transition-all"
                      style={{ background: 'rgba(255,0,0,0.08)', border: '1px solid rgba(255,0,0,0.2)', color: '#fc8080' }}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Watch "{ex.name}" Tutorial on YouTube
                    </a>

                  </div>
                )
              })()}

              {/* ── Verify result panel — only show when card is expanded ── */}
              {(active || done) && !isSkipped && verifyResults[exIdx] && (
                <div className={`mb-3 p-3 rounded-xl border ${
                  verifyResults[exIdx].error ? 'bg-red-950/20 border-red-900/30'
                  : verifyResults[exIdx].verified ? 'bg-emerald-950/20 border-emerald-500/30'
                  : 'bg-red-950/20 border-red-900/30'
                }`}>
                  {verifyResults[exIdx].error ? (
                    <p className="text-red-400 text-xs">{verifyResults[exIdx].message}</p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {verifyResults[exIdx].verified
                            ? <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            : <ShieldX className="w-4 h-4 text-red-400" />
                          }
                          <span className={`text-xs font-bold uppercase tracking-widest ${
                            verifyResults[exIdx].verified ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {verifyResults[exIdx].verified ? 'Form Verified ✓' : 'Not Verified'}
                          </span>
                        </div>
                        {verifyResults[exIdx].form_score != null && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{
                              background: verifyResults[exIdx].form_score >= 75 ? 'rgba(52,211,153,0.15)' : 'rgba(251,146,60,0.15)',
                              color: verifyResults[exIdx].form_score >= 75 ? '#34d399' : '#fb923c',
                            }}>
                            Form {verifyResults[exIdx].form_score}/100
                          </span>
                        )}
                      </div>
                      <p className="text-skanda-dim text-xs leading-relaxed mb-2">{verifyResults[exIdx].feedback}</p>
                      {verifyResults[exIdx].cues?.length > 0 && (
                        <div className="space-y-1">
                          {verifyResults[exIdx].cues.map((cue, ci) => (
                            <div key={ci} className="flex gap-2">
                              <span className="text-skanda-gold text-xs shrink-0">→</span>
                              <p className="text-skanda-dim text-xs">{cue}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {(active || done) && !isSkipped && (
                <div className="space-y-0">
                  {[...Array(ex.sets)].map((_, si) => (
                    <SetRow
                      key={si}
                      set={{ suggested_weight: ex.weight_suggestion?.match(/\d+/)?.[0], target_reps: ex.reps }}
                      setNum={si + 1}
                      logged={!!setLogs[`${exIdx}-${si}`]}
                      isPR={!!prs[`${exIdx}-${si}`]}
                      onLog={(w, r) => logSet(exIdx, si, w, r)}
                      lastLog={getExerciseLast(ex.name)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Finish button ── */}
      <div className="fixed bottom-0 inset-x-0 bg-skanda-bg/90 backdrop-blur border-t border-skanda-border px-5 py-4 safe-bottom">
        <button
          onClick={finishSession}
          disabled={saving || totalSetsLogged === 0}
          className="btn-gold w-full py-4 font-cinzel font-bold tracking-wider text-sm"
        >
          {saving
            ? <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-skanda-bg border-t-transparent rounded-full animate-spin" />
                Saving Battle Record...
              </span>
            : `END SESSION · ${Math.round(totalVolume).toLocaleString()} lbs`
          }
        </button>
      </div>
    </div>
  )
}
