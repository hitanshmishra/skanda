import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { calculateTier, getNutritionTargets, cacheProfile, initTrial } from '../lib/workoutCache'
import { upsertProfile, saveFitnessTest } from '../lib/supabase'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'

const TRIAL_META = [
  {
    id: 'pushups',
    title: 'Trial of Earth',
    subtitle: 'Push-ups — Max Unbroken',
    icon: '🌍',
    field: 'pushups',
    unit: 'reps',
    placeholder: '20',
    skipDefault: '15',
    shortCue: 'Max reps without stopping. Count only full range reps.',
    videoUrl: 'https://www.youtube.com/results?search_query=how+to+do+push+ups+proper+form+beginners',
    howTo: [
      {
        heading: 'Starting position',
        steps: [
          'Place your hands on the floor slightly wider than shoulder-width apart.',
          'Straighten your arms fully. Your weight should be on your hands and toes.',
          'Your body must form one straight line — head, back, hips, and heels all aligned.',
          'If your hips are sagging toward the floor or sticking up in the air, adjust until you are in that straight line.',
        ],
      },
      {
        heading: 'The movement',
        steps: [
          'Slowly bend your elbows and lower your chest toward the floor. Your elbows should angle back at roughly 45° — not flaring straight out to the sides.',
          'Lower until your chest either touches the floor or is within an inch of it. This is the bottom of the rep.',
          'Push the floor away and return to the starting position with straight arms. That is ONE rep.',
          'Keep breathing. Exhale as you push up. Do not hold your breath.',
        ],
      },
      {
        heading: 'When to stop counting',
        steps: [
          'Stop when you physically cannot complete another full rep — chest all the way down, arms all the way up.',
          'Half reps (only going halfway down) do NOT count. Only honest, full range reps.',
          'Enter the total number of complete reps you did.',
        ],
      },
    ],
  },
  {
    id: 'pullups',
    title: 'Trial of Sky',
    subtitle: 'Pull-ups — Max Unbroken',
    icon: '🌤️',
    field: 'pullups',
    unit: 'reps',
    skipDefault: '3',
    placeholder: '5',
    shortCue: 'Dead hang start, chin over bar. Enter 0 if you cannot do any yet — that is honest data.',
    videoUrl: 'https://www.youtube.com/results?search_query=how+to+do+pull+ups+proper+form+beginners',
    howTo: [
      {
        heading: 'Starting position',
        steps: [
          'Jump or step up and grab the bar with both hands slightly wider than shoulder-width.',
          'Palms should face away from you (this is called an overhand or pronated grip).',
          'Let yourself hang with your arms completely straight. This is called a "dead hang" and is where every rep must start and end.',
          'If you cannot reach the bar, use a step or box to get into position.',
        ],
      },
      {
        heading: 'The movement',
        steps: [
          'Without swinging or kicking your legs, pull yourself upward. Think about driving your elbows down toward your hips — this activates your back correctly.',
          'Keep pulling until your chin is clearly above the bar. Your chin must visibly pass the bar — not just hover near it.',
          'Hold for one second at the top, then slowly lower yourself all the way back to the dead hang. That is ONE rep.',
          'The lowering phase is just as important as the pulling phase. Do not drop down — control the descent.',
        ],
      },
      {
        heading: 'Cannot do any yet?',
        steps: [
          'That is completely fine and very common. Enter 0.',
          'Your program will include lat pulldowns and assisted pull-up progressions that will get you there.',
          'Do not skip this or enter a fake number — the algorithm needs your real baseline.',
        ],
      },
    ],
  },
  {
    id: 'bench',
    title: 'Trial of Strength',
    subtitle: 'Bench Press — Max Single',
    icon: '💪',
    field: 'bench_lbs',
    unit: 'lbs',
    skipDefault: '95',
    placeholder: '95',
    shortCue: 'Heaviest weight you can lift once with full control. Always use a spotter.',
    videoUrl: 'https://www.youtube.com/results?search_query=how+to+bench+press+proper+form+beginners+tutorial',
    howTo: [
      {
        heading: 'Setup — do this before touching the weight',
        steps: [
          'Lie flat on the bench so your eyes are directly underneath the bar.',
          'Place your feet flat on the floor. Your back should have a slight natural arch — do not flatten it or exaggerate it.',
          'Grip the bar with your thumbs wrapped around it, hands slightly wider than shoulder-width.',
          'Squeeze your shoulder blades together and push them down into the bench. This is critical — it protects your shoulders and gives you a stable base.',
        ],
      },
      {
        heading: 'The lift',
        steps: [
          'With a spotter behind you, unrack the bar by straightening your arms. Hold it directly over your lower chest — NOT over your throat.',
          'Slowly lower the bar toward your lower chest (nipple line area). Do not bounce the bar off your chest.',
          'When the bar lightly touches your chest, press it back up in a straight line until your arms are fully extended. That is ONE rep.',
          'Re-rack the bar carefully.',
        ],
      },
      {
        heading: 'Finding your max',
        steps: [
          'Start with a weight you know you can lift. Do one rep. Rest 3 minutes.',
          'Add 10-20 lbs. Try again. Rest 3 minutes. Keep adding weight until you fail.',
          'Your max is the heaviest weight you successfully lifted with full range of motion.',
          'If you have never benched before, start with just the bar (45 lbs) and work up. It is fine to enter a low number.',
        ],
      },
    ],
  },
  {
    id: 'squat',
    title: 'Trial of Power',
    subtitle: 'Back Squat — Max Single',
    icon: '🦵',
    field: 'squat_lbs',
    unit: 'lbs',
    skipDefault: '115',
    placeholder: '115',
    shortCue: 'Hip crease below knee depth. Heaviest clean single. Use a spotter.',
    videoUrl: 'https://www.youtube.com/results?search_query=how+to+back+squat+proper+form+beginners+barbell',
    howTo: [
      {
        heading: 'Setup',
        steps: [
          'Stand facing the barbell in a squat rack. Step under the bar so it rests across your upper back — on the shelf of muscle just below your neck, NOT directly on your spine.',
          'Grip the bar just wider than shoulder-width with both hands. Squeeze your shoulder blades together.',
          'Take one step back with each foot. Stand with feet about shoulder-width apart, toes pointed out at roughly 30 degrees.',
        ],
      },
      {
        heading: 'The movement',
        steps: [
          'Take a deep breath and brace your core like you are about to take a punch to the stomach. This is called "bracing" and it protects your spine.',
          'Begin the squat by simultaneously pushing your knees out (in the direction your toes point) and sitting your hips back and down.',
          'Keep your chest up throughout. Do not let your torso collapse forward.',
          'Descend until the crease of your hip (where your thigh meets your body) is below the top of your knee. This is called "parallel depth" and is the minimum requirement for a proper squat.',
          'Drive through your entire foot — especially your heels — and stand back up. That is ONE rep.',
        ],
      },
      {
        heading: 'Finding your max',
        steps: [
          'Work up gradually the same way as the bench press. Do not jump straight to a heavy weight.',
          'If you have never squatted with a barbell before, start with just the bar and focus on depth and form.',
          'Your max is the heaviest weight where you hit proper depth and stood back up without your form completely breaking down.',
        ],
      },
    ],
  },
  {
    id: 'mile',
    title: 'Trial of Will',
    subtitle: 'One Mile — Max Effort',
    icon: '🏃',
    isMile: true,
    skipDefaultMile: { min: '10', sec: '00' },
    shortCue: 'Run one full mile as fast as you possibly can. Track your time accurately.',
    videoUrl: 'https://www.youtube.com/results?search_query=how+to+run+a+mile+for+beginners+tips',
    howTo: [
      {
        heading: 'How to measure one mile',
        steps: [
          'Running track: a standard outdoor track is 400 meters. Run exactly 4 laps to complete one mile.',
          'Treadmill: set the distance to 1.0 miles (or 1.6 km). The treadmill will track it for you.',
          'Road / GPS: use any running app on your phone (Nike Run Club, Strava, Apple Fitness) and run until it shows 1.00 mile. Run in a straight line and back if needed.',
        ],
      },
      {
        heading: 'How to run it',
        steps: [
          'Start at a pace you think you can hold for the full distance — do not sprint from the start or you will collapse halfway.',
          'At the halfway point, pick up the pace slightly if you feel you have something left.',
          'In the final 200 meters (half a lap, or the last stretch on a road), give everything you have.',
          'This should be genuinely uncomfortable. A true max-effort mile should feel very hard by the end.',
        ],
      },
      {
        heading: 'Entering your time',
        steps: [
          'Enter minutes in the first box and seconds in the second box.',
          'Example: if you ran 9 minutes and 45 seconds, enter 9 in the first box and 45 in the second.',
          'If you have not run in a while, a time between 9-14 minutes is completely normal.',
        ],
      },
    ],
  },
]

