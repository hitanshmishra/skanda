import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getPRs } from '../lib/supabase'
import { ChevronLeft, Trophy, Dumbbell } from 'lucide-react'

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PRBoard() {
  const navigate = useNavigate()
  const { session } = useAuth()

  const [prs,     setPrs]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!session?.user?.id) { setLoading(false); return }
      try {
        const data = await getPRs(session.user.id)
        setPrs(data)
      } catch {
        // Supabase unreachable — show empty board
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [session?.user?.id])

  // Group by exercise name, keep only the best (highest weight, then highest reps)
  const best = Object.values(
    prs.reduce((acc, pr) => {
      const key = pr.exercise_name
      const existing = acc[key]
      const w  = pr.weight_lbs       ?? 0
      const ew = existing?.weight_lbs ?? 0
      if (
        !existing ||
        w > ew ||
        (w === ew && pr.reps > existing.reps)
      ) {
        acc[key] = pr
      }
      return acc
    }, {})
  ).sort((a, b) => b.weight_lbs - a.weight_lbs)

  return (
    <div className="min-h-dvh bg-skanda-bg flex flex-col">
      <header className="px-5 pt-6 pb-4 flex items-center gap-3 border-b border-skanda-border">
        <button onClick={() => navigate('/history')} className="text-skanda-dim hover:text-skanda-text">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-cinzel font-bold text-skanda-text">PR BOARD</h1>
          <p className="text-skanda-dim text-xs">All-time personal records</p>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-5 py-5 pb-10">
        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skanda-card p-4">
                <div className="shimmer h-4 rounded w-1/2 mb-2" />
                <div className="shimmer h-3 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : best.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-skanda-gold/10 border border-skanda-gold/20 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-skanda-gold/50" />
            </div>
            <div>
              <p className="text-skanda-text font-semibold">No PRs Yet</p>
              <p className="text-skanda-dim text-sm mt-1">Complete a gym workout to start tracking records</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-skanda-dim text-xs uppercase tracking-widest mb-3">
              {best.length} exercise{best.length !== 1 ? 's' : ''} tracked
            </p>
            {best.map((pr, i) => (
              <div key={pr.id || i} className="skanda-card px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={i === 0
                    ? { background: 'rgba(200,146,42,0.18)', color: '#c8922a' }
                    : { background: 'rgba(255,255,255,0.05)', color: 'var(--skanda-dim)' }
                  }>
                  {i === 0 ? <Trophy className="w-4 h-4" /> : <Dumbbell className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-skanda-text font-semibold text-sm truncate">{pr.exercise_name}</p>
                  <p className="text-skanda-dim text-xs">{formatDate(pr.created_at)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-skanda-gold font-bold text-base">{pr.weight_lbs != null ? `${pr.weight_lbs} lbs` : 'Bodyweight'}</p>
                  <p className="text-skanda-dim text-xs">{pr.reps} reps</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
