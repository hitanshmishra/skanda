import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { generateWorkoutPlan } from '../lib/claude'
import { saveWorkoutPlan } from '../lib/supabase'
import { cachePlan, generateLocalPlan } from '../lib/workoutCache'
import { useAuth } from '../hooks/useAuth'
import { Sparkles, ChevronRight } from 'lucide-react'

const TIER_CONFIG = {
  arambha: {
    label: 'ARAMBHA',
    subtitle: 'The Beginning',
    desc: 'Every warrior starts somewhere. SKANDA builds your foundation with precision — form, consistency, progressive overload. In 90 days you will not recognize the beginning.',
    color: '#9a88c8',
    bg: 'from-purple-950/40 to-skanda-bg',
    border: 'border-purple-800/40',
    icon: '🌱',
    qualities: ['Foundation training', 'Form mastery', '3-4 days/week'],
  },
  veer: {
    label: 'VEER',
    subtitle: 'The Brave Warrior',
    desc: 'You have proven your commitment. SKANDA now deploys intermediate periodization — volume blocks, intensity cycles, and weekly evolution. The plateau is not in your future.',
    color: '#e0a93a',
    bg: 'from-amber-950/40 to-skanda-bg',
    border: 'border-amber-700/40',
    icon: '⚔️',
    qualities: ['Intermediate periodization', 'Upper/Lower split', '4-5 days/week'],
  },
  skanda: {
    label: 'SKANDA',
    subtitle: 'The God Tier',
    desc: 'You stand with the elite. Your program runs at high intensity, maximum volume, and full periodization complexity. The Oracle holds nothing back.',
    color: '#e8c060',
    bg: 'from-yellow-950/40 to-skanda-bg',
    border: 'border-yellow-600/40',
    icon: '👑',
    qualities: ['PPL / Advanced split', 'Max volume & intensity', '5-6 days/week'],
  },
}

export default function TierReveal() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { session, profile } = useAuth()

  const { tier: tierResult, profile: profileData } = location.state || {}
  const tierKey   = tierResult?.tier || profile?.tier || 'arambha'
  const config    = TIER_CONFIG[tierKey] || TIER_CONFIG.arambha
  const score     = tierResult?.score || profile?.tier_score || 0

  const [phase, setPhase]       = useState(0)  // 0=reveal, 1=traits, 2=plan-gen
  const [generating, setGen]    = useState(false)
  const [genDone, setGenDone]   = useState(false)
  const [genError, setGenError] = useState('')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 600)
    const t2 = setTimeout(() => setPhase(2), 1400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  async function handleGeneratePlan() {
    setGen(true)
    setGenError('')
    try {
      const p          = profileData || profile
      const daysPerWeek = p?.days_per_week || (tierKey === 'skanda' ? 5 : tierKey === 'veer' ? 4 : 3)
      const planParams  = {
        tier: tierKey,
        goal: p?.goal || 'muscle_gain',
        weight: p?.weight_lbs || 175,
        daysPerWeek,
        testData: p?.test_data || { pushups: 0, pullups: 0, bench_lbs: 0, squat_lbs: 0, mile_secs: 480 },
      }

      let plan
      try {
        // Try Claude first
        plan = await generateWorkoutPlan(planParams)
      } catch {
        // Fallback: generate locally — no API needed
        plan = generateLocalPlan(planParams)
      }

      if (session?.user?.id) {
        await saveWorkoutPlan(session.user.id, {
          week_number: 1,
          plan_json: plan,
          coaching_note: plan.coaching_note,
        })
      }
      cachePlan(plan)
      setGenDone(true)
    } catch (err) {
      setGenError(err.message)
    } finally {
      setGen(false)
    }
  }

  return (
    <div className="min-h-dvh bg-skanda-bg flex flex-col items-center justify-center px-6 py-10 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[400px] h-[400px] rounded-full opacity-10"
          style={{ background: `radial-gradient(circle, ${config.color} 0%, transparent 70%)` }} />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Score ring */}
        <div className={`transition-all duration-700 ${phase >= 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
          <div className="relative w-32 h-32 mx-auto mb-6">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="#1e1b2e" strokeWidth="8" />
              <circle cx="60" cy="60" r="54" fill="none"
                stroke={config.color} strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 54}`}
                strokeDashoffset={`${2 * Math.PI * 54 * (1 - score / 100)}`}
                style={{ transition: 'stroke-dashoffset 1.5s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl">{config.icon}</span>
              <span className="font-cinzel font-black text-lg" style={{ color: config.color }}>
                {score.toFixed(0)}
              </span>
              <span className="text-skanda-dim text-xs">/ 100</span>
            </div>
          </div>
        </div>

        {/* Tier name */}
        <div className={`text-center transition-all duration-700 delay-300 ${phase >= 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-skanda-dim text-xs uppercase tracking-[0.3em] mb-2">The Oracle has spoken</p>
          <h1 className="font-cinzel font-black text-5xl tracking-wider glow-gold mb-1" style={{ color: config.color }}>
            {config.label}
          </h1>
          <p className="text-skanda-dim text-sm tracking-wider">{config.subtitle}</p>
        </div>

        {/* Description */}
        <div className={`mt-6 p-4 rounded-xl border transition-all duration-700 delay-500 ${config.border} bg-gradient-to-b ${config.bg} ${phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-skanda-text text-sm leading-relaxed">{config.desc}</p>
        </div>

        {/* Qualities */}
        <div className={`mt-4 flex flex-wrap gap-2 justify-center transition-all duration-700 delay-700 ${phase >= 1 ? 'opacity-100' : 'opacity-0'}`}>
          {config.qualities.map(q => (
            <span key={q} className="px-3 py-1 rounded-full text-xs font-semibold bg-skanda-surface border border-skanda-border text-skanda-dim">
              {q}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className={`mt-8 space-y-3 transition-all duration-700 delay-1000 ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {!genDone ? (
            <button
              onClick={handleGeneratePlan}
              disabled={generating}
              className="btn-gold w-full py-4 font-cinzel font-bold tracking-wider text-sm flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <span className="w-4 h-4 border-2 border-skanda-bg border-t-transparent rounded-full animate-spin" />
                  Oracle Forging Your Plan...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  GENERATE MY BATTLE PLAN
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-gold w-full py-4 font-cinzel font-bold tracking-wider text-sm flex items-center justify-center gap-2"
            >
              ENTER THE BATTLEFIELD
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {genError && (
            <p className="text-red-400 text-xs text-center">{genError}</p>
          )}

          {!genDone && (
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-ghost w-full py-3 text-sm"
            >
              Skip for now — generate later
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
