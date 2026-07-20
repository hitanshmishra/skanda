import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { saveHomeSessionLocal, saveSkillLevels, getSkillLevels } from '../lib/homeWorkouts'
import { saveSkillProgress, saveHomeWorkoutSession } from '../lib/supabase'
import { ChevronLeft, Check, ChevronDown, ChevronUp, Flame, Timer, X, ExternalLink } from 'lucide-react'

// ── Exercise tutorials (YouTube search links + beginner tips) ─────────────────

const TUTORIALS = {
  // Warmup
  'arm circles':                   { url: 'https://www.youtube.com/results?search_query=arm+circles+warmup+shoulder+mobility', tip: 'Stand tall, extend both arms, and trace large circles — forward then backward. Lubricates the shoulder joint before any pressing or pulling.' },
  'neck stretch':                  { url: 'https://www.youtube.com/results?search_query=neck+stretch+warmup+proper+form', tip: 'Gently tilt one ear toward the same shoulder and hold. Never force or bounce — it\'s the neck.' },
  'shoulder rolls':                { url: 'https://www.youtube.com/results?search_query=shoulder+rolls+warmup+exercise', tip: 'Roll both shoulders in a slow full circle: up → back → down → forward. Releases upper trap tension before upper body work.' },
  'wrist extensions':              { url: 'https://www.youtube.com/results?search_query=wrist+extension+stretch+exercise+push+up+prep', tip: 'Essential prep for any push exercise. Place the back of your hand on the floor and gently lean forward to extend the wrist. Keeps tendons healthy.' },
  'leg swings':                    { url: 'https://www.youtube.com/results?search_query=leg+swings+warmup+hip+flexibility', tip: 'Hold a wall for balance, swing one leg forward and back, then side to side. Dynamic hip opener that primes the hip flexors and hamstrings.' },
  'hip circles':                   { url: 'https://www.youtube.com/results?search_query=hip+circles+mobility+exercise+warmup', tip: 'Hands on hips, feet shoulder-width. Trace large horizontal circles. Lubricates the hip joint and wakes up the glutes.' },
  'cat-cow stretch':               { url: 'https://www.youtube.com/results?search_query=cat+cow+stretch+spine+mobility+tutorial', tip: 'On hands and knees, arch your back up (cat) then dip it down (cow). Breathe with the movement. Decompresses the entire spine.' },
  'inchworm':                      { url: 'https://www.youtube.com/results?search_query=inchworm+exercise+warmup+tutorial', tip: 'Hinge at the hips, walk your hands out to a plank, then walk your feet to your hands. Full-body primer for any workout.' },
  'jumping jacks':                 { url: 'https://www.youtube.com/results?search_query=jumping+jacks+warmup+tutorial', tip: 'Classic blood-flow raiser. Land softly with slightly bent knees to protect your joints.' },
  'high knees':                    { url: 'https://www.youtube.com/results?search_query=high+knees+warmup+exercise+tutorial', tip: 'Drive each knee up to hip height with a brisk pace. Engages hip flexors and spikes your heart rate fast.' },

  // Push skill progression
  'foundation push-ups':           { url: 'https://www.youtube.com/results?search_query=perfect+push+up+form+tutorial+beginner', tip: 'The foundation of all pressing. Elbows at 45° from your torso — not flared wide. Chest touches the floor on every rep. Full lockout at the top.' },
  'push-up variations':            { url: 'https://www.youtube.com/results?search_query=push+up+variations+diamond+wide+decline+tutorial', tip: 'Diamond targets the triceps, wide grip shifts load to the chest, decline (feet elevated) hammers the upper chest. Rotate through all three.' },
  'archer push-ups':               { url: 'https://www.youtube.com/results?search_query=archer+push+up+tutorial+calisthenics+one+arm', tip: 'Shift your entire bodyweight onto one arm while the other extends straight for balance — it guides, it doesn\'t push. This builds the unilateral strength needed for one-arm push-ups.' },
  'pike push-ups':                 { url: 'https://www.youtube.com/results?search_query=pike+push+up+tutorial+shoulder+press+overhead', tip: 'Form a V with your hips high. Lower your head between your hands so the top of your head nearly touches the floor. Develops the shoulder pressing strength needed for handstand push-ups.' },
  'hspu progressions':             { url: 'https://www.youtube.com/results?search_query=handstand+push+up+wall+progression+tutorial', tip: 'Start facing the wall in a handstand. Lower your head until it grazes the floor, then press back up. The ultimate overhead pressing skill in calisthenics.' },

  // Pull skill progression
  'dead hang & scapular pulls':    { url: 'https://www.youtube.com/results?search_query=dead+hang+scapular+pull+tutorial+shoulder+health', tip: 'Hang from a bar with fully extended arms (dead hang) then retract your shoulder blades downward without bending the elbows (scapular pull). The absolute foundation of healthy pulling.' },
  'dead hang':                     { url: 'https://www.youtube.com/results?search_query=dead+hang+bar+grip+shoulder+health+tutorial', tip: 'Hang with arms fully extended. Builds grip endurance, decompresses the spine, and teaches shoulder packing.' },
  'scapular pulls':                { url: 'https://www.youtube.com/results?search_query=scapular+pull+tutorial+calisthenics', tip: 'From a dead hang, squeeze your shoulder blades down and together without bending your elbows. Activates the lats before you ever pull.' },
  'negative pull-ups':             { url: 'https://www.youtube.com/results?search_query=negative+pull+up+tutorial+eccentric+beginner', tip: 'Jump or step to the top position (chin over bar) then lower yourself as slowly as possible — aim for 5+ seconds. The fastest way to build pulling strength for those who can\'t yet do a full pull-up.' },
  'full pull-ups':                 { url: 'https://www.youtube.com/results?search_query=pull+up+proper+form+tutorial+full+range', tip: 'Start from a full dead hang. Pull until your chin is clearly over the bar. No kipping, no momentum — strict reps only. Drive your elbows toward your hips, not backward.' },
  'l-sit pull-ups':                { url: 'https://www.youtube.com/results?search_query=l-sit+pull+up+tutorial+core+integrated+calisthenics', tip: 'Hold an L-sit (legs straight, parallel to the floor) for the entire set of pull-ups. Combines the hardest core hold with the hardest upper body pull.' },
  'muscle-up progressions':        { url: 'https://www.youtube.com/results?search_query=muscle+up+progression+tutorial+calisthenics+beginner', tip: 'The muscle-up transitions from a pull-up into a dip above the bar. Learn the false grip first. Explode through the pull phase, lean forward, and press out at the top.' },

  // Core skill progression
  'plank & hollow body':           { url: 'https://www.youtube.com/results?search_query=hollow+body+hold+tutorial+gymnastics+core', tip: 'The hollow body is the spine of gymnastics. Tuck your ribs down, press your lower back into the floor, arms overhead. A 30-second hold done correctly destroys your core.' },
  'hollow body rocks':             { url: 'https://www.youtube.com/results?search_query=hollow+body+rock+tutorial+gymnastics+abs', tip: 'From the hollow position, rock forward and back like a boat. Never let your lower back leave the floor. If you lose the hollow, stop — rest — try again.' },
  'l-sit tuck hold':               { url: 'https://www.youtube.com/results?search_query=l-sit+tuck+hold+tutorial+compression+strength', tip: 'Seated on the floor (or parallel bars), pull your knees to your chest and press through your hands to lift your hips. Builds the hip flexor compression strength needed for the full L-sit.' },
  'full l-sit':                    { url: 'https://www.youtube.com/results?search_query=full+l-sit+tutorial+progression+parallel+bars', tip: 'Legs straight out, parallel to the floor, held on bars or the ground. One of the most demanding static holds in calisthenics. Your hip flexors will be the limiting factor.' },
  'dragon flag':                   { url: 'https://www.youtube.com/results?search_query=dragon+flag+tutorial+bruce+lee+advanced+core', tip: 'Popularised by Bruce Lee. Grip a bench behind your head, keep your entire body straight and rigid, then lower yourself as a single lever from the shoulders. No bending allowed.' },

  // Legs skill progression
  'air squat & glute bridge':      { url: 'https://www.youtube.com/results?search_query=bodyweight+squat+glute+bridge+tutorial+form', tip: 'The squat: hip crease must drop below the knee, chest stays up, knees track over toes. The glute bridge: drive the hips up — not the lower back — and squeeze hard at the top.' },
  'bulgarian split squat':         { url: 'https://www.youtube.com/results?search_query=bulgarian+split+squat+tutorial+form+single+leg', tip: 'Rear foot elevated on a bench or chair, front shin stays vertical. One of the best single-leg exercises in existence — don\'t rush the depth.' },
  'pistol squat negatives':        { url: 'https://www.youtube.com/results?search_query=pistol+squat+progression+negative+eccentric+tutorial', tip: 'Stand on one leg, extend the other forward, lower as slowly as possible. Lightly use the back leg or a wall to stand back up. Eccentric-first is the fastest route to a full pistol.' },
  'full pistol squats':            { url: 'https://www.youtube.com/results?search_query=pistol+squat+tutorial+full+depth+calisthenics', tip: 'One of the most demanding lower body skills. Full depth single-leg squat with the free leg held straight and parallel to the floor. Requires strength, balance, and hip flexibility simultaneously.' },
  'shrimp squats':                 { url: 'https://www.youtube.com/results?search_query=shrimp+squat+tutorial+advanced+single+leg+knee', tip: 'Grab your rear ankle, lower your knee to within an inch of the floor. Requires even more hip flexor flexibility than a pistol squat. Start with hands free for balance.' },

  // Main work — general
  'push-ups':                      { url: 'https://www.youtube.com/results?search_query=push+up+perfect+form+tutorial', tip: 'The most important upper body exercise you can do anywhere. Elbows at 45°, chest to floor, full lockout. Quality over quantity — always.' },
  'dips':                          { url: 'https://www.youtube.com/results?search_query=dip+exercise+tutorial+calisthenics+triceps', tip: 'Lean forward slightly to hit more chest; stay upright to isolate the triceps. Control the descent — lower slowly, press explosively.' },
  'pull-ups':                      { url: 'https://www.youtube.com/results?search_query=pull+up+tutorial+form+calisthenics+beginner', tip: 'Start from a full dead hang every single rep. Drive your elbows toward your hips, not backward. Chin clearly over the bar — not nose, chin.' },
  'band pull-aparts':              { url: 'https://www.youtube.com/results?search_query=band+pull+apart+tutorial+shoulder+rear+delt', tip: 'Arms straight at shoulder height, pull the band apart to your chest. Builds the rear deltoids and rotator cuff — the muscles that keep your shoulders healthy for pressing.' },
  'diamond push-ups':              { url: 'https://www.youtube.com/results?search_query=diamond+push+up+tutorial+triceps+close+grip', tip: 'Thumbs and index fingers touching to form a diamond. Elbows must track straight back — not flare out. One of the best bodyweight tricep exercises.' },
  'plank':                         { url: 'https://www.youtube.com/results?search_query=plank+perfect+form+tutorial+core+strength', tip: 'Hold a hollow body position — ribs down, abs braced, glutes squeezed, quads tight. If your lower back arches or your hips pike, the set is over.' },
  'bodyweight squats':             { url: 'https://www.youtube.com/results?search_query=bodyweight+squat+tutorial+form+beginner', tip: 'Hip crease below your knees, chest upright, knees tracking over toes. This is the movement pattern your body was designed for.' },
  'reverse lunges':                { url: 'https://www.youtube.com/results?search_query=reverse+lunge+tutorial+form+knee+friendly', tip: 'Step backward, not forward — far more knee-friendly. Keep your torso vertical and your front shin perpendicular to the floor.' },
  'glute bridges':                 { url: 'https://www.youtube.com/results?search_query=glute+bridge+tutorial+form+activation+beginner', tip: 'Drive through your heels, lift your hips until your body forms a straight line from knees to shoulders. Squeeze your glutes hard at the top — don\'t let the lower back do the work.' },
  'wall sit':                      { url: 'https://www.youtube.com/results?search_query=wall+sit+exercise+tutorial+quad+strength', tip: 'Thighs parallel to the floor, back flat against the wall, feet directly below your knees. No hands on your knees — that\'s cheating.' },
  'standing calf raises':          { url: 'https://www.youtube.com/results?search_query=standing+calf+raise+tutorial+full+range', tip: 'Rise all the way up onto your toes, pause at the top, then lower completely until your heel is below the step. Full range of motion is the only range that builds calves.' },
  'inverted rows':                 { url: 'https://www.youtube.com/results?search_query=inverted+row+tutorial+door+table+beginner', tip: 'Lie under a table or bar set at hip height, grip with straight arms, pull your chest to the bar with your body rigid. The horizontal pull-up — essential if you can\'t do a full pull-up yet.' },
  'planche negatives':             { url: 'https://www.youtube.com/results?search_query=planche+negative+lean+tutorial+calisthenics', tip: 'From a planche lean (hands angled back, bodyweight forward), slowly lower your chest to the floor. Builds extreme posterior chain and full-body tension control.' },
  'pseudo planche push-ups':       { url: 'https://www.youtube.com/results?search_query=pseudo+planche+push+up+tutorial+calisthenics', tip: 'Hands angled backward, lean your shoulders forward past your hands before pressing. Loads the shoulders and wrists in a unique way that directly transfers to planche.' },
  'jumping pull-ups':              { url: 'https://www.youtube.com/results?search_query=jumping+pull+up+tutorial+beginner+assist', tip: 'Jump to the top position (chin over bar), then lower yourself slowly. The best bridge to full pull-ups for beginners.' },
  'burpees':                       { url: 'https://www.youtube.com/results?search_query=burpee+tutorial+proper+form+full+body', tip: 'Squat down, jump feet to plank, perform a push-up (optional), jump feet back in, then explode up. The most brutal full-body conditioning exercise with no equipment.' },
  'mountain climbers':             { url: 'https://www.youtube.com/results?search_query=mountain+climbers+tutorial+core+cardio', tip: 'From a plank, drive alternating knees toward your chest at a controlled pace. Hips stay level — no bouncing, no piking.' },
  'jump squats':                   { url: 'https://www.youtube.com/results?search_query=jump+squat+tutorial+plyometric+landing', tip: 'Squat to parallel, then drive explosively upward. Land softly with bent knees, absorb the impact, go straight into the next rep.' },
  'bench dips':                    { url: 'https://www.youtube.com/results?search_query=bench+dip+tutorial+tricep+bodyweight', tip: 'Hands on a chair or bench behind you, feet forward, lower your hips toward the floor. Good regression for dips if you don\'t have parallel bars.' },
}

