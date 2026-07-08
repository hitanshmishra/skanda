import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getRecentSessions } from '../lib/supabase'
import { ChevronLeft, TrendingUp, TrendingDown, Minus, Dumbbell } from 'lucide-react'

// SVG sparkline showing last N max-weight points for one exercise
function Sparkline({ points, color = '#c8922a' }) {
  if (!points || points.length < 2) return (
    <div className="w-20 h-8 flex items-center justify-center">
      <span className="text-skanda-muted text-xs">—</span>
    </div>
  )
  const W = 80, H = 32, PAD = 3
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const scaleX = i => PAD + (i / (points.length - 1)) * (W - PAD * 2)
  const scaleY = v => H - PAD - ((v - min) / range) * (H - PAD * 2)
  const coords = points.map((v, i) => `${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`)
  const polyline = coords.join(' ')
  // Area fill: bottom-left corner → points → bottom-right corner
  const area = `${scaleX(0).toFixed(1)},${H} ${polyline} ${scaleX(points.length - 1).toFixed(1)},${H}`
  const lastX = scaleX(points.length - 1)
  const lastY = scaleY(points[points.length - 1])

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polygon points={area} fill={color} fillOpacity="0.12" />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
    </svg>
  )
}

function TrendIcon({ delta }) {
  if (delta > 0)  return <TrendingUp  className="w-3.5 h-3.5" style={{ color: '#34d399' }} />
  if (delta < 0)  return <TrendingDown className="w-3.5 h-3.5" style={{ color: '#f97316' }} />
  return <Minus className="w-3.5 h-3.5 text-skanda-muted" />
}

export default function VolumeCharts() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function load() {
      if (!session?.user?.id) { setLoading(false); return }
      try {
        const data = await getRecentSessions(session.user.id, 60)
        // Sort oldest-first so sparklines read left = past, right = recent
        setSessions([...data].reverse())
      } catch {
        // Supabase unavailable
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [session?.user?.id])

  // Build per-exercise max-weight history from sessions
  const exerciseMap = {}
  sessions.forEach(s => {
    ;(s.exercises_json || []).forEach(ex => {
      if (!ex.logs?.length) return
      const maxW = Math.max(...ex.logs.map(l => l.weight || 0))
      if (maxW <= 0) return
      if (!exerciseMap[ex.name]) exerciseMap[ex.name] = []
      exerciseMap[ex.name].push(maxW)
    })
  })

  // Build display list: exercises with ≥2 data points, sorted by most recent max weight desc
  const exercises = Object.entries(exerciseMap)
    .filter(([, pts]) => pts.length >= 2)
    .map(([name, pts]) => {
      const last    = pts[pts.length - 1]
      const first   = pts[0]
      const delta   = pts.length >= 2 ? last - pts[pts.length - 2] : 0
      const overall = last - first
      return { name, points: pts.slice(-10), last, delta, overall, count: pts.length }
    })
    .sort((a, b) => b.last - a.last)

  const totalVolume   = sessions.reduce((s, x) => s + (x.total_volume_lbs || 0), 0)
  const totalSessions = sessions.length

  return (
    <div className="min-h-dvh bg-skanda-bg flex flex-col">
      <header className="px-5 pt-6 pb-4 flex items-center gap-3 border-b border-skanda-border">
        <button onClick={() => navigate('/history')} className="text-skanda-dim hover:text-skanda-text">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-cinzel font-bold text-skanda-text">VOLUME CHARTS</h1>
          <p className="text-skanda-dim text-xs">Progressive overload tracking</p>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-5 py-5 pb-10">
        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skanda-card p-4">
                <div className="shimmer h-4 rounded w-1/2 mb-2" />
                <div className="shimmer h-8 rounded w-full" />
              </div>
            ))}
          </div>
        ) : exercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-skanda-surface border border-skanda-border flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-skanda-muted" />
            </div>
            <div>
              <p className="text-skanda-text font-semibold">No data yet</p>
              <p className="text-skanda-dim text-sm mt-1">Complete gym sessions to see progressive overload charts</p>
            </div>
          </div>
        ) : (
          <>
            {/* Summary bar */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="skanda-card p-3 text-center">
                <p className="text-skanda-text font-bold text-sm">{totalSessions}</p>
                <p className="text-skanda-muted text-xs mt-0.5">Sessions (60 days)</p>
              </div>
              <div className="skanda-card p-3 text-center">
                <p className="text-skanda-text font-bold text-sm">{(totalVolume / 1000).toFixed(0)}k lbs</p>
                <p className="text-skanda-muted text-xs mt-0.5">Total Volume</p>
              </div>
            </div>

            <p className="text-skanda-dim text-xs uppercase tracking-widest mb-3">
              {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} tracked
            </p>

            <div className="space-y-2">
              {exercises.map(({ name, points, last, delta, overall, count }) => (
                <div key={name} className="skanda-card px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: exercise info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-skanda-text font-semibold text-sm truncate">{name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-skanda-gold font-bold text-base">{last} lbs</p>
                        <div className="flex items-center gap-0.5">
                          <TrendIcon delta={delta} />
                          {delta !== 0 && (
                            <span className="text-xs font-semibold"
                              style={{ color: delta > 0 ? '#34d399' : '#f97316' }}>
                              {delta > 0 ? '+' : ''}{delta} lbs
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-skanda-muted text-xs mt-0.5">
                        {count} session{count !== 1 ? 's' : ''}
                        {overall !== 0 && (
                          <span style={{ color: overall > 0 ? '#34d399' : '#f97316' }}>
                            {' '}· {overall > 0 ? '+' : ''}{overall} lbs overall
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Right: sparkline */}
                    <div className="shrink-0">
                      <Sparkline
                        points={points}
                        color={overall >= 0 ? '#c8922a' : '#f97316'}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
