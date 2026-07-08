import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getSessionAnalysis } from '../lib/claude'
import { Trophy, Clock, Dumbbell, Zap, ChevronRight, Flame } from 'lucide-react'

export default function WorkoutSummary() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { session: sessionData, dayName, streak } = location.state || {}

  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading]   = useState(true)

  // Guard: navigating directly to /summary without state
  if (!sessionData) {
    return (
      <div className="min-h-dvh bg-skanda-bg flex flex-col items-center justify-center gap-4 px-5">
        <Trophy className="w-12 h-12 text-skanda-muted" />
        <p className="font-cinzel font-bold text-skanda-text text-xl">No Session Data</p>
        <p className="text-skanda-dim text-sm text-center">Complete a workout to see your summary here.</p>
        <button onClick={() => navigate('/dashboard')} className="btn-gold px-6 py-3 font-cinzel font-bold text-sm">
          Return to War Room
        </button>
      </div>
    )
  }

  const volume   = sessionData?.total_volume_lbs || 0
  const duration = sessionData?.duration_secs    || 0
  const prs      = sessionData?.prs_hit          || 0
  const exercises = sessionData?.exercises_json  || []

  useEffect(() => {
    async function fetchAnalysis() {
      try {
        const text = await getSessionAnalysis({
          dayName: dayName || sessionData?.plan_day_name || 'Workout',
          totalVolume: volume,
          durationMins: Math.round(duration / 60),
          prsHit: prs,
          exercises,
        })
        setAnalysis(text)
      } catch {
        setAnalysis('Session complete. Recovery protocol: prioritize 7-9 hours of sleep and hit your protein target within 2 hours.')
      } finally {
        setLoading(false)
      }
    }
    fetchAnalysis()
  }, [])

  function formatDuration(secs) {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return s > 0 ? `${m}m ${s}s` : `${m}m`
  }

  return (
    <div className="min-h-dvh bg-skanda-bg flex flex-col">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden px-5 pt-12 pb-8 text-center"
        style={{ background: 'linear-gradient(to bottom, rgba(200,146,42,0.08) 0%, #06050d 100%)' }}>
        <div className="w-16 h-16 rounded-2xl bg-skanda-gold/20 border border-skanda-gold/30 flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-8 h-8 text-skanda-gold" />
        </div>
        <p className="text-skanda-dim text-xs uppercase tracking-[0.3em] mb-1">Battle Complete</p>
        <h1 className="font-cinzel font-black text-3xl text-skanda-text mb-1">
          {dayName || 'Session Complete'}
        </h1>
        <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
          {prs > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-skanda-gold text-skanda-bg text-xs font-black">
              <Trophy className="w-3 h-3" />
              {prs} Personal Record{prs !== 1 ? 's' : ''} Set
            </div>
          )}
          {streak?.current > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black animate-scale-in"
              style={{ background: 'rgba(251,146,60,0.2)', border: '1px solid rgba(251,146,60,0.5)', color: '#fb923c' }}>
              <Flame className="w-3 h-3" style={{ filter: 'drop-shadow(0 0 4px rgba(251,146,60,0.8))' }} />
              {streak.current} Day Streak{streak.current > 1 && streak.current === streak.longest ? ' 🏆 New Best!' : ''}
            </div>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3 mx-5 mb-5">
        {[
          { icon: Dumbbell, label: 'Total Volume', value: `${volume.toLocaleString()} lbs` },
          { icon: Clock,    label: 'Duration',     value: formatDuration(duration) },
          { icon: Zap,      label: 'Sets Logged',  value: exercises.reduce((s, e) => s + (e?.sets_logged || 0), 0) },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="skanda-card p-3 text-center">
            <Icon className="w-4 h-4 text-skanda-gold mx-auto mb-1" />
            <p className="text-skanda-text font-bold text-sm">{value}</p>
            <p className="text-skanda-muted text-xs">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Oracle debrief ── */}
      <div className="mx-5 mb-5">
        <div className="skanda-card p-4 border-skanda-gold/20">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-skanda-gold" />
            <span className="text-skanda-gold text-xs font-bold uppercase tracking-widest">Oracle Debrief</span>
          </div>
          {loading ? (
            <div className="space-y-2">
              <div className="shimmer h-3 rounded w-full" />
              <div className="shimmer h-3 rounded w-5/6" />
              <div className="shimmer h-3 rounded w-4/6" />
            </div>
          ) : (
            <p className="text-skanda-text text-sm leading-relaxed">{analysis}</p>
          )}
        </div>
      </div>

      {/* ── Exercise breakdown ── */}
      {exercises.length > 0 && (
        <div className="mx-5 mb-5">
          <p className="text-skanda-dim text-xs uppercase tracking-widest mb-3">Exercise Log</p>
          <div className="space-y-2">
            {exercises.map((ex, i) => (
              <div key={i} className="skanda-card px-4 py-3 flex items-center justify-between">
                <span className="text-skanda-text text-sm">{ex.name}</span>
                <div className="flex items-center gap-3 text-xs text-skanda-muted">
                  <span>{ex.sets_logged} sets</span>
                  {ex.logs?.length > 0 && (
                    <span>{ex.logs.reduce((m, l) => Math.max(m, l?.weight || 0), 0)} lbs max</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="px-5 pb-10 space-y-3 mt-auto">
        <button
          onClick={() => navigate('/nutrition')}
          className="btn-gold w-full py-4 font-cinzel font-bold tracking-wider text-sm flex items-center justify-center gap-2"
        >
          LOG YOUR RATIONS
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-ghost w-full py-3 text-sm"
        >
          Return to War Room
        </button>
      </div>
    </div>
  )
}