function getTutorial(name) {
  if (!name) return null
  const norm = name.toLowerCase().replace(/[^a-z0-9 &-]/g, '').trim()
  if (TUTORIALS[norm]) return TUTORIALS[norm]
  for (const [key, val] of Object.entries(TUTORIALS)) {
    if (norm.includes(key) || key.includes(norm)) return val
  }
  // Generic YouTube search fallback — always returns something
  const q = encodeURIComponent(name + ' exercise tutorial how to')
  return { url: `https://www.youtube.com/results?search_query=${q}`, tip: null }
}

// ── Rest timer overlay ────────────────────────────────────────────────────────

function RestTimerOverlay({ secs, onDismiss }) {
  const [left, setLeft] = useState(secs)
  const dismissRef = useRef(onDismiss)
  useEffect(() => { dismissRef.current = onDismiss })

  useEffect(() => {
    if (left <= 0) { dismissRef.current(); return }
    const t = setTimeout(() => setLeft(l => l - 1), 1000)
    return () => clearTimeout(t)
  }, [left])

  const pct = Math.min(100, ((secs - left) / secs) * 100)
  const circumference = 2 * Math.PI * 42

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-8 px-5"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)' }}>
      <div className="w-full max-w-sm rounded-3xl p-6 text-center"
        style={{ background: '#100e20', border: '1px solid rgba(200,146,42,0.35)' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-skanda-muted text-xs uppercase tracking-widest">Rest</p>
          <button onClick={onDismiss} className="text-skanda-muted hover:text-skanda-dim">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="relative w-24 h-24 mx-auto mb-4">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <circle cx="48" cy="48" r="42" fill="none" stroke="#c8922a" strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pct / 100)}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.95s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-cinzel font-black text-3xl text-skanda-gold">{left}</span>
          </div>
        </div>
        <p className="text-skanda-text text-sm font-semibold mb-4">
          {left > 0 ? 'Recover — next set coming' : "Time's up. Let's go!"}
        </p>
        <button onClick={onDismiss} className="btn-ghost w-full py-3 text-sm">Skip Rest</button>
      </div>
    </div>
  )
}

