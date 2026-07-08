import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { adaptWeeklyPlan } from '../lib/claude'
import { getWorkoutPlans, getRecentSessions, saveWorkoutPlan } from '../lib/supabase'
import { getCachedPlan, cachePlan, getEvolutionsUsed, consumeEvolution, FREE_LIMITS, adaptPlanLocally, isTrialActive, getTrialDaysLeft } from '../lib/workoutCache'
import UpgradeModal from '../components/UpgradeModal'
import { Zap, TrendingUp, RotateCcw, ChevronLeft, ChevronRight, AlertCircle, Crown } from 'lucide-react'

export default function AdaptiveAI() {
  const navigate  = useNavigate()
  const { session, profile } = useAuth()
  const [plans, setPlans]     = useState([])
  const [sessions, setSess]   = useState([])
  const [adapting, setAdapt]  = useState(false)
  const [newPlan, setNewPlan] = useState(null)
  const [error, setError]     = useState('')
  const [selectedWeek, setSelected] = useState(0)
  const [evolutionsUsed, setEvolutionsUsed] = useState(() => getEvolutionsUsed())
  const [upgradeModal, setUpgradeModal]     = useState(false)

  useEffect(() => {
    async function load() {
      if (session?.user?.id) {
        const [p, s] = await Promise.all([
          getWorkoutPlans(session.user.id),
          getRecentSessions(session.user.id, 10),
        ])
        setPlans(p || [])
        setSess(s || [])
      } else {
        const cached = getCachedPlan()
        if (cached) setPlans([{ plan_json: cached, week_number: cached.week_number || 1, created_at: new Date().toISOString() }])
      }
    }
    load()
  }, [session?.user?.id])

  const currentPlanObj = plans[0]
  const currentPlan    = currentPlanObj?.plan_json || getCachedPlan()

  const weekStats = {
    sessions: sessions.filter(s => {
      const d = new Date(s.created_at)
      const now = new Date()
      return (now - d) < 7 * 24 * 60 * 60 * 1000
    }).length,
    totalVolume: sessions.slice(0, 7).reduce((sum, s) => sum + (s.total_volume_lbs || 0), 0),
    prs: sessions.slice(0, 7).reduce((sum, s) => sum + (s.prs_hit || 0), 0),
  }

  async function handleAdapt() {
    if (!currentPlan) {
      setError('No current plan found. Generate a plan first.')
      return
    }
    // Free tier gate — skip during active trial
    if (!isTrialActive() && evolutionsUsed >= FREE_LIMITS.planEvolutions) {
      setUpgradeModal(true)
      return
    }
    setAdapt(true)
    setError('')
    try {
      const params = {
        currentPlan,
        sessions: sessions.slice(0, 7),
        totalVolume: weekStats.totalVolume,
        prsHit: weekStats.prs,
      }

      let adapted
      try {
        adapted = await adaptWeeklyPlan(params)
      } catch {
        // Claude API unavailable (no credits, network issue, etc.)
        // Fall back to local progressive overload engine — always works
        adapted = adaptPlanLocally(params)
      }

      if (session?.user?.id) {
        await saveWorkoutPlan(session.user.id, {
          week_number: adapted.week_number,
          plan_json: adapted,
          coaching_note: adapted.coaching_note,
        })
      }
      cachePlan(adapted)
      consumeEvolution()
      setEvolutionsUsed(getEvolutionsUsed())
      setNewPlan(adapted)
    } catch (err) {
      setError(err.message || 'Oracle adaptation failed. Try again.')
    } finally {
      setAdapt(false)
    }
  }

  const displayPlan = newPlan || currentPlan
  const TIER_CSS = { arambha: 'tier-arambha', veer: 'tier-veer', skanda: 'tier-skanda' }

  return (
    <div className="min-h-dvh bg-skanda-bg flex flex-col">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 flex items-center justify-between border-b border-skanda-border">
        <button onClick={() => navigate('/dashboard')} className="text-skanda-dim hover:text-skanda-text">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h1 className="font-cinzel font-bold text-skanda-text">ORACLE</h1>
          <p className="text-skanda-dim text-xs">Adaptive AI Evolution</p>
        </div>
        <div className="w-5" />
      </header>

      <div className="flex-1 overflow-auto px-5 py-5 pb-10">
        {/* Week stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Sessions', value: weekStats.sessions, icon: TrendingUp },
            { label: 'Volume (lbs)', value: weekStats.totalVolume > 0 ? `${(weekStats.totalVolume/1000).toFixed(1)}k` : '—', icon: Zap },
            { label: 'PRs Hit', value: weekStats.prs, icon: TrendingUp },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="skanda-card p-3 text-center">
              <p className="text-skanda-text font-bold text-lg">{value}</p>
              <p className="text-skanda-muted text-xs">{label}</p>
            </div>
          ))}
        </div>

        {/* Current week indicator */}
        {displayPlan && (
          <div className="skanda-card p-4 mb-4 border-skanda-gold/20">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-skanda-dim text-xs uppercase tracking-widest">Current Program</p>
                <p className="font-cinzel font-bold text-skanda-text">Week {displayPlan.week_number || 1}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${TIER_CSS[profile?.tier] || 'tier-arambha'}`}>
                {(profile?.tier_label || 'ARAMBHA').toUpperCase()}
              </span>
            </div>
            <p className="text-skanda-dim text-sm">{displayPlan.structure}</p>
          </div>
        )}

        {/* Changes from last week */}
        {newPlan?.changes_from_last_week?.length > 0 && (
          <div className="mb-4">
            <p className="text-skanda-dim text-xs uppercase tracking-widest mb-2">This Week's Adaptations</p>
            <div className="space-y-2">
              {newPlan.changes_from_last_week.map((change, i) => (
                <div key={i} className="skanda-card p-3 border-skanda-gold/20 flex gap-2">
                  <Zap className="w-4 h-4 text-skanda-gold shrink-0 mt-0.5" />
                  <p className="text-skanda-text text-sm leading-relaxed">{change}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coaching note */}
        {displayPlan?.coaching_note && (
          <div className="mb-4 skanda-card p-4 border-l-2 border-l-skanda-gold">
            <p className="text-skanda-gold text-xs font-bold uppercase tracking-widest mb-2">Oracle's Counsel</p>
            <p className="text-skanda-text text-sm leading-relaxed">{displayPlan.coaching_note}</p>
          </div>
        )}

        {/* Week plan preview */}
        {displayPlan?.days?.length > 0 && (
          <div className="mb-5">
            <p className="text-skanda-dim text-xs uppercase tracking-widest mb-3">
              Week {displayPlan.week_number || 1} Battle Plan
            </p>
            <div className="space-y-2">
              {displayPlan.days.map((day, i) => (
                <button key={i}
                  onClick={() => navigate('/workout', { state: { day, plan: displayPlan } })}
                  className="skanda-card p-4 w-full text-left flex items-center justify-between hover:border-skanda-gold/30 transition-colors">
                  <div>
                    <p className="text-skanda-text font-semibold text-sm">{day.day_name}</p>
                    <p className="text-skanda-dim text-xs mt-0.5">{day.focus} · {day.exercises?.length || 0} exercises</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-skanda-muted" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Plan history */}
        {plans.length > 1 && (
          <div className="mb-5">
            <p className="text-skanda-dim text-xs uppercase tracking-widest mb-3">Evolution History</p>
            <div className="space-y-2">
              {plans.slice(0, 5).map((p, i) => (
                <div key={i} className="skanda-card px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-skanda-text text-sm">Week {p.week_number || i + 1}</p>
                    <p className="text-skanda-muted text-xs">
                      {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <span className="text-skanda-dim text-xs">{p.plan_json?.structure || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="skanda-card p-3 border-red-900/40 flex gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Free evolution status */}
        {isTrialActive() ? (
          <div className="mb-3 p-3 bg-skanda-gold/5 border border-skanda-gold/20 rounded-xl flex items-center gap-2">
            <Zap className="w-4 h-4 text-skanda-gold shrink-0" />
            <p className="text-skanda-dim text-xs">
              <span className="text-skanda-gold font-semibold">30-day trial active</span> — unlimited evolutions for{' '}
              <span className="text-skanda-gold font-semibold">{getTrialDaysLeft()} more day{getTrialDaysLeft() !== 1 ? 's' : ''}</span>
            </p>
          </div>
        ) : evolutionsUsed < FREE_LIMITS.planEvolutions ? (
          <div className="mb-3 p-3 bg-skanda-gold/5 border border-skanda-gold/20 rounded-xl flex items-center gap-2">
            <Zap className="w-4 h-4 text-skanda-gold shrink-0" />
            <p className="text-skanda-dim text-xs">
              <span className="text-skanda-gold font-semibold">1 free evolution</span> available — unlock unlimited with Pro
            </p>
          </div>
        ) : (
          <div className="mb-3 p-3 bg-skanda-surface border border-skanda-border rounded-xl flex items-center gap-2">
            <Crown className="w-4 h-4 text-skanda-gold shrink-0" />
            <p className="text-skanda-dim text-xs">
              Trial ended. <span className="text-skanda-gold font-semibold">Upgrade to Pro</span> for weekly AI-driven evolution.
            </p>
          </div>
        )}

        {/* Adapt CTA */}
        <button
          onClick={handleAdapt}
          disabled={adapting || !currentPlan}
          className="btn-gold w-full py-4 font-cinzel font-bold tracking-wider text-sm flex items-center justify-center gap-2"
        >
          {adapting ? (
            <>
              <span className="w-4 h-4 border-2 border-skanda-bg border-t-transparent rounded-full animate-spin" />
              Oracle is Analyzing...
            </>
          ) : (
            <>
              <RotateCcw className="w-4 h-4" />
              {newPlan ? 'RE-EVOLVE PLAN' : 'EVOLVE THIS WEEK\'S PLAN'}
            </>
          )}
        </button>
        <p className="text-center text-skanda-muted text-xs mt-2">
          Oracle analyzes your week and explains every change with science reasoning
        </p>
      </div>

      {upgradeModal && (
        <UpgradeModal reason="evolutions" onClose={() => setUpgradeModal(false)} />
      )}
    </div>
  )
}
