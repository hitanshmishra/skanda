import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getOracleInsight, getRestDayInsight } from '../lib/claude'
import { getLatestPlan, getTodayNutrition } from '../lib/supabase'
import { getCachedPlan, getInsightsRemaining, consumeInsight, needsWeighIn, logWeightLocal, getNutritionTargets, cacheProfile, isTrialActive, getTrialDaysLeft, trialExpired, getLocalInsight, getStreak, getAvatar, getPlanAgeDays } from '../lib/workoutCache'
import { needsWeeklyPhoto, isPhotoPromptDismissedToday, dismissPhotoPrompt } from '../lib/progressPhotos'
import { logWeightDB, upsertProfile } from '../lib/supabase'
import UpgradeModal from '../components/UpgradeModal'
import { Dumbbell, Utensils, Zap, User, Play, TrendingUp, ChevronRight, Flame, Scale, Check, Crown, AlertTriangle, Moon, Camera, RotateCcw } from 'lucide-react'

const GOAL_LABELS = { muscle_gain: 'Muscle Gain', fat_loss: 'Cut', performance: 'Performance' }
const TIER_CSS    = { arambha: 'tier-arambha', veer: 'tier-veer', skanda: 'tier-skanda' }

// Returns { isRestDay, planDayIndex } based on days_per_week and current weekday
function getTodaySchedule(daysPerWeek) {
  const schedules = {
    3: [1, 3, 5],       // Mon Wed Fri
    4: [1, 2, 4, 5],    // Mon Tue Thu Fri
    5: [1, 2, 3, 4, 5], // Mon–Fri
    6: [1, 2, 3, 4, 5, 6],
  }
  const todayDow = new Date().getDay() // 0=Sun
  const trainingDays = schedules[daysPerWeek] || schedules[4]
  const idx = trainingDays.indexOf(todayDow)
  return { isRestDay: idx === -1, planDayIndex: idx === -1 ? 0 : idx }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, setProfile, logout, session }  = useAuth()
  const [avatar] = useState(() => getAvatar())
  const [plan, setPlan]       = useState(null)
  const [nutrition, setNutr]  = useState([])
  const [insight, setInsight] = useState('')
  const [insightLoading, setIL] = useState(false)
  const [activeTab, setTab]   = useState('today')
  const [insightsLeft, setInsightsLeft]   = useState(() => getInsightsRemaining())
  const [upgradeModal, setUpgradeModal]   = useState(false)
  const [showWeighIn, setShowWeighIn]     = useState(() => needsWeighIn())
  const [showPhotoPrompt, setShowPhotoPrompt] = useState(() => needsWeeklyPhoto() && !isPhotoPromptDismissedToday())
  const [newWeight, setNewWeight]         = useState('')
  const [weightSaved, setWeightSaved]     = useState(false)
  const [savingWeight, setSavingWeight]   = useState(false)
  const streak = getStreak()
  const { isRestDay, planDayIndex } = getTodaySchedule(profile?.days_per_week || 4)

  const load = useCallback(async () => {
    try {
      // Plan
      const cached = getCachedPlan()
      if (cached) {
        setPlan(cached)
      } else if (profile?.id && profile.id !== 'demo') {
        const p = await getLatestPlan(profile.id)
        if (p?.plan_json) setPlan(p.plan_json)
      }
      // Nutrition
      if (profile?.id && profile.id !== 'demo') {
        const logs = await getTodayNutrition(profile.id)
        setNutr(logs || [])
      }
    } catch {
      // Supabase unreachable — keep showing cached data, no crash
    }
  }, [profile?.id])

  useEffect(() => { load() }, [load])

  async function fetchInsight() {
    // Check credit gate before consuming
    if (getInsightsRemaining() <= 0) {
      setUpgradeModal(true)
      return
    }
    setIL(true)
    try {
      const tier        = profile?.tier_label || profile?.tier || 'Arambha'
      const goal        = GOAL_LABELS[profile?.goal] || 'Muscle Gain'
      const lastSession = plan?.days?.[0]?.day_name || 'no recent session'
      let text
      if (isRestDay && plan) {
        text = await getRestDayInsight({
          tier, goal, streak: getStreak().current,
          protein: todayTotals.protein,
          lastSessionName: lastSession,
        })
      } else {
        text = await getOracleInsight({
          tier, goal,
          streak:      getStreak().current,
          lastSession,
          protein:     todayTotals.protein,
        })
      }
      // Only consume credit on a successful API response
      consumeInsight()
      setInsightsLeft(getInsightsRemaining())
      setInsight(text)
    } catch {
      // API down — use local insight, don't burn a credit
      setInsight(getLocalInsight({ goal: profile?.goal, protein: todayTotals.protein }))
    } finally {
      setIL(false)
    }
  }

  async function saveWeight() {
    const w = parseFloat(newWeight)
    if (!w || w < 50 || w > 700) return
    setSavingWeight(true)
    try {
      // Always save locally (works in demo mode too)
      logWeightLocal(w)
      // Update profile with new weight + recalculate nutrition targets
      const updatedNutrition = getNutritionTargets(w, profile?.goal || 'muscle_gain')
      const updatedProfile = { ...profile, weight_lbs: w, nutrition_targets: updatedNutrition }
      cacheProfile(updatedProfile)
      setProfile(updatedProfile)
      if (session?.user?.id) {
        await logWeightDB(session.user.id, w)
        await upsertProfile(session.user.id, { weight_lbs: w, nutrition_targets: updatedNutrition })
      }
      setWeightSaved(true)
      setTimeout(() => setShowWeighIn(false), 1800)
    } finally {
      setSavingWeight(false)
    }
  }

  // ── Today's nutrition totals ──────────────────────────────────────────────

  const todayTotals = nutrition.reduce((acc, log) => ({
    calories: acc.calories + (log.calories || 0),
    protein:  acc.protein  + (log.protein_g || 0),
    carbs:    acc.carbs    + (log.carbs_g   || 0),
    fat:      acc.fat      + (log.fat_g     || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  const targets = profile?.nutrition_targets || plan?.nutrition_targets || { calories: 2500, protein_g: 175, carbs_g: 300, fat_g: 75 }

  const todayDay = plan?.days?.[planDayIndex] || plan?.days?.[0] || null

  return (
    <div className="min-h-dvh bg-skanda-bg flex flex-col">
      {/* ── Hero Header ── */}
      <header className="relative px-5 pt-8 pb-5 header-frosted overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 120% at 50% -20%, rgba(90,50,200,0.12) 0%, transparent 70%)' }} />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-skanda-muted text-xs uppercase tracking-[0.25em] mb-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
            <h1 className="font-cinzel font-black text-2xl" style={{ color: '#f0e8ff' }}>
              {profile?.name ? `${profile.name}'s` : 'Your'}{' '}
              <span className="text-gradient-gold">War Room</span>
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-3 py-0.5 rounded-full text-xs font-black ${TIER_CSS[profile?.tier] || 'tier-arambha'}`}>
                {(profile?.tier_label || profile?.tier || 'ARAMBHA').toUpperCase()}
              </span>
              {profile?.goal && (
                <span className="text-skanda-muted text-xs">· {GOAL_LABELS[profile.goal]}</span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button onClick={() => navigate('/profile')}
              className="w-11 h-11 rounded-2xl flex items-center justify-center overflow-hidden animate-glow"
              style={{ background: 'rgba(200,146,42,0.12)', border: '1px solid rgba(200,146,42,0.35)' }}>
              {avatar
                ? <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                : <User className="w-4 h-4 text-skanda-gold" />
              }
            </button>
            {/* Streak pill — only show once user has started training */}
            {streak.current > 0 ? (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.4)' }}>
                <Flame className="w-3.5 h-3.5 text-orange-400"
                  style={{ filter: 'drop-shadow(0 0 4px rgba(251,146,60,0.8))' }} />
                <span className="text-xs font-bold text-orange-300">{streak.current}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <Flame className="w-3 h-3 text-skanda-muted" />
                <span className="text-[10px] text-skanda-muted">Start streak</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Trial status banner ── */}
      {isTrialActive() && getTrialDaysLeft() <= 7 && (
        <div className="mx-5 mb-3 p-3 rounded-xl flex items-center gap-2 animate-slide-up"
          style={{ background: 'rgba(200,146,42,0.08)', border: '1px solid rgba(200,146,42,0.3)' }}>
          <Zap className="w-4 h-4 text-skanda-gold shrink-0" />
          <p className="text-skanda-dim text-xs flex-1">
            Trial ends in <span className="text-skanda-gold font-bold">{getTrialDaysLeft()} day{getTrialDaysLeft() !== 1 ? 's' : ''}</span> — all features unlimited until then
          </p>
          <button onClick={() => setUpgradeModal(true)} className="text-skanda-gold text-xs font-bold shrink-0">Upgrade</button>
        </div>
      )}
      {trialExpired() && (
        <div className="mx-5 mb-3 p-3 rounded-xl flex items-center gap-2 animate-slide-up"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-red-400 text-xs flex-1">
            Trial ended — free limits now apply
          </p>
          <button onClick={() => setUpgradeModal(true)} className="text-red-400 text-xs font-bold shrink-0">Upgrade →</button>
        </div>
      )}
      {isTrialActive() && getTrialDaysLeft() > 7 && (
        <div className="mx-5 mb-3 px-3 py-2 rounded-xl flex items-center gap-2"
          style={{ background: 'rgba(200,146,42,0.05)', border: '1px solid rgba(200,146,42,0.15)' }}>
          <span className="text-skanda-gold text-xs font-semibold">{getTrialDaysLeft()} days left in free trial</span>
          <span className="text-skanda-muted text-xs ml-auto">All features unlimited</span>
        </div>
      )}

      {/* ── Oracle insight card ── */}
      <div className="mx-5 mb-4">
        <div className="skanda-card-gold p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(200,146,42,0.2)' }}>
                <Zap className="w-3.5 h-3.5 text-skanda-gold" />
              </div>
              <span className="text-skanda-gold text-xs font-bold uppercase tracking-widest">
                {isRestDay && plan ? 'Recovery Oracle' : 'Oracle Insight'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isTrialActive() ? (
                <span className="text-emerald-400 text-xs font-semibold">Trial · Unlimited</span>
              ) : !Number.isFinite(insightsLeft) || insightsLeft > 0 ? (
                <span className="text-skanda-muted text-xs">{Number.isFinite(insightsLeft) ? insightsLeft : '∞'} remaining today</span>
              ) : (
                <span className="text-red-400 text-xs font-semibold">0 remaining today</span>
              )}
              <button
                onClick={fetchInsight}
                disabled={insightLoading}
                className="text-xs text-skanda-dim hover:text-skanda-gold transition-colors font-medium"
              >
                {insightLoading ? 'Consulting...' : 'Refresh'}
              </button>
            </div>
          </div>
          {insightLoading ? (
            <div className="space-y-2">
              <div className="shimmer h-3 rounded w-full" />
              <div className="shimmer h-3 rounded w-3/4" />
            </div>
          ) : insight ? (
            <p className="text-skanda-text text-sm leading-relaxed">{insight}</p>
          ) : (
            <p className="text-skanda-muted text-sm italic">
              {isRestDay && plan
                ? '"Rest is not weakness — it is the weapon that sharpens the blade." — Tap Refresh for recovery directives.'
                : '"A warrior does not enter battle without counsel." — Tap Refresh for your daily insight.'
              }
            </p>
          )}
        </div>
      </div>

      {/* ── Plan evolution nudge ── */}
      {plan && (() => {
        const ageDays = getPlanAgeDays()
        if (ageDays === null || ageDays < 5) return null
        return (
          <div className="mx-5 mb-4 animate-slide-up">
            <div className="skanda-card p-4 border-skanda-gold/20">
              <div className="flex items-center gap-2 mb-2">
                <RotateCcw className="w-4 h-4 text-skanda-gold" />
                <span className="text-skanda-gold text-xs font-bold uppercase tracking-widest">Plan Evolution Ready</span>
                <span className="ml-auto text-skanda-muted text-xs">Day {ageDays}</span>
              </div>
              <p className="text-skanda-dim text-xs mb-3 leading-relaxed">
                Your Week {plan.week_number || 1} plan is {ageDays} days old. Oracle can analyse your sessions and generate a smarter Week {(plan.week_number || 1) + 1}.
              </p>
              <button onClick={() => navigate('/ai')}
                className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                style={{ background: 'rgba(200,146,42,0.1)', color: '#c8922a', border: '1px solid rgba(200,146,42,0.3)' }}>
                <RotateCcw className="w-3.5 h-3.5" /> Evolve My Plan →
              </button>
            </div>
          </div>
        )
      })()}

      {/* ── Weekly weigh-in card ── */}
      {showWeighIn && (
        <div className="mx-5 mb-4 animate-slide-up">
          <div className="skanda-card-gold p-4 rounded-2xl">
            {!weightSaved ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Scale className="w-4 h-4 text-skanda-gold" />
                  <span className="text-skanda-gold text-xs font-bold uppercase tracking-widest">Weekly Weigh-In</span>
                  <button onClick={() => setShowWeighIn(false)} className="ml-auto text-skanda-muted text-xs hover:text-skanda-dim">Skip</button>
                </div>
                <p className="text-skanda-dim text-xs mb-3">
                  Logging your weight weekly lets SKANDA keep your nutrition targets accurate and track your progress over time.
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      className="skanda-input px-4 py-2.5 pr-10 text-sm"
                      placeholder={profile?.weight_lbs ? `${profile.weight_lbs}` : '175'}
                      value={newWeight}
                      onChange={e => setNewWeight(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveWeight()}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-skanda-muted text-xs">lbs</span>
                  </div>
                  <button
                    onClick={saveWeight}
                    disabled={!newWeight || savingWeight}
                    className="btn-gold px-4 py-2.5 text-xs font-bold"
                  >
                    {savingWeight ? '...' : 'Log'}
                  </button>
                </div>
                {profile?.weight_lbs && (
                  <p className="text-skanda-muted text-xs mt-2">Last logged: {profile.weight_lbs} lbs</p>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center gap-2 py-1">
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 text-sm font-semibold">Weight logged — targets updated</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Weekly progress photo prompt ── */}
      {showPhotoPrompt && (
        <div className="mx-5 mb-4 animate-slide-up">
          <div className="skanda-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Camera className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#a78bfa' }}>Weekly Progress Photo</span>
              <button onClick={() => { dismissPhotoPrompt(); setShowPhotoPrompt(false) }}
                className="ml-auto text-skanda-muted text-xs hover:text-skanda-dim">Skip</button>
            </div>
            <p className="text-skanda-dim text-xs mb-3 leading-relaxed">
              Track your visual transformation. A quick weekly photo lets you compare progress over time with the before/after slider.
            </p>
            <button onClick={() => navigate('/progress-photos')}
              className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}>
              <Camera className="w-3.5 h-3.5" /> Take This Week's Photo
            </button>
          </div>
        </div>
      )}

      {/* ── Macro row ── */}
      <div className="mx-5 mb-4">
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Cal',     value: todayTotals.calories, target: targets.calories,   unit: '',  color: '#c8922a' },
            { label: 'Protein', value: todayTotals.protein,  target: targets.protein_g,  unit: 'g', color: '#a78bfa' },
            { label: 'Carbs',   value: todayTotals.carbs,    target: targets.carbs_g,    unit: 'g', color: '#34d399' },
            { label: 'Fat',     value: todayTotals.fat,      target: targets.fat_g,      unit: 'g', color: '#f97316' },
          ].map(({ label, value, target, unit, color }) => (
            <div key={label} className="skanda-card p-3 text-center">
              <p className="font-bold text-base" style={{ color }}>{Math.round(value)}{unit}</p>
              <p className="text-skanda-muted text-xs mt-0.5">{label}</p>
              <div className="progress-bar mt-2" style={{ background: color + '18' }}>
                <div className="h-full rounded-sm transition-all" style={{
                  width: `${Math.min(100, (value / (target || 1)) * 100)}%`,
                  background: color,
                  boxShadow: `0 0 6px ${color}80`,
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="mx-5 mb-4 p-1 rounded-2xl flex gap-1"
        style={{ background: 'rgba(13,11,28,0.7)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)' }}>
        {[
          { id: 'today', label: "Today's Battle", icon: Flame },
          { id: 'week',  label: 'Week Plan',      icon: TrendingUp },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
              activeTab === id
                ? 'text-skanda-bg'
                : 'text-skanda-muted hover:text-skanda-dim'
            }`}
            style={activeTab === id ? {
              background: 'linear-gradient(135deg, #b87820, #d8a030, #f0c050)',
              boxShadow: '0 2px 12px rgba(200,146,42,0.4)',
            } : {}}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 px-5 pb-24 overflow-auto">

        {/* TODAY TAB */}
        {activeTab === 'today' && (
          <div className="space-y-3 animate-fade-in">
            {/* Rest day card */}
            {isRestDay && plan && (
              <div className="skanda-card p-5 border-skanda-gold/10 text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: 'rgba(90,50,200,0.12)', border: '1px solid rgba(90,50,200,0.25)' }}>
                  <Moon className="w-7 h-7 text-violet-400" />
                </div>
                <p className="font-cinzel font-bold text-skanda-text text-lg mb-1">Recovery Day</p>
                <p className="text-skanda-dim text-sm mb-4 leading-relaxed">
                  Rest is where the growth happens. Your muscles rebuild stronger during recovery — this day is part of the plan.
                </p>
                <div className="space-y-2 text-left mb-4">
                  {[
                    '7–9 hours of sleep tonight',
                    'Hit your protein target to fuel repair',
                    'Light walk or stretching is fine',
                    'Hydrate well — aim for 2–3 L water',
                  ].map((tip, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-skanda-gold text-xs shrink-0 mt-0.5">→</span>
                      <p className="text-skanda-dim text-xs">{tip}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate('/nutrition')}
                  className="btn-ghost w-full py-2.5 text-xs font-semibold"
                >
                  Log Today's Nutrition
                </button>
              </div>
            )}

            {/* Home Training card — always accessible */}
            <button
              onClick={() => navigate('/home-workouts')}
              className="skanda-card p-4 w-full flex items-center justify-between hover:border-skanda-gold/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(96,165,250,0.1)' }}>
                  <Dumbbell className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="text-skanda-text text-sm font-semibold">Home Training</p>
                  <p className="text-skanda-dim text-xs">Calisthenics · No gym required</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-skanda-muted" />
            </button>

            {(!isRestDay || !plan) && todayDay ? (
              <>
                <div className="skanda-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-cinzel font-bold text-skanda-text">{todayDay.day_name}</p>
                      <p className="text-skanda-dim text-xs mt-0.5">{todayDay.focus}</p>
                    </div>
                    <button
                      onClick={() => navigate('/workout', { state: { day: todayDay, plan } })}
                      className="btn-gold px-4 py-2 text-xs flex items-center gap-1.5 font-bold"
                    >
                      <Play className="w-3 h-3" /> BEGIN
                    </button>
                  </div>
                  <div className="space-y-2">
                    {todayDay.exercises?.slice(0, 4).map((ex, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-skanda-border last:border-0">
                        <span className="text-skanda-text text-sm">{ex.name}</span>
                        <span className="text-skanda-dim text-xs">{ex.sets}×{ex.reps}</span>
                      </div>
                    ))}
                    {(todayDay.exercises?.length || 0) > 4 && (
                      <p className="text-skanda-muted text-xs text-center pt-1">
                        +{todayDay.exercises.length - 4} more exercises
                      </p>
                    )}
                  </div>
                </div>

                {/* Nutrition CTA */}
                <button
                  onClick={() => navigate('/nutrition')}
                  className="skanda-card p-4 w-full flex items-center justify-between hover:border-skanda-gold/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-skanda-gold/10 flex items-center justify-center">
                      <Utensils className="w-4 h-4 text-skanda-gold" />
                    </div>
                    <div className="text-left">
                      <p className="text-skanda-text text-sm font-semibold">Log Nutrition</p>
                      <p className="text-skanda-dim text-xs">
                        {Math.round(todayTotals.calories)} / {targets.calories} kcal today
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-skanda-muted" />
                </button>
              </>
            ) : (
              <div className="text-center py-16">
                <p className="text-skanda-muted text-sm mb-4">No plan loaded yet.</p>
                <button onClick={() => navigate('/ai')} className="btn-gold px-6 py-3 text-sm font-bold">
                  Generate Battle Plan
                </button>
              </div>
            )}
          </div>
        )}

        {/* WEEK TAB */}
        {activeTab === 'week' && (
          <div className="space-y-2 animate-fade-in">
            {plan?.days?.length ? plan.days.map((day, i) => (
              <div key={i} className="skanda-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-skanda-text">{day.day_name}</p>
                    <p className="text-skanda-dim text-xs mt-0.5">{day.focus}</p>
                  </div>
                  <span className="text-skanda-muted text-xs">{day.exercises?.length || 0} ex</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {day.exercises?.slice(0, 3).map((ex, j) => (
                    <span key={j} className="text-xs bg-skanda-surface text-skanda-dim px-2 py-0.5 rounded-full border border-skanda-border">
                      {ex.name}
                    </span>
                  ))}
                </div>
              </div>
            )) : (
              <div className="text-center py-16">
                <p className="text-skanda-muted text-sm mb-4">No weekly plan yet.</p>
                <button onClick={() => navigate('/ai')} className="btn-gold px-6 py-3 text-sm font-bold">
                  Generate My Plan
                </button>
              </div>
            )}

            {plan?.coaching_note && (
              <div className="skanda-card p-4 border-skanda-gold/20">
                <p className="text-skanda-gold text-xs font-bold uppercase tracking-widest mb-2">Oracle's Note</p>
                <p className="text-skanda-dim text-sm leading-relaxed">{plan.coaching_note}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {upgradeModal && (
        <UpgradeModal reason="insights" onClose={() => setUpgradeModal(false)} />
      )}

      {/* ── Bottom nav ── */}
      <nav className="fixed bottom-0 inset-x-0 safe-bottom"
        style={{ background: 'rgba(6,5,13,0.85)', backdropFilter: 'blur(20px) saturate(1.5)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex max-w-lg mx-auto px-2 py-1">
          {[
            { to: '/dashboard', icon: Flame,     label: 'Home' },
            { to: '/workout',   icon: Dumbbell,  label: 'Train' },
            { to: '/nutrition', icon: Utensils,  label: 'Fuel' },
            { to: '/ai',        icon: Zap,       label: 'Oracle' },
            { to: '/profile',   icon: User,      label: 'Profile' },
          ].map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to
            function handleClick() {
              // Pass today's workout state so WorkoutSession loads immediately
              if (to === '/workout' && todayDay && plan) {
                navigate('/workout', { state: { day: todayDay, plan } })
              } else {
                navigate(to)
              }
            }
            return (
              <button key={to} onClick={handleClick}
                className="flex-1 flex flex-col items-center py-2 gap-0.5 transition-all relative">
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                    style={{ background: 'linear-gradient(90deg, transparent, #c8922a, transparent)' }} />
                )}
                <Icon className={`w-5 h-5 transition-all ${active ? 'text-skanda-gold' : 'text-skanda-muted'}`}
                  style={active ? { filter: 'drop-shadow(0 0 6px rgba(200,146,42,0.7))' } : {}} />
                <span className={`text-[10px] font-semibold uppercase tracking-wide ${active ? 'text-skanda-gold' : 'text-skanda-muted'}`}>
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