// ── Difficulty buttons ────────────────────────────────────────────────────────

const DIFFS = [
  { id: 'easy',   label: 'Easy',   color: '#34d399' },
  { id: 'medium', label: 'Med',    color: '#c8922a' },
  { id: 'hard',   label: 'Hard',   color: '#f97316' },
  { id: 'fail',   label: 'Failed', color: '#ef4444' },
]

// ── Set logger ────────────────────────────────────────────────────────────────

function SetLogger({ exercise, sectionKey, logs, onSetLogged }) {
  const targetSets     = exercise.sets || 3
  const currentSetIdx  = logs.length
  const targetRepsStr  = exercise.target_reps || exercise.reps_or_duration || '10'
  const suggestedReps  = parseInt(targetRepsStr) || 10
  const [repsInput, setRepsInput] = useState('')

  function logSet(difficulty) {
    const reps = parseInt(repsInput) || suggestedReps
    onSetLogged(sectionKey, reps, difficulty)
    setRepsInput('')
  }

  return (
    <div className="space-y-2 mt-2">
      {/* Completed sets */}
      {logs.map((log, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-emerald-400 text-xs font-semibold">Set {i + 1}</span>
          <span className="text-skanda-text text-xs font-bold ml-1">{log.reps} reps</span>
          <span className="ml-auto text-xs capitalize font-medium"
            style={{ color: DIFFS.find(d => d.id === log.difficulty)?.color || '#888' }}>
            {log.difficulty}
          </span>
        </div>
      ))}

      {/* Active set input */}
      {currentSetIdx < targetSets && (
        <div className="rounded-xl p-3 space-y-2.5"
          style={{ background: 'rgba(200,146,42,0.06)', border: '1px solid rgba(200,146,42,0.2)' }}>
          <p className="text-skanda-gold text-xs font-bold">
            Set {currentSetIdx + 1} of {targetSets}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-skanda-muted text-xs shrink-0">Reps</p>
            <input
              type="number"
              inputMode="numeric"
              className="skanda-input w-20 px-3 py-1.5 text-center text-sm"
              placeholder={String(suggestedReps)}
              value={repsInput}
              onChange={e => setRepsInput(e.target.value)}
            />
            <p className="text-skanda-muted text-xs">target: {targetRepsStr}</p>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {DIFFS.map(d => (
              <button key={d.id} onClick={() => logSet(d.id)}
                className="py-2 rounded-lg text-xs font-bold transition-all active:scale-95"
                style={{ background: d.color + '18', color: d.color, border: `1px solid ${d.color}40` }}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Done */}
      {currentSetIdx >= targetSets && (
        <div className="flex items-center justify-center gap-1.5 py-1.5">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-400 text-xs font-semibold">Exercise complete</span>
        </div>
      )}
    </div>
  )
}

// ── Exercise card ─────────────────────────────────────────────────────────────

function ExerciseCard({ ex, sectionKey, logs, onSetLogged, isSkill }) {
  const targetSets = ex.sets || 3
  const done       = logs.length >= targetSets
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: done ? 'rgba(52,211,153,0.04)' : 'rgba(255,255,255,0.02)',
        border:     done ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(255,255,255,0.07)',
      }}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {done
            ? <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            : isSkill
              ? <span className="text-xs px-1.5 py-0.5 rounded font-bold shrink-0"
                  style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}>SKILL</span>
              : null
          }
          <div className="min-w-0">
            <p className={`text-sm font-semibold truncate ${done ? 'text-skanda-dim' : 'text-skanda-text'}`}>
              {ex.name || ex.exercise}
            </p>
            <p className="text-skanda-muted text-xs">
              {ex.sets}×{ex.target_reps || ex.reps_or_duration}
              {ex.rest_secs ? ` · ${ex.rest_secs}s rest` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="text-skanda-muted text-xs">{logs.length}/{targetSets}</span>
          {open
            ? <ChevronUp className="w-4 h-4 text-skanda-muted" />
            : <ChevronDown className="w-4 h-4 text-skanda-muted" />
          }
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4">
          {(() => {
            const tut = getTutorial(ex.name || ex.exercise)
            return (
              <div className="mb-2">
                {tut?.tip && (
                  <p className="text-skanda-muted text-[11px] leading-relaxed mb-1.5">{tut.tip}</p>
                )}
                <a
                  href={tut?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-opacity hover:opacity-80"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  <ExternalLink className="w-3 h-3" />
                  Watch Tutorial on YouTube
                </a>
              </div>
            )
          })()}
          {ex.cue && (
            <div className="px-3 py-2 rounded-lg mb-2"
              style={{ background: 'rgba(200,146,42,0.06)', border: '1px solid rgba(200,146,42,0.15)' }}>
              <p className="text-xs text-skanda-gold font-semibold mb-0.5">Form Cue</p>
              <p className="text-xs text-skanda-dim leading-relaxed">{ex.cue}</p>
            </div>
          )}
          {ex.why && (
            <div className="px-3 py-2 rounded-lg mb-2"
              style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)' }}>
              <p className="text-xs text-violet-400 font-semibold mb-0.5">Why this builds your skill</p>
              <p className="text-xs text-skanda-dim leading-relaxed">{ex.why}</p>
            </div>
          )}
          <SetLogger
            exercise={ex}
            sectionKey={sectionKey}
            logs={logs}
            onSetLogged={onSetLogged}
          />
        </div>
      )}
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ title, color }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-1.5 h-5 rounded-full" style={{ background: color }} />
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color }}>{title}</p>
    </div>
  )
}

