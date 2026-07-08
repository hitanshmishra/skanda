import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getRecentSessions, getRecentHomeWorkoutSessions } from '../lib/supabase'
import { getRecentHomeSessions } from '../lib/homeWorkouts'
import { ChevronLeft, Dumbbell, Clock, Zap, Trophy, Calendar, List, ChevronRight, BarChart2 } from 'lucide-react'

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function MonthCalendar({ gymDates, homeDates }) {
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()
    if (isCurrentMonth) return
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const firstDow  = new Date(year, month, 1).getDay()
  const daysInMo  = new Date(year, month + 1, 0).getDate()
  const totalCells = Math.ceil((firstDow + daysInMo) / 7) * 7

  const toKey = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()

  return (
    <div className="skanda-card p-4">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center text-skanda-dim hover:text-skanda-text">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="font-cinzel font-bold text-skanda-text text-sm">{MONTHS[month]} {year}</p>
        <button onClick={nextMonth} disabled={isCurrentMonth}
          className="w-8 h-8 flex items-center justify-center text-skanda-dim hover:text-skanda-text disabled:opacity-30">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-skanda-muted text-[10px] font-bold py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: totalCells }, (_, i) => {
          const dayNum = i - firstDow + 1
          if (dayNum < 1 || dayNum > daysInMo) {
            return <div key={i} />
          }
          const key      = toKey(year, month, dayNum)
          const hasGym   = gymDates.has(key)
          const hasHome  = homeDates.has(key)
          const hasAny   = hasGym || hasHome
          const isToday  = today.getFullYear() === year && today.getMonth() === month && today.getDate() === dayNum
          const isFuture = new Date(year, month, dayNum) > today

          return (
            <div key={i} className="flex flex-col items-center py-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                isToday
                  ? 'border-2 border-skanda-gold text-skanda-gold'
                  : hasAny
                  ? 'text-skanda-bg font-bold'
                  : isFuture
                  ? 'text-skanda-muted/30'
                  : 'text-skanda-muted'
              }`}
                style={hasAny ? {
                  background: hasGym && hasHome
                    ? 'linear-gradient(135deg, #c8922a, #a78bfa)'
                    : hasGym ? '#c8922a' : '#a78bfa',
                  boxShadow: hasAny ? '0 0 8px rgba(200,146,42,0.4)' : undefined,
                } : {}}>
                {dayNum}
              </div>
              {/* Dot indicator */}
              <div className="flex gap-0.5 mt-0.5" style={{ minHeight: 4 }}>
                {hasGym  && <div className="w-1 h-1 rounded-full bg-skanda-gold" />}
                {hasHome && <div className="w-1 h-1 rounded-full" style={{ background: '#a78bfa' }} />}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-skanda-border justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-skanda-gold" />
          <span className="text-skanda-muted text-xs">Gym</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#a78bfa' }} />
          <span className="text-skanda-muted text-xs">Home</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full border-2 border-skanda-gold" />
          <span className="text-skanda-muted text-xs">Today</span>
        </div>
      </div>
    </div>
  )
}

function formatDuration(secs) {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7)  return `${diffDays} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: diffDays > 365 ? 'numeric' : undefined })
}

