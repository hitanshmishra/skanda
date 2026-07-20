import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { ChevronLeft, RefreshCw, Users, Dumbbell, Utensils, Trophy, Camera, Ruler, TrendingUp, Zap, UserPlus } from 'lucide-react'

const ADMIN_EMAIL = 'hitanshmishra10@gmail.com'

const TIER_COLORS = {
  arambha: '#9ca3af',
  veer:    '#a78bfa',
  skanda:  '#c8922a',
}

function StatCard({ icon: Icon, label, value, sub, color = '#c8922a' }) {
  return (
    <div className="skanda-card p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-skanda-muted text-xs uppercase tracking-widest">{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: color + '18' }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
      </div>
      <p className="font-cinzel font-bold text-2xl text-skanda-text">{value ?? '—'}</p>
      {sub && <p className="text-skanda-muted text-xs">{sub}</p>}
    </div>
  )
}

function TierBar({ stats }) {
  const tiers = stats?.tiers || {}
  const total = Object.values(tiers).reduce((s, v) => s + Number(v), 0)
  if (total === 0) return null
  const order = ['arambha', 'veer', 'skanda']
  return (
    <div className="skanda-card p-4">
      <p className="text-skanda-muted text-xs uppercase tracking-widest mb-3">Tier Distribution</p>
      <div className="flex rounded-full overflow-hidden h-4 mb-3">
        {order.map(t => {
          const pct = ((Number(tiers[t] || 0) / total) * 100).toFixed(1)
          if (pct === '0.0') return null
          return (
            <div key={t} style={{ width: pct + '%', background: TIER_COLORS[t] }}
              title={`${t}: ${tiers[t]}`} />
          )
        })}
      </div>
      <div className="flex gap-4 flex-wrap">
        {order.map(t => (
          <div key={t} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: TIER_COLORS[t] }} />
            <span className="text-skanda-muted text-xs capitalize">{t}</span>
            <span className="text-skanda-text text-xs font-bold">{tiers[t] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function timeAgo(iso) {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2)  return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function Admin() {
  const navigate                    = useNavigate()
  const { session, loading: authLoading } = useAuth()
  const [stats,        setStats]        = useState(null)
  const [users,        setUsers]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [usersLoading, setUsersLoading] = useState(false)
  const [error,        setError]        = useState(null)
  const [lastFetch,    setLastFetch]    = useState(null)
  const [activeTab,    setActiveTab]    = useState('stats')

  const isAdmin = session?.user?.email === ADMIN_EMAIL

  useEffect(() => {
    if (!isAdmin) return
    fetchStats()
  }, [isAdmin])

  // Lazy-load users when tab first opens
  useEffect(() => {
    if (!isAdmin || activeTab !== 'users' || users.length > 0) return
    fetchUsers()
  }, [activeTab, isAdmin])

  async function fetchStats() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: rpcError } = await supabase.rpc('get_admin_stats')
      if (rpcError) throw rpcError
      setStats(data)
      setLastFetch(new Date())
    } catch (e) {
      setError(e.message || 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }

  async function fetchUsers() {
    setUsersLoading(true)
    setError(null)
    try {
      const { data, error: rpcError } = await supabase.rpc('get_admin_users')
      if (rpcError) throw rpcError
      setUsers(data || [])
    } catch (e) {
      setError(e.message || 'Failed to load users')
    } finally {
      setUsersLoading(false)
    }
  }

  function handleRefresh() {
    if (activeTab === 'stats') {
      fetchStats()
    } else {
      setUsers([])
      fetchUsers()
    }
  }

  // ── Auth loading ──────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-dvh bg-skanda-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-skanda-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) {
    navigate('/auth', { replace: true })
    return null
  }

  if (!isAdmin) {
    return (
      <div className="min-h-dvh bg-skanda-bg flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-950/30 border border-red-800/30 flex items-center justify-center">
          <Zap className="w-8 h-8 text-red-500" />
        </div>
        <p className="font-cinzel font-bold text-skanda-text">Access Denied</p>
        <p className="text-skanda-dim text-sm">This area is restricted to the SKANDA admin.</p>
        <button onClick={() => navigate('/dashboard')} className="btn-ghost px-6 py-2 text-sm mt-2">
          Go to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-skanda-bg flex flex-col">
      <header className="px-5 pt-6 pb-4 flex items-center gap-3 border-b border-skanda-border">
        <button onClick={() => navigate('/profile')} className="text-skanda-dim hover:text-skanda-text">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-cinzel font-bold text-skanda-text">COMMAND CENTER</h1>
          {lastFetch && (
            <p className="text-skanda-muted text-xs">
              Updated {lastFetch.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <button onClick={handleRefresh} disabled={loading || usersLoading}
          className="w-9 h-9 rounded-xl bg-skanda-surface border border-skanda-border flex items-center justify-center text-skanda-dim hover:text-skanda-text disabled:opacity-40">
          <RefreshCw className={`w-4 h-4 ${(loading || usersLoading) ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-skanda-border px-5">
        {[
          { id: 'stats', label: 'Stats', icon: TrendingUp },
          { id: 'users', label: 'Users', icon: Users },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold uppercase tracking-widest border-b-2 -mb-px transition-colors ${
              activeTab === id
                ? 'border-skanda-gold text-skanda-gold'
                : 'border-transparent text-skanda-muted hover:text-skanda-dim'
            }`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto px-5 py-5 pb-10 space-y-3">

        {/* ── STATS TAB ──────────────────────────────────────────────────── */}
        {activeTab === 'stats' && (
          <>
            {loading && !stats && (
              <div className="grid grid-cols-2 gap-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="skanda-card p-4">
                    <div className="shimmer h-3 rounded w-20 mb-3" />
                    <div className="shimmer h-7 rounded w-12" />
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="skanda-card p-4 border-red-800/30"
                style={{ background: 'rgba(153,27,27,0.1)' }}>
                <p className="text-red-400 text-sm font-semibold">Error loading stats</p>
                <p className="text-red-400/70 text-xs mt-1">{error}</p>
              </div>
            )}

            {stats && (
              <>
                <p className="text-skanda-muted text-xs uppercase tracking-widest pt-1">Users</p>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard icon={Users}    label="Total Users"   value={stats.total_users}    color="#c8922a" />
                  <StatCard icon={UserPlus} label="New This Week" value={stats.new_users_week} color="#34d399"
                    sub="registered in 7 days" />
                </div>

                <TierBar stats={stats} />

                <p className="text-skanda-muted text-xs uppercase tracking-widest pt-2">This Week</p>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard icon={TrendingUp} label="Active Users"   value={stats.active_users_week}  color="#a78bfa"
                    sub="with gym sessions" />
                  <StatCard icon={Dumbbell}   label="Gym Sessions"   value={stats.gym_sessions_week}  color="#c8922a" />
                  <StatCard icon={Zap}        label="Home Sessions"  value={stats.home_sessions_week} color="#a78bfa" />
                  <StatCard icon={Utensils}   label="Nutrition Logs" value={stats.nutrition_logs_week} color="#34d399" />
                </div>

                <p className="text-skanda-muted text-xs uppercase tracking-widest pt-2">All-Time</p>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard icon={Dumbbell} label="Gym Sessions"    value={stats.gym_sessions_total} color="#c8922a" />
                  <StatCard icon={Trophy}   label="PRs Recorded"    value={stats.prs_total}          color="#c8922a" />
                  <StatCard icon={Camera}   label="Progress Photos" value={stats.photos_total}       color="#f97316" />
                  <StatCard icon={Ruler}    label="Measurements"    value={stats.measurements_total} color="#34d399" />
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <StatCard icon={Dumbbell} label="Workout Plans Generated" value={stats.plans_total}
                    sub="AI-generated plans across all users" color="#a78bfa" />
                </div>
              </>
            )}
          </>
        )}

        {/* ── USERS TAB ──────────────────────────────────────────────────── */}
        {activeTab === 'users' && (
          <>
            {usersLoading && (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="skanda-card p-4">
                    <div className="shimmer h-3 rounded w-40 mb-2" />
                    <div className="shimmer h-2.5 rounded w-56 mb-2" />
                    <div className="shimmer h-2.5 rounded w-32" />
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="skanda-card p-4 border-red-800/30"
                style={{ background: 'rgba(153,27,27,0.1)' }}>
                <p className="text-red-400 text-sm font-semibold">Error loading users</p>
                <p className="text-red-400/70 text-xs mt-1">{error}</p>
              </div>
            )}

            {!usersLoading && !error && users.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <Users className="w-8 h-8 text-skanda-muted" />
                <p className="text-skanda-dim text-sm">No users found</p>
              </div>
            )}

            {!usersLoading && users.length > 0 && (
              <>
                <p className="text-skanda-muted text-xs uppercase tracking-widest pt-1">
                  {users.length} warrior{users.length !== 1 ? 's' : ''} registered
                </p>
                <div className="space-y-2">
                  {users.map((u, i) => (
                    <div key={i} className="skanda-card px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-skanda-text text-sm font-semibold truncate">
                            {u.name || <span className="text-skanda-muted italic font-normal">No name set</span>}
                          </p>
                          <p className="text-skanda-dim text-xs truncate mt-0.5">{u.email}</p>
                          <p className="text-skanda-muted text-xs mt-1">
                            Joined {timeAgo(u.joined)}
                            {u.last_seen && (
                              <span> · Last seen {timeAgo(u.last_seen)}</span>
                            )}
                          </p>
                        </div>
                        {u.tier && (
                          <div className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold capitalize"
                            style={{
                              background: TIER_COLORS[u.tier] + '22',
                              color: TIER_COLORS[u.tier],
                              border: `1px solid ${TIER_COLORS[u.tier]}44`,
                            }}>
                            {u.tier}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

      </div>
    </div>
  )
}