// ── Live session timer ────────────────────────────────────────────────────────

function SessionTimer({ startTime }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000)
    return () => clearInterval(t)
  }, [startTime])
  const m = Math.floor(elapsed / 60)
  const s = elapsed % 60
  return <span>{m}:{String(s).padStart(2, '0')}</span>
}

// ── Finisher execution guides ─────────────────────────────────────────────────

const FINISHER_GUIDES = {
  amrap: {
    label: 'AMRAP',
    url: 'https://www.youtube.com/results?search_query=AMRAP+workout+how+to+as+many+reps+as+possible',
    what: 'As Many Reps As Possible — one all-out set with zero rest until true muscular failure.',
    steps: [
      'Set up in position before you start — have everything ready, no faffing.',
      'Begin at a controlled pace. Going too fast in the first 10 reps causes an early crash.',
      'When you feel the burn, slow down slightly — don\'t stop. Push through the discomfort.',
      'Stop only when you genuinely cannot complete another clean rep. Partial reps don\'t count.',
      'Log your total immediately before you forget. This number is your benchmark to beat.',
    ],
    tip: 'Controlled aggression beats reckless speed. The goal is total output, not a fast start.',
  },
  circuit: {
    label: 'Circuit',
    url: 'https://www.youtube.com/results?search_query=circuit+training+how+to+perform+guide+beginner',
    what: 'Multiple exercises performed back-to-back with minimal rest between movements.',
    steps: [
      'Read the full circuit before starting so you know every exercise in order.',
      'Transition between exercises in under 10 seconds — movement is the rest.',
      'Maintain form on every rep of every exercise. Volume means nothing without quality.',
      'If you must rest mid-round, rest after completing the current exercise — not mid-exercise.',
      'Count completed rounds, not individual reps. Log your score when the time or rounds are up.',
    ],
    tip: 'Circuits train conditioning and muscular endurance simultaneously. The burn is the point.',
  },
  blitz: {
    label: 'Blitz',
    url: 'https://www.youtube.com/results?search_query=60+second+max+effort+blitz+workout+tutorial',
    what: 'Maximum effort in a fixed time window — leave nothing in the tank.',
    steps: [
      'Set a visible countdown timer before you touch the floor.',
      'Start the moment the clock starts — every second counts.',
      'Move as fast as possible while still hitting full range of motion on each rep.',
      'No pausing at the bottom or top — constant motion for the full duration.',
      'Log your rep count when the timer hits zero.',
    ],
    tip: 'Short time cap means no pacing strategy — it\'s pure output from second one.',
  },
  timed: {
    label: 'Timed Hold',
    url: 'https://www.youtube.com/results?search_query=isometric+hold+exercise+tutorial+time+under+tension',
    what: 'Hold a static position for maximum time — tests pure endurance and mental toughness.',
    steps: [
      'Get into the prescribed position and engage every muscle before you start the clock.',
      'Breathe steadily — exhale on the hardest moments, never hold your breath.',
      'When your form breaks (back rounding, hips dropping, shaking uncontrollably), the set ends.',
      'Don\'t reset and continue — form failure is failure. Log your time.',
      'The goal next session: add 5 seconds.',
    ],
    tip: 'Isometric holds build tendon strength that dynamic reps cannot. Hold until form fails, not until it hurts.',
  },
}