const TOTAL_STEPS = 1 + TRIAL_META.length

export default function SixTrials() {
  const navigate  = useNavigate()
  const { session, setProfile } = useAuth()
  const [step, setStep]         = useState(0)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [openSection, setOpen]  = useState(null)   // which how-to heading is expanded

  const [form, setForm] = useState({
    name: '', age: '', weight_lbs: '', height_ft: '', height_in_extra: '',
    sex: 'male', goal: 'muscle_gain', days_per_week: '4',
    pushups: '', pullups: '', bench_lbs: '', squat_lbs: '',
    mile_min: '8', mile_sec: '00',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Reset open section when step changes
  function goToStep(n) {
    setOpen(null)
    setStep(n)
  }

  const progress    = (step / (TOTAL_STEPS - 1)) * 100
  const isLastStep  = step === TOTAL_STEPS - 1
  const trial       = step > 0 ? TRIAL_META[step - 1] : null

  function canAdvance() {
    if (step === 0) return form.name && form.age && form.weight_lbs && form.height_ft
    if (!trial) return true
    if (trial.isMile) return !!form.mile_min
    return !!form[trial.field]
  }

  async function handleFinish() {
    setLoading(true)
    setError('')
    try {
      const weight   = parseFloat(form.weight_lbs)
      const mileSecs = parseInt(form.mile_min) * 60 + parseInt(form.mile_sec || '0')

      const testData = {
        pushups:    parseInt(form.pushups)    || 0,
        pullups:    parseInt(form.pullups)    || 0,
        bench_lbs:  parseFloat(form.bench_lbs) || 0,
        squat_lbs:  parseFloat(form.squat_lbs) || 0,
        mile_secs:  mileSecs,
        weight_lbs: weight,
      }

      const tierResult = calculateTier(testData)
      const nutrition  = getNutritionTargets(weight, form.goal)

      const profile = {
        id:                session?.user?.id || 'demo',
        name:              form.name,
        age:               parseInt(form.age),
        weight_lbs:        weight,
        height_in:         parseFloat(form.height_ft) * 12 + parseFloat(form.height_in_extra || 0),
        sex:               form.sex,
        goal:              form.goal,
        days_per_week:     parseInt(form.days_per_week) || 4,
        tier:              tierResult.tier,
        tier_score:        tierResult.score,
        tier_label:        tierResult.label,
        nutrition_targets: nutrition,
        test_data:         testData,
      }

      if (session?.user?.id) {
        await upsertProfile(session.user.id, profile)
        await saveFitnessTest(session.user.id, { ...testData, tier: tierResult.tier, tier_score: tierResult.score })
      }

      initTrial()   // start the 30-day full-access trial clock
      setProfile(profile)
      cacheProfile(profile)
      navigate('/tier-reveal', { state: { tier: tierResult, profile } })
    } catch (err) {
      setError(err.message || 'Something went wrong — try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-skanda-bg flex flex-col">

      {/* Header */}
      <div className="px-5 pt-6 flex items-center justify-between">
        <button
          onClick={() => step > 0 ? goToStep(step - 1) : navigate('/auth')}
          className="text-skanda-dim hover:text-skanda-text transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-cinzel text-skanda-gold tracking-widest text-xs uppercase">
          The Six Trials of Skanda
        </span>
        <span className="text-skanda-dim text-xs">{step + 1}/{TOTAL_STEPS}</span>
      </div>

      {/* Progress dots */}
      <div className="mx-5 mt-4">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between mt-1.5">
          {TRIAL_META.map((t, i) => (
            <div key={t.id} className={`w-1.5 h-1.5 rounded-full transition-colors ${
              i + 1 < step ? 'bg-skanda-gold' : i + 1 === step ? 'bg-skanda-gold/50' : 'bg-skanda-border'
            }`} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-6 overflow-auto">

        {/* ── STEP 0: Profile ── */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">⚔️</span>
              <div>
                <p className="text-skanda-dim text-xs uppercase tracking-widest">Trial I</p>
                <h2 className="font-cinzel font-bold text-xl text-skanda-text">Know Thyself</h2>
              </div>
            </div>

            <div>
              <label className="skanda-label">Your Name</label>
              <input className="skanda-input px-4 py-3" placeholder="Your name"
                value={form.name} onChange={e => set('name', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="skanda-label">Age</label>
                <input type="number" className="skanda-input px-4 py-3" placeholder="25"
                  value={form.age} onChange={e => set('age', e.target.value)} />
              </div>
              <div>
                <label className="skanda-label">Sex</label>
                <select className="skanda-input px-4 py-3" value={form.sex} onChange={e => set('sex', e.target.value)}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="skanda-label">Body Weight (lbs)</label>
                <input type="number" className="skanda-input px-4 py-3" placeholder="175"
                  value={form.weight_lbs} onChange={e => set('weight_lbs', e.target.value)} />
              </div>
              <div>
                <label className="skanda-label">Height (ft &amp; in)</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input type="number" className="skanda-input px-3 py-3 text-center w-full"
                      placeholder="5" value={form.height_ft} onChange={e => set('height_ft', e.target.value)} />
                    <p className="text-skanda-muted text-xs text-center mt-0.5">ft</p>
                  </div>
                  <div className="flex-1">
                    <input type="number" className="skanda-input px-3 py-3 text-center w-full"
                      placeholder="10" value={form.height_in_extra} onChange={e => set('height_in_extra', e.target.value)} />
                    <p className="text-skanda-muted text-xs text-center mt-0.5">in</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="skanda-label">Primary Goal</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {[
                  ['muscle_gain', 'BUILD MUSCLE', '💪', 'Gain size & strength'],
                  ['fat_loss',    'LOSE FAT',     '🔥', 'Cut weight, stay strong'],
                  ['performance', 'GET FITTER',   '⚡', 'Speed, endurance, power'],
                ].map(([val, label, icon, desc]) => (
                  <button key={val} type="button" onClick={() => set('goal', val)}
                    className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border text-left ${
                      form.goal === val
                        ? 'bg-skanda-gold/20 border-skanda-gold text-skanda-gold'
                        : 'border-skanda-border text-skanda-muted hover:border-skanda-gold/50'
                    }`}>
                    <span className="block text-base mb-0.5">{icon}</span>
                    <span className="block leading-tight">{label}</span>
                    <span className={`block text-[10px] font-normal mt-1 leading-tight ${form.goal === val ? 'text-skanda-gold/70' : 'text-skanda-muted/60'}`}>{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="skanda-label">Training Days Per Week</label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {[['3', '3 days', 'Beginner'], ['4', '4 days', 'Standard'], ['5', '5 days', 'Dedicated'], ['6', '6 days', 'Elite']].map(([val, label, sub]) => (
                  <button key={val} type="button" onClick={() => set('days_per_week', val)}
                    className={`py-2.5 rounded-xl text-center text-xs font-bold transition-all border ${
                      form.days_per_week === val
                        ? 'bg-skanda-gold/20 border-skanda-gold text-skanda-gold'
                        : 'border-skanda-border text-skanda-muted hover:border-skanda-gold/50'
                    }`}>
                    <span className="block font-bold">{label}</span>
                    <span className={`block text-[10px] font-normal mt-0.5 ${form.days_per_week === val ? 'text-skanda-gold/70' : 'text-skanda-muted/60'}`}>{sub}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEPS 1-5: Physical trials ── */}
        {step > 0 && trial && (
          <div>
            {/* Trial header */}
            <div className="flex items-start gap-3 mb-2">
              <span className="text-3xl mt-0.5">{trial.icon}</span>
              <div>
                <p className="text-skanda-dim text-xs uppercase tracking-widest">{trial.title}</p>
                <h2 className="font-cinzel font-bold text-xl text-skanda-text">{trial.subtitle}</h2>
                <p className="text-skanda-dim text-sm mt-1">{trial.shortCue}</p>
              </div>
            </div>

            {/* ── How-to accordion ── */}
            <div className="mb-5 mt-4 space-y-2">

              {/* Video tutorial button — always visible at the top */}
              {trial.videoUrl && (
                <a
                  href={trial.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: 'rgba(255,0,0,0.08)', border: '1px solid rgba(255,0,0,0.25)', color: '#fc8080' }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Watch Video Tutorial — See exactly how this is done
                </a>
              )}

              {trial.howTo.map((section, si) => (
                <div key={si} className="skanda-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpen(openSection === `${step}-${si}` ? null : `${step}-${si}`)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                  >
                    <span className="text-skanda-text text-sm font-semibold">{section.heading}</span>
                    {openSection === `${step}-${si}`
                      ? <ChevronUp className="w-4 h-4 text-skanda-gold shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-skanda-muted shrink-0" />
                    }
                  </button>
                  {openSection === `${step}-${si}` && (
                    <div className="px-4 pb-4 space-y-2 border-t border-skanda-border pt-3">
                      {section.steps.map((step_text, ti) => (
                        <div key={ti} className="flex gap-3">
                          <span className="w-5 h-5 rounded-full bg-skanda-gold/20 text-skanda-gold text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {ti + 1}
                          </span>
                          <p className="text-skanda-dim text-sm leading-relaxed">{step_text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Never done this before? callout */}
              <div className="px-4 py-3 rounded-xl"
                style={{ background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.15)' }}>
                <p className="text-skanda-gold text-xs font-bold mb-1">Never done this before?</p>
                <p className="text-skanda-dim text-xs leading-relaxed">
                  That is completely okay. Read the instructions above, watch the video, and do your honest best.
                  The Oracle scores you against your baseline — not against anyone else. Enter real numbers.
                </p>
              </div>
            </div>

            {/* ── Input ── */}
            {trial.isMile ? (
              <div>
                <label className="skanda-label">Your Mile Time</label>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex-1 text-center">
                    <input type="number" className="skanda-input px-4 py-4 text-center text-2xl font-bold"
                      placeholder="8" value={form.mile_min} onChange={e => set('mile_min', e.target.value)} />
                    <p className="text-skanda-muted text-xs mt-1">Minutes</p>
                  </div>
                  <span className="text-skanda-gold text-3xl font-bold">:</span>
                  <div className="flex-1 text-center">
                    <input type="number" min="0" max="59" className="skanda-input px-4 py-4 text-center text-2xl font-bold"
                      placeholder="00" value={form.mile_sec} onChange={e => set('mile_sec', e.target.value)} />
                    <p className="text-skanda-muted text-xs mt-1">Seconds</p>
                  </div>
                </div>
                {trial.skipDefaultMile && (
                  <button type="button"
                    onClick={() => { set('mile_min', trial.skipDefaultMile.min); set('mile_sec', trial.skipDefaultMile.sec) }}
                    className="w-full mt-2 py-2 text-xs text-skanda-muted hover:text-skanda-dim transition-colors">
                    Can't run right now? Use a typical estimate (10:00 min/mile) →
                  </button>
                )}
              </div>
            ) : (
              <div>
                <label className="skanda-label flex items-center justify-between">
                  <span>Enter your result</span>
                  <span className="text-skanda-gold">{trial.unit}</span>
                </label>
                <input type="number" className="skanda-input px-4 py-4 text-2xl font-bold text-center mt-1"
                  placeholder={trial.placeholder}
                  value={form[trial.field]}
                  onChange={e => set(trial.field, e.target.value)} />
                {trial.skipDefault && !form[trial.field] && (
                  <button type="button"
                    onClick={() => set(trial.field, trial.skipDefault)}
                    className="w-full mt-2 py-2 text-xs text-skanda-muted hover:text-skanda-dim transition-colors">
                    No equipment / skipping? Use a typical beginner estimate ({trial.skipDefault} {trial.unit}) →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="text-red-400 text-sm mt-4 bg-red-950/30 border border-red-900/40 rounded-lg px-4 py-2">
            {error}
          </p>
        )}
      </div>

      {/* Navigation */}
      <div className="px-5 pb-8 safe-bottom">
        {!isLastStep ? (
          <button type="button" onClick={() => goToStep(step + 1)} disabled={!canAdvance()}
            className="btn-gold w-full py-4 font-cinzel font-bold tracking-wider text-sm flex items-center justify-center gap-2">
            {step === 0 ? 'BEGIN THE TRIALS' : 'NEXT TRIAL'}
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button type="button" onClick={handleFinish} disabled={loading || !canAdvance()}
            className="btn-gold w-full py-4 font-cinzel font-bold tracking-wider text-sm">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-skanda-bg border-t-transparent rounded-full animate-spin" />
                The Oracle Judges...
              </span>
            ) : 'RECEIVE MY JUDGMENT'}
          </button>
        )}
      </div>
    </div>
  )
}