export default function WorkoutHistory() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [sessions,     setSessions]     = useState([])
  const [homeSessions, setHomeSessions] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [view,     setView]     = useState('list')  // 'list' | 'calendar'

  useEffect(() => {
    async function load() {
      if (session?.user?.id) {
        const [gym, home] = await Promise.all([
          getRecentSessions(session.user.id, 90),
          getRecentHomeWorkoutSessions(session.user.id, 90),
        ])
        setSessions(gym)
        setHomeSessions(home)
      } else {
        // Fallback to localStorage home sessions
        setHomeSessions(getRecentHomeSessions().slice(0, 90))
      }
      setLoading(false)
    }
    load()
  }, [session?.user?.id])

  // Build date sets for the calendar — use local date to avoid UTC off-by-one
  const toLocalDate = iso => iso ? new Date(iso).toLocaleDateString('en-CA') : null
  const gymDateSet  = new Set(sessions.map(s => toLocalDate(s.created_at)).filter(Boolean))
  // Only include localStorage sessions when not authenticated (avoids phantom duplicates)
  const localHomeDates = session?.user?.id ? [] : getRecentHomeSessions().map(s => s.date)
  const homeDateSet = new Set([
    ...homeSessions.map(s => toLocalDate(s.completed_at || s.created_at)),
    ...localHomeDates,
  ].filter(Boolean))

  return (
    <div className="min-h-dvh bg-skanda-bg flex flex-col">
      <header className="px-5 pt-6 pb-4 flex items-center justify-between border-b border-skanda-border">
        <button onClick={() => navigate(-1)} className="text-skanda-dim hover:text-skanda-text">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-cinzel font-bold text-skanda-text">BATTLE LOG</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setView(v => v === 'list' ? 'calendar' : 'list')}
            className={`flex items-center gap-1 text-xs font-semibold transition-colors ${view === 'calendar' ? 'text-skanda-gold' : 'text-skanda-dim hover:text-skanda-text'}`}>
            {view === 'calendar' ? <List className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
            {view === 'calendar' ? 'List' : 'Calendar'}
          </button>
          <button onClick={() => navigate('/volume')}
            className="flex items-center gap-1.5 text-xs text-skanda-dim hover:text-skanda-text font-semibold">
            <BarChart2 className="w-3.5 h-3.5" /> Charts
          </button>
          <button onClick={() => navigate('/prs')}
            className="flex items-center gap-1.5 text-xs text-skanda-gold font-semibold">
            <Trophy className="w-3.5 h-3.5" /> PRs
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-5 py-5 pb-10">
        {/* Calendar view */}
        {view === 'calendar' && !loading && (
          <div className="animate-fade-in">
            <MonthCalendar gymDates={gymDateSet} homeDates={homeDateSet} />
            <p className="text-skanda-muted text-xs text-center mt-3">
              {gymDateSet.size + homeDateSet.size === 0
                ? 'No sessions logged yet'
                : `${gymDateSet.size} gym · ${homeDateSet.size} home sessions tracked`
              }
            </p>
          </div>
        )}

        {view === 'list' && loading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skanda-card p-4">
                <div className="shimmer h-4 rounded w-1/2 mb-2" />
                <div className="shimmer h-3 rounded w-1/3" />
              </div>
            ))}
          </div>
        )}

        {view === 'list' && !loading && sessions.length === 0 && (
          <div className="flex flex-col items-center gap-4 mt-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-skanda-surface border border-skanda-border flex items-center justify-center">
              <Calendar className="w-8 h-8 text-skanda-muted" />
            </div>
            <p className="font-cinzel font-bold text-skanda-text text-lg">No Sessions Yet</p>
            <p className="text-skanda-dim text-sm max-w-xs">Complete your first workout to see your battle history here.</p>
            <button onClick={() => navigate('/dashboard')} className="btn-gold px-6 py-3 text-sm font-cinzel font-bold">
              Go to Dashboard
            </button>
          </div>
        )}

        {view === 'list' && !loading && sessions.length > 0 && (
          <>
            {/* Summary bar */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                { label: 'Sessions',     value: sessions.length },
                { label: 'Total Volume', value: `${(sessions.reduce((s, x) => s + (x.total_volume_lbs || 0), 0) / 1000).toFixed(0)}k lbs` },
                { label: 'Total PRs',    value: sessions.reduce((s, x) => s + (x.prs_hit || 0), 0) },
              ].map(({ label, value }) => (
                <div key={label} className="skanda-card p-3 text-center">
                  <p className="text-skanda-text font-bold text-sm">{value}</p>
                  <p className="text-skanda-muted text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {sessions.map((s, i) => {
                const exercises = s.exercises_json || []
                const isOpen = expanded === i

                return (
                  <div key={s.id || i}
                    onClick={() => setExpanded(isOpen ? null : i)}
                    className={`skanda-card p-4 cursor-pointer transition-all ${isOpen ? 'border-skanda-gold/30' : ''}`}
                  >
                    {/* Row header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-cinzel font-bold text-skanda-text text-sm truncate">
                          {s.plan_day_name || 'Workout'}
                        </p>
                        <p className="text-skanda-muted text-xs mt-0.5">{formatDate(s.created_at)}</p>
                      </div>
                      {s.prs_hit > 0 && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-skanda-gold/15 border border-skanda-gold/30 ml-2 shrink-0">
                          <Trophy className="w-2.5 h-2.5 text-skanda-gold" />
                          <span className="text-skanda-gold text-xs font-bold">{s.prs_hit} PR{s.prs_hit !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>

                    {/* Stats pills */}
                    <div className="flex gap-3 mt-2">
                      <div className="flex items-center gap-1 text-skanda-dim text-xs">
                        <Dumbbell className="w-3 h-3 text-skanda-muted" />
                        {(s.total_volume_lbs || 0).toLocaleString()} lbs
                      </div>
                      <div className="flex items-center gap-1 text-skanda-dim text-xs">
                        <Clock className="w-3 h-3 text-skanda-muted" />
                        {formatDuration(s.duration_secs)}
                      </div>
                      <div className="flex items-center gap-1 text-skanda-dim text-xs">
                        <Zap className="w-3 h-3 text-skanda-muted" />
                        {exercises.reduce((t, e) => t + (e.sets_logged || 0), 0)} sets
                      </div>
                    </div>

                    {/* Expanded exercise breakdown */}
                    {isOpen && exercises.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-skanda-border space-y-1.5">
                        {exercises.map((ex, ei) => (
                          <div key={ei} className="flex items-center justify-between">
                            <span className="text-skanda-text text-xs">{ex.name}</span>
                            <div className="flex items-center gap-2 text-xs text-skanda-muted">
                              <span>{ex.sets_logged} sets</span>
                              {ex.logs?.length > 0 && (
                                <span className="text-skanda-dim">
                                  {Math.max(...ex.logs.map(l => l?.weight || 0))} lbs max
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