function getFinisherGuide(name = '') {
  const n = name.toLowerCase()
  if (n.includes('amrap')) return FINISHER_GUIDES.amrap
  if (n.includes('circuit') || n.includes('round')) return FINISHER_GUIDES.circuit
  if (n.includes('blitz') || n.includes('burpee') || n.includes('second') || n.includes('min')) return FINISHER_GUIDES.blitz
  if (n.includes('hold') || n.includes('wall sit') || n.includes('plank')) return FINISHER_GUIDES.timed
  // Default — most finishers are AMRAP-style
  return FINISHER_GUIDES.amrap
}

// ── Finisher card ─────────────────────────────────────────────────────────────

function FinisherCard({ finisher }) {
  const [score, setScore]       = useState(null)
  const [inputVal, setInputVal] = useState('')
  const [guideOpen, setGuideOpen] = useState(true)

  const guide = getFinisherGuide(finisher.name)

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>

      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-red-400 font-semibold text-sm">{finisher.name}</p>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
            {guide.label}
          </span>
        </div>
        <p className="text-skanda-dim text-xs leading-relaxed">{finisher.description}</p>
        {finisher.notes && (
          <p className="text-skanda-muted text-[11px] italic mt-1">{finisher.notes}</p>
        )}
      </div>

      {/* Execution guide — collapsible */}
      <div style={{ borderTop: '1px solid rgba(239,68,68,0.12)' }}>
        <button
          onClick={() => setGuideOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-left"
        >
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#f87171' }}>
            How to execute
          </p>
          {guideOpen
            ? <ChevronUp className="w-3.5 h-3.5" style={{ color: '#f87171' }} />
            : <ChevronDown className="w-3.5 h-3.5" style={{ color: '#f87171' }} />
          }
        </button>

        {guideOpen && (
          <div className="px-4 pb-3 space-y-2.5">
            {/* What is this */}
            <p className="text-skanda-dim text-[11px] leading-relaxed">{guide.what}</p>

            {/* Steps */}
            <div className="space-y-1.5">
              {guide.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black mt-0.5"
                    style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171' }}>
                    {i + 1}
                  </span>
                  <p className="text-skanda-dim text-[11px] leading-relaxed">{step}</p>
                </div>
              ))}
            </div>

            {/* Tip */}
            <div className="px-3 py-2 rounded-lg"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#f87171' }}>Oracle</p>
              <p className="text-skanda-dim text-[11px] leading-relaxed italic">{guide.tip}</p>
            </div>

            {/* Tutorial link */}
            <a
              href={guide.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-opacity hover:opacity-80"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <ExternalLink className="w-3 h-3" />
              Watch {guide.label} Tutorial on YouTube
            </a>
          </div>
        )}
      </div>

      {/* Score logger */}
      <div className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid rgba(239,68,68,0.12)' }}>
        {score === null ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              className="skanda-input w-24 px-3 py-2 text-center text-sm"
              placeholder="Reps"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
            />
            <button
              onClick={() => { if (inputVal) setScore(parseInt(inputVal)) }}
              disabled={!inputVal}
              className="btn-gold flex-1 py-2 text-xs font-bold"
            >
              Log Score
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 py-1">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-emerald-400 text-sm font-semibold">{score} reps — benchmark set</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function HomeWorkoutSession() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { session, profile } = useAuth()
  const { workout, skillLevels: initSkillLevels } = location.state || {}

  const [setLogs, setSetLogs]         = useState({})
  const [warmupDone, setWarmupDone]   = useState(new Set())
  const [restTimer, setRestTimer]     = useState(null)
  const [sessionDone, setSessionDone] = useState(false)
  const [levelUpTracks, setLevelUpTracks] = useState([])
  const startTime = useRef(Date.now())

  if (!workout) {
    return (
      <div className="min-h-dvh bg-skanda-bg flex items-center justify-center px-5">
        <div className="text-center">
          <p className="text-skanda-dim text-sm mb-4">No workout loaded.</p>
          <button onClick={() => navigate('/home-workouts')} className="btn-gold px-6 py-3 text-sm">
            Back to Home Training
          </button>
        </div>
      </div>
    )
  }

  const skillBlock = workout.skill_block || []
  const mainWork   = workout.main_work   || []

  const allExerciseKeys = [
    ...skillBlock.map((_, i) => `skill_${i}`),
    ...mainWork.map((_, i) => `main_${i}`),
  ]

  function getRestSecs(key) {
    if (key.startsWith('skill_')) {
      const i = parseInt(key.split('_')[1])
      return skillBlock[i]?.rest_secs || 90
    }
    const i = parseInt(key.split('_')[1])
    return mainWork[i]?.rest_secs || 60
  }

  function handleSetLogged(key, reps, difficulty) {
    setSetLogs(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), { reps, difficulty }],
    }))
    const secs = getRestSecs(key)
    if (secs > 0) setRestTimer({ secs })
  }

  function getLogs(key) {
    return setLogs[key] || []
  }

  const totalSetsLogged = Object.values(setLogs).reduce((s, a) => s + a.length, 0)
  const totalSetsTarget = allExerciseKeys.reduce((s, key) => {
    if (key.startsWith('skill_')) return s + (skillBlock[parseInt(key.split('_')[1])]?.sets || 3)
    return s + (mainWork[parseInt(key.split('_')[1])]?.sets || 3)
  }, 0)
  const progress = totalSetsTarget > 0 ? totalSetsLogged / totalSetsTarget : 0

  const completedSkillTracks = [
    ...new Set(
      skillBlock
        .filter((ex, i) => getLogs(`skill_${i}`).length >= (ex.sets || 3))
        .map(ex => ex.skill_track)
        .filter(Boolean)
    ),
  ]

  function finishSession() {
    const durationSecs = Math.floor((Date.now() - startTime.current) / 1000)

    const exercisesLogged = allExerciseKeys
      .filter(key => (setLogs[key] || []).length > 0)
      .map(key => {
        const isSkill = key.startsWith('skill_')
        const i = parseInt(key.split('_')[1])
        const ex = isSkill ? skillBlock[i] : mainWork[i]
        return {
          name: ex.name || ex.exercise,
          sets_completed: setLogs[key] || [],
          is_skill: isSkill,
        }
      })

    const homeSessionData = {
      date:          new Date().toISOString().split('T')[0],
      day_type:      workout.day_type,
      duration_secs: durationSecs,
      exercises:     exercisesLogged,
    }

    saveHomeSessionLocal(homeSessionData)

    // Sync to Supabase for authenticated users so WorkoutHistory calendar shows home sessions
    if (session?.user?.id) {
      saveHomeWorkoutSession(session.user.id, homeSessionData)
        .catch(err => console.warn('[SKANDA] home session cloud save failed:', err))
    }

    let readyToLevelUp = []
    if (completedSkillTracks.length > 0) {
      // Re-read current skill levels from localStorage to avoid stale snapshot
      const currentLevels = getSkillLevels(profile?.tier)
      const updated = { ...currentLevels }
      completedSkillTracks.forEach(track => {
        if (updated[track]) {
          const newSessions = (updated[track].sessions || 0) + 1
          const qualifies   = newSessions >= 3 && updated[track].level < 5
          // Cap at 3 so the overlay doesn't re-fire on every subsequent session
          updated[track] = { ...updated[track], sessions: qualifies ? 3 : newSessions }
          if (qualifies) readyToLevelUp.push(track)
        }
      })
      saveSkillLevels(updated)
      if (session?.user?.id) saveSkillProgress(session.user.id, updated)
    }

    setSessionDone(true)
    if (readyToLevelUp.length > 0) {
      setLevelUpTracks(readyToLevelUp)
    } else {
      setTimeout(() => navigate('/home-workouts'), 2000)
    }
  }

  if (sessionDone) {
    // Level-up celebration overlay
    if (levelUpTracks.length > 0) {
      const trackNames = { push: 'Push', pull: 'Pull', legs: 'Legs', core: 'Core' }
      return (
        <div className="min-h-dvh bg-skanda-bg flex items-center justify-center px-5">
          <div className="text-center animate-fade-in max-w-sm w-full">
            <div className="w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-5"
              style={{ background: 'rgba(200,146,42,0.2)', border: '2px solid rgba(200,146,42,0.6)',
                       boxShadow: '0 0 40px rgba(200,146,42,0.4)' }}>
              <span className="text-4xl">🏆</span>
            </div>
            <h2 className="font-cinzel font-black text-2xl text-gradient-gold mb-2">Level Up Ready!</h2>
            <p className="text-skanda-text text-sm mb-1">You've completed 3 sessions at this level.</p>
            <p className="text-skanda-dim text-xs mb-6">
              Ready to advance: <span className="text-skanda-gold font-semibold">{levelUpTracks.map(t => trackNames[t] || t).join(', ')}</span>
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/home-workouts', { state: { autoLevelUp: levelUpTracks[0] } })}
                className="btn-gold w-full py-4 font-cinzel font-bold tracking-wider text-sm"
              >
                LEVEL UP NOW →
              </button>
              <button
                onClick={() => navigate('/home-workouts')}
                className="w-full py-3 text-sm text-skanda-dim hover:text-skanda-text transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-dvh bg-skanda-bg flex items-center justify-center px-5">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4 animate-glow"
            style={{ background: 'rgba(200,146,42,0.15)', border: '1px solid rgba(200,146,42,0.5)' }}>
            <Flame className="w-10 h-10 text-skanda-gold"
              style={{ filter: 'drop-shadow(0 0 12px rgba(200,146,42,0.9))' }} />
          </div>
          <h2 className="font-cinzel font-black text-2xl text-gradient-gold mb-2">Session Complete!</h2>
          {completedSkillTracks.length > 0 && (
            <p className="text-skanda-dim text-xs mb-2">
              Skill progress logged: {completedSkillTracks.join(', ')}
            </p>
          )}
          <p className="text-skanda-muted text-sm">Returning to Home Training...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-skanda-bg flex flex-col">

      {/* Header */}
      <header className="relative px-5 pt-8 pb-4 header-frosted">
        <div className="relative flex items-center justify-between mb-3">
          <button onClick={() => navigate('/home-workouts')}
            className="text-skanda-dim hover:text-skanda-text transition-colors p-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-skanda-muted text-xs uppercase tracking-[0.25em] mb-0.5">SKANDA</p>
            <h1 className="font-cinzel font-black text-xl text-gradient-gold">
              {workout.day_type === 'upper' ? 'Upper' : workout.day_type === 'lower' ? 'Lower' : 'Full'} Session
            </h1>
          </div>
          <div className="flex items-center gap-1 text-skanda-dim text-xs font-mono">
            <Timer className="w-3.5 h-3.5" />
            <SessionTimer startTime={startTime.current} />
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 rounded-full bg-skanda-border">
          <div className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.round(progress * 100)}%`,
              background: 'linear-gradient(90deg, #b87820, #d8a030, #f0c050)',
              boxShadow: progress > 0 ? '0 0 8px rgba(200,146,42,0.5)' : 'none',
            }} />
        </div>
        <p className="text-skanda-muted text-xs mt-1">{totalSetsLogged} / {totalSetsTarget} sets</p>
      </header>

      <div className="flex-1 overflow-auto pb-28">

        {/* Warmup */}
        {workout.warmup?.length > 0 && (
          <div className="mx-5 mt-4">
            <SectionHeader title="Warmup" color="#34d399" />
            <div className="space-y-1.5">
              {workout.warmup.map((ex, i) => {
                const tut = getTutorial(ex.name)
                return (
                  <div key={i}
                    className="flex items-center gap-3 p-3 rounded-xl transition-all"
                    style={{
                      background: warmupDone.has(i) ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.02)',
                      border:     warmupDone.has(i) ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(255,255,255,0.06)',
                    }}>
                    {/* Tap row to toggle done */}
                    <button
                      onClick={() => setWarmupDone(s => {
                        const n = new Set(s)
                        n.has(i) ? n.delete(i) : n.add(i)
                        return n
                      })}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background: warmupDone.has(i) ? '#22c55e' : 'rgba(255,255,255,0.06)',
                          border:     warmupDone.has(i) ? 'none' : '1px solid rgba(255,255,255,0.12)',
                        }}>
                        {warmupDone.has(i) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${warmupDone.has(i) ? 'text-skanda-dim line-through' : 'text-skanda-text'}`}>
                          {ex.name}
                        </p>
                        <p className="text-skanda-muted text-xs">{ex.reps_or_duration}</p>
                        {ex.cue && !warmupDone.has(i) && (
                          <p className="text-skanda-muted text-[10px] mt-0.5 leading-relaxed" style={{ opacity: 0.65 }}>{ex.cue}</p>
                        )}
                      </div>
                    </button>
                    {/* YouTube tutorial link */}
                    <a
                      href={tut?.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-opacity hover:opacity-80"
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
                      title={`Watch ${ex.name} tutorial`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" style={{ color: '#f87171' }} />
                    </a>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Skill block */}
        {skillBlock.length > 0 && (
          <div className="mx-5 mt-5">
            <SectionHeader title="Skill Work" color="#a78bfa" />
            <div className="space-y-2">
              {skillBlock.map((ex, i) => (
                <ExerciseCard
                  key={i}
                  ex={ex}
                  sectionKey={`skill_${i}`}
                  logs={getLogs(`skill_${i}`)}
                  onSetLogged={handleSetLogged}
                  isSkill
                />
              ))}
            </div>
          </div>
        )}

        {/* Main work */}
        {mainWork.length > 0 && (
          <div className="mx-5 mt-5">
            <SectionHeader title="Main Work" color="#c8922a" />
            <div className="space-y-2">
              {mainWork.map((ex, i) => (
                <ExerciseCard
                  key={i}
                  ex={ex}
                  sectionKey={`main_${i}`}
                  logs={getLogs(`main_${i}`)}
                  onSetLogged={handleSetLogged}
                  isSkill={false}
                />
              ))}
            </div>
          </div>
        )}

        {/* Finisher */}
        {workout.finisher && (
          <div className="mx-5 mt-5">
            <SectionHeader title="Finisher" color="#ef4444" />
            <FinisherCard finisher={workout.finisher} />
          </div>
        )}

        <div className="mx-5 mt-5 p-3 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-skanda-muted text-xs text-center">
            Tap any exercise to expand and log your sets.
          </p>
        </div>
      </div>

      {/* Finish button */}
      <div className="fixed bottom-0 inset-x-0 px-5 pb-6 pt-3"
        style={{ background: 'linear-gradient(to top, rgba(6,5,13,1) 70%, transparent)' }}>
        <button
          onClick={finishSession}
          disabled={totalSetsLogged === 0}
          className="btn-gold w-full py-4 font-cinzel font-bold tracking-wide flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Flame className="w-4 h-4" />
          {totalSetsLogged === 0
            ? 'Start Logging Sets'
            : `Finish Session · ${totalSetsLogged} set${totalSetsLogged !== 1 ? 's' : ''} logged`
          }
        </button>
      </div>

      {/* Rest timer */}
      {restTimer && (
        <RestTimerOverlay
          secs={restTimer.secs}
          onDismiss={() => setRestTimer(null)}
        />
      )}
    </div>
  )
}
