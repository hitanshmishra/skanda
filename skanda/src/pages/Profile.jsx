import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getWeightLogsLocal, isTrialActive, getTrialDaysLeft, trialExpired, getAvatar, saveAvatar } from '../lib/workoutCache'
import { getWeightHistory, upsertProfile, cloudSaveMeasurement } from '../lib/supabase'
import { getMeasurements, saveMeasurement, getLatestMeasurement, MEASUREMENT_FIELDS } from '../lib/measurements'
import { getReminderSettings, saveReminderSettings, requestNotificationPermission, getNotificationPermission } from '../lib/pushNotifications'
import { ChevronLeft, ChevronRight, LogOut, RotateCcw, Crown, Shield, Zap, TrendingUp, TrendingDown, Minus, Scale, Pencil, Check, X, History, Camera, Ruler, Bell, BellOff, Sun, Moon, Share2 } from 'lucide-react'

function resizeImageToDataUrl(file, size = 200) {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        // Square center-crop then scale
        const side = Math.min(img.width, img.height)
        const sx = (img.width - side) / 2
        const sy = (img.height - side) / 2
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

const TIER_CONFIG = {
  arambha: { label: 'ARAMBHA', subtitle: 'The Beginning',      css: 'tier-arambha', icon: '🌱' },
  veer:    { label: 'VEER',    subtitle: 'The Brave Warrior',   css: 'tier-veer',    icon: '⚔️' },
  skanda:  { label: 'SKANDA',  subtitle: 'The God Tier',        css: 'tier-skanda',  icon: '👑' },
}
const GOAL_LABELS = { muscle_gain: 'Muscle Gain', fat_loss: 'Cut & Lean', performance: 'Performance' }

export default function Profile() {
  const navigate = useNavigate()
  const { profile, session, logout, setProfile } = useAuth()
  const [weightLogs, setWeightLogs]   = useState([])
  const [editing, setEditing]         = useState(false)
  const [saving, setSaving]           = useState(false)
  const [editForm, setEditForm]       = useState({})
  const [avatar, setAvatar]           = useState(() => getAvatar())
  const [avatarLoading, setAvatarLoading] = useState(false)
  const fileInputRef                  = useRef(null)
  const [measureLogs, setMeasureLogs]   = useState(() => getMeasurements())
  const [addingMeasure, setAddingMeasure] = useState(false)
  const [measureForm, setMeasureForm]   = useState({})
  const [showMeasureHistory, setShowMeasureHistory] = useState(false)
  const [reminder, setReminder]   = useState(() => getReminderSettings())
  const [notifPerm, setNotifPerm] = useState(() => getNotificationPermission())
  const [theme, setTheme]         = useState(() => localStorage.getItem('skanda_theme') || 'dark')

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('skanda_theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarLoading(true)
    try {
      const dataUrl = await resizeImageToDataUrl(file, 200)
      saveAvatar(dataUrl)
      setAvatar(dataUrl)
    } finally {
      setAvatarLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function startEdit() {
    setEditForm({
      name:          profile?.name          || '',
      goal:          profile?.goal          || 'muscle_gain',
      weight_lbs:    profile?.weight_lbs    || '',
      days_per_week: profile?.days_per_week || 4,
    })
    setEditing(true)
  }

  async function saveEdit() {
    setSaving(true)
    try {
      const updates = {
        name:          editForm.name.trim() || profile?.name,
        goal:          editForm.goal,
        weight_lbs:    parseFloat(editForm.weight_lbs) || profile?.weight_lbs,
        days_per_week: parseInt(editForm.days_per_week) || profile?.days_per_week,
      }
      if (session?.user?.id) await upsertProfile(session.user.id, updates)
      setProfile({ ...profile, ...updates })
      setEditing(false)
    } catch {
      // silently fall back
    } finally {
      setSaving(false)
    }
  }

  function startMeasure() {
    const latest = getLatestMeasurement()
    const defaults = {}
    MEASUREMENT_FIELDS.forEach(f => {
      defaults[f.key] = latest?.[f.key] ? String(latest[f.key]) : ''
    })
    setMeasureForm(defaults)
    setAddingMeasure(true)
  }

  function confirmMeasure() {
    const values = {}
    MEASUREMENT_FIELDS.forEach(f => {
      const v = parseFloat(measureForm[f.key])
      if (v > 0) values[f.key] = v
    })
    if (Object.keys(values).length === 0) { setAddingMeasure(false); return }
    const entry = saveMeasurement(values)
    if (session?.user?.id) cloudSaveMeasurement(session.user.id, entry)
    setMeasureLogs(getMeasurements())
    setAddingMeasure(false)
  }

  async function toggleReminder() {
    if (!reminder.enabled) {
      const perm = await requestNotificationPermission()
      setNotifPerm(perm)
      if (perm !== 'granted') return
      const updated = { ...reminder, enabled: true }
      setReminder(updated)
      saveReminderSettings(updated)
    } else {
      const updated = { ...reminder, enabled: false }
      setReminder(updated)
      saveReminderSettings(updated)
    }
  }

  function updateReminderTime(hour, minute) {
    const updated = { ...reminder, hour, minute }
    setReminder(updated)
    saveReminderSettings(updated)
  }

  useEffect(() => {
    async function loadWeightHistory() {
      if (session?.user?.id) {
        const remote = await getWeightHistory(session.user.id, 12)
        if (remote.length > 0) { setWeightLogs(remote); return }
      }
      setWeightLogs(getWeightLogsLocal().slice(0, 12))
    }
    loadWeightHistory()
  }, [session?.user?.id])

  const tier   = TIER_CONFIG[profile?.tier] || TIER_CONFIG.arambha
  const score  = profile?.tier_score || 0

  function handleLogout() {
    logout()
    navigate('/')
  }

  function handleRetest() {
    navigate('/trials')
  }

  const stats = [
    { label: 'Tier Score',   value: `${score}/100` },
    { label: 'Goal',         value: GOAL_LABELS[profile?.goal] || '—' },
    { label: 'Weight',       value: profile?.weight_lbs ? `${profile.weight_lbs} lbs` : '—' },
  ]

  const test = profile?.test_data
  const testStats = test ? [
    { label: 'Push-ups', value: test.pushups },
    { label: 'Pull-ups', value: test.pullups },
    { label: 'Bench',    value: `${test.bench_lbs} lbs` },
    { label: 'Squat',    value: `${test.squat_lbs} lbs` },
    { label: 'Mile',     value: test.mile_secs ? `${Math.floor(test.mile_secs/60)}:${String(test.mile_secs%60).padStart(2,'0')}` : '—' },
  ] : []

  return (
    <div className="min-h-dvh bg-skanda-bg flex flex-col">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 flex items-center justify-between border-b border-skanda-border">
        <button onClick={() => navigate('/dashboard')} className="text-skanda-dim hover:text-skanda-text">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-cinzel font-bold text-skanda-text">PROFILE</h1>
        <button onClick={() => navigate('/share-card')}
          className="w-9 h-9 rounded-xl bg-skanda-gold/10 border border-skanda-gold/30 flex items-center justify-center">
          <Share2 className="w-4 h-4 text-skanda-gold" />
        </button>
      </header>

      <div className="flex-1 overflow-auto px-5 py-5 pb-10">
        {/* Hero */}
        <div className="text-center mb-6 relative">
          {/* Avatar circle — tap to change */}
          <div className="relative w-20 h-20 mx-auto mb-3">
            <div className="w-20 h-20 rounded-full bg-skanda-surface border-2 border-skanda-border flex items-center justify-center overflow-hidden">
              {avatar
                ? <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                : <span className="text-3xl">{tier.icon}</span>
              }
            </div>
            {/* Camera overlay button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarLoading}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
              style={{ background: 'linear-gradient(135deg, #b87820, #d8a030)', border: '2px solid #06050d' }}
              title="Change profile picture"
            >
              {avatarLoading
                ? <span className="w-3 h-3 border border-black/40 border-t-black rounded-full animate-spin" />
                : <Camera className="w-3 h-3 text-skanda-bg" />
              }
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {!editing ? (
            <>
              <h2 className="font-cinzel font-bold text-2xl text-skanda-text">
                {profile?.name || 'Warrior'}
              </h2>
              {profile?.age && (
                <p className="text-skanda-dim text-sm mt-0.5">Age {profile.age}</p>
              )}
              <div className="flex items-center justify-center gap-2 mt-3">
                <span className={`px-3 py-1 rounded-full text-xs font-black ${tier.css}`}>
                  {tier.label}
                </span>
                <span className="text-skanda-muted text-xs">{tier.subtitle}</span>
              </div>
              <button
                onClick={startEdit}
                className="mt-4 flex items-center gap-1.5 mx-auto px-3 py-1.5 rounded-lg text-xs font-semibold text-skanda-muted hover:text-skanda-gold transition-colors border border-skanda-border hover:border-skanda-gold/30"
              >
                <Pencil className="w-3 h-3" /> Edit Profile
              </button>
            </>
          ) : (
            <div className="skanda-card p-4 mt-2 text-left space-y-3">
              <p className="text-skanda-gold text-xs font-bold uppercase tracking-widest mb-1">Edit Profile</p>

              <div>
                <label className="text-skanda-muted text-xs mb-1 block">Name</label>
                <input
                  type="text"
                  className="skanda-input w-full px-3 py-2 text-sm"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Your name"
                  maxLength={40}
                />
              </div>

              <div>
                <label className="text-skanda-muted text-xs mb-1 block">Goal</label>
                <select
                  className="skanda-input w-full px-3 py-2 text-sm bg-skanda-surface"
                  value={editForm.goal}
                  onChange={e => setEditForm(f => ({ ...f, goal: e.target.value }))}
                >
                  <option value="muscle_gain">Muscle Gain</option>
                  <option value="fat_loss">Cut & Lean</option>
                  <option value="performance">Performance</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-skanda-muted text-xs mb-1 block">Weight (lbs)</label>
                  <input
                    type="number"
                    className="skanda-input w-full px-3 py-2 text-sm"
                    value={editForm.weight_lbs}
                    onChange={e => setEditForm(f => ({ ...f, weight_lbs: e.target.value }))}
                    placeholder="lbs"
                    min={50} max={500}
                  />
                </div>
                <div>
                  <label className="text-skanda-muted text-xs mb-1 block">Days / Week</label>
                  <select
                    className="skanda-input w-full px-3 py-2 text-sm bg-skanda-surface"
                    value={editForm.days_per_week}
                    onChange={e => setEditForm(f => ({ ...f, days_per_week: e.target.value }))}
                  >
                    {[3, 4, 5, 6].map(d => <option key={d} value={d}>{d} days</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="btn-gold flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  {saving
                    ? <span className="w-3.5 h-3.5 border-2 border-skanda-bg border-t-transparent rounded-full animate-spin" />
                    : <Check className="w-3.5 h-3.5" />
                  }
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  disabled={saving}
                  className="btn-ghost px-4 py-2.5 text-xs flex items-center justify-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {stats.map(({ label, value }) => (
            <div key={label} className="skanda-card p-3 text-center">
              <p className="text-skanda-text font-bold text-sm">{value}</p>
              <p className="text-skanda-muted text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Six Trials baseline */}
        {testStats.length > 0 && (
          <div className="mb-5">
            <p className="text-skanda-dim text-xs uppercase tracking-widest mb-3">Six Trials Baseline</p>
            <div className="skanda-card divide-y divide-skanda-border">
              {testStats.map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-4 py-3">
                  <span className="text-skanda-dim text-sm">{label}</span>
                  <span className="text-skanda-text font-semibold text-sm">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weight history — empty state */}
        {weightLogs.length === 0 && (
          <div className="mb-5">
            <p className="text-skanda-dim text-xs uppercase tracking-widest mb-3">Weight History</p>
            <div className="skanda-card p-5 flex flex-col items-center gap-3 text-center">
              <Scale className="w-8 h-8 text-skanda-muted" />
              <div>
                <p className="text-skanda-dim text-sm">No weigh-ins yet</p>
                <p className="text-skanda-muted text-xs mt-1">Log your first check-in from the Dashboard</p>
              </div>
              <button onClick={() => navigate('/dashboard')}
                className="btn-ghost px-4 py-2 text-xs">
                Go to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Weight history */}
        {weightLogs.length > 0 && (() => {
          const latest  = weightLogs[0].weight_lbs
          const oldest  = weightLogs[weightLogs.length - 1].weight_lbs
          const delta   = latest - oldest
          const abs     = Math.abs(delta).toFixed(1)
          const goal    = profile?.goal
          // Trend icon and colour
          const TrendIcon = delta < -0.5 ? TrendingDown : delta > 0.5 ? TrendingUp : Minus
          const trendColor = delta < -0.5
            ? (goal === 'fat_loss' ? '#34d399' : '#f87171')
            : delta > 0.5
            ? (goal === 'muscle_gain' ? '#34d399' : '#f87171')
            : '#7a7098'
          const trendLabel = delta < -0.5 ? `−${abs} lbs` : delta > 0.5 ? `+${abs} lbs` : 'Stable'

          // Mini SVG sparkline
          const pts = [...weightLogs].reverse()
          const vals = pts.map(l => l.weight_lbs)
          const min = Math.min(...vals) - 2
          const max = Math.max(...vals) + 2
          const W = 200, H = 40
          const toX = (i) => (i / (pts.length - 1)) * W
          const toY = (v) => H - ((v - min) / (max - min)) * H
          const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p.weight_lbs).toFixed(1)}`).join(' ')

          return (
            <div className="mb-5">
              <p className="text-skanda-dim text-xs uppercase tracking-widest mb-3">Weight History</p>
              <div className="skanda-card p-4">
                {/* Header row */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-skanda-text font-bold text-2xl">{latest} <span className="text-skanda-dim text-sm font-normal">lbs</span></p>
                    <p className="text-skanda-muted text-xs">Current · logged {new Date(weightLogs[0].logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: trendColor + '18', border: `1px solid ${trendColor}40` }}>
                    <TrendIcon className="w-4 h-4" style={{ color: trendColor }} />
                    <span className="text-xs font-bold" style={{ color: trendColor }}>{trendLabel}</span>
                  </div>
                </div>

                {/* Sparkline */}
                {pts.length > 1 && (
                  <div className="mb-3">
                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 40 }}>
                      <path d={path} fill="none" stroke="#c8922a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      {pts.map((p, i) => (
                        <circle key={i} cx={toX(i)} cy={toY(p.weight_lbs)} r={i === pts.length - 1 ? 3 : 2}
                          fill={i === pts.length - 1 ? '#c8922a' : '#c8922a80'} />
                      ))}
                    </svg>
                  </div>
                )}

                {/* Last 5 entries */}
                <div className="space-y-1.5">
                  {weightLogs.slice(0, 5).map((log, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-skanda-muted text-xs">
                        {new Date(log.logged_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      <span className={`text-xs font-semibold ${i === 0 ? 'text-skanda-gold' : 'text-skanda-dim'}`}>
                        {log.weight_lbs} lbs
                      </span>
                    </div>
                  ))}
                </div>

                {weightLogs.length > 1 && (
                  <p className="text-skanda-muted text-xs mt-3 pt-3 border-t border-skanda-border">
                    Starting weight: <span className="text-skanda-dim font-semibold">{oldest} lbs</span> · {weightLogs.length} check-ins total
                  </p>
                )}
              </div>
            </div>
          )
        })()}

        {/* Body Measurements */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-skanda-dim text-xs uppercase tracking-widest">Body Measurements</p>
            {!addingMeasure && (
              <button onClick={startMeasure}
                className="text-skanda-gold text-xs font-semibold flex items-center gap-1">
                <Ruler className="w-3 h-3" /> Log Today
              </button>
            )}
          </div>

          {/* Log form */}
          {addingMeasure && (
            <div className="skanda-card p-4 mb-3 space-y-3 animate-slide-up">
              <p className="text-skanda-gold text-xs font-bold uppercase tracking-widest">Log Measurements</p>
              <div className="grid grid-cols-2 gap-3">
                {MEASUREMENT_FIELDS.map(field => (
                  <div key={field.key}>
                    <label className="text-skanda-muted text-xs mb-1 block">{field.label} ({field.unit})</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      className="skanda-input w-full px-3 py-2 text-sm"
                      placeholder="0.0"
                      value={measureForm[field.key] || ''}
                      onChange={e => setMeasureForm(f => ({ ...f, [field.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={confirmMeasure} className="btn-gold flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Save
                </button>
                <button onClick={() => setAddingMeasure(false)} className="btn-ghost px-4 py-2.5 text-xs flex items-center justify-center gap-1">
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              </div>
            </div>
          )}

          {/* Latest measurements display */}
          {measureLogs.length > 0 ? (() => {
            const latest = measureLogs[0]
            const prev   = measureLogs[1]
            return (
              <div className="skanda-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-skanda-muted text-xs">
                    {new Date(latest.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  {measureLogs.length > 1 && (
                    <button onClick={() => setShowMeasureHistory(h => !h)}
                      className="text-skanda-dim text-xs hover:text-skanda-gold transition-colors">
                      {showMeasureHistory ? 'Hide history' : `History (${measureLogs.length})`}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {MEASUREMENT_FIELDS.map(field => {
                    const val  = latest[field.key]
                    const pval = prev?.[field.key]
                    if (!val) return null
                    const delta = pval ? val - pval : null
                    const good  = delta !== null ? (field.goal === 'down' ? delta < -0.1 : delta > 0.1) : null
                    const bad   = delta !== null ? (field.goal === 'down' ? delta > 0.1 : delta < -0.1) : null
                    return (
                      <div key={field.key} className="flex items-center justify-between py-1 border-b border-skanda-border/40">
                        <span className="text-skanda-dim text-xs">{field.label}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-skanda-text text-sm font-semibold">{val}″</span>
                          {delta !== null && Math.abs(delta) > 0.05 && (
                            <span className={`text-[10px] font-semibold ${good ? 'text-emerald-400' : bad ? 'text-red-400' : 'text-skanda-muted'}`}>
                              {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* History rows */}
                {showMeasureHistory && measureLogs.length > 1 && (
                  <div className="mt-3 pt-3 border-t border-skanda-border space-y-2">
                    {measureLogs.slice(1, 6).map((log, i) => (
                      <div key={log.id} className="flex items-center justify-between">
                        <span className="text-skanda-muted text-xs">
                          {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex gap-3 text-xs text-skanda-dim">
                          {MEASUREMENT_FIELDS.filter(f => log[f.key]).slice(0, 3).map(f => (
                            <span key={f.key}>{f.label.split(' ')[0]}: {log[f.key]}″</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })() : !addingMeasure && (
            <div className="skanda-card p-5 flex flex-col items-center gap-3 text-center">
              <Ruler className="w-8 h-8 text-skanda-muted" />
              <div>
                <p className="text-skanda-dim text-sm">No measurements yet</p>
                <p className="text-skanda-muted text-xs mt-1">Track waist, chest, arms & thighs over time</p>
              </div>
            </div>
          )}
        </div>

        {/* Subscription */}
        <div className="mb-5">
          <p className="text-skanda-dim text-xs uppercase tracking-widest mb-3">War Tier</p>
          <div className="skanda-card p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                {isTrialActive() ? (
                  <>
                    <p className="font-cinzel font-bold text-skanda-text">Free Trial</p>
                    <p className="text-skanda-dim text-xs mt-0.5">{getTrialDaysLeft()} day{getTrialDaysLeft() !== 1 ? 's' : ''} remaining · All features unlocked</p>
                  </>
                ) : trialExpired() ? (
                  <>
                    <p className="font-cinzel font-bold text-skanda-text">Free Plan</p>
                    <p className="text-skanda-dim text-xs mt-0.5">Trial ended · Limited features</p>
                  </>
                ) : (
                  <>
                    <p className="font-cinzel font-bold text-skanda-text">Free Plan</p>
                    <p className="text-skanda-dim text-xs mt-0.5">Complete the Six Trials to start your trial</p>
                  </>
                )}
              </div>
              {isTrialActive() ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  TRIAL
                </span>
              ) : trialExpired() ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-skanda-surface text-skanda-dim border border-skanda-border">
                  FREE
                </span>
              ) : null}
            </div>
            {isTrialActive() && (
              <div className="space-y-2 mb-4">
                {[
                  { icon: Zap,    text: 'Unlimited Oracle AI insights' },
                  { icon: Shield, text: 'AI Vision meal scanning' },
                  { icon: Crown,  text: 'Weekly adaptive program evolution' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-skanda-gold" />
                    <span className="text-skanda-dim text-xs">{text}</span>
                  </div>
                ))}
              </div>
            )}
            {trialExpired() && (
              <div className="space-y-2 mb-4">
                {[
                  { icon: Shield, text: '3 meal scans / week',      active: true },
                  { icon: Zap,    text: '1 Oracle insight / day',    active: true },
                  { icon: Crown,  text: 'Weekly plan evolution',     active: false },
                ].map(({ icon: Icon, text, active }) => (
                  <div key={text} className="flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 ${active ? 'text-skanda-gold' : 'text-skanda-muted'}`} />
                    <span className={`text-xs ${active ? 'text-skanda-dim' : 'text-skanda-muted line-through'}`}>{text}</span>
                  </div>
                ))}
              </div>
            )}
            <button className="btn-gold w-full py-2.5 text-xs font-bold">
              UPGRADE TO PRO — $4.99/mo
            </button>
            <p className="text-center text-skanda-muted text-xs mt-2">
              India pricing: ₹199/mo · Cancel anytime
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={() => navigate('/history')}
            className="skanda-card px-4 py-3.5 w-full flex items-center justify-between hover:border-skanda-gold/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-skanda-gold/10 flex items-center justify-center">
                <History className="w-4 h-4 text-skanda-gold" />
              </div>
              <span className="text-skanda-text text-sm">Battle Log</span>
            </div>
            <ChevronRight className="w-4 h-4 text-skanda-muted" />
          </button>

          <button
            onClick={handleRetest}
            className="skanda-card px-4 py-3.5 w-full flex items-center justify-between hover:border-skanda-gold/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-skanda-gold/10 flex items-center justify-center">
                <RotateCcw className="w-4 h-4 text-skanda-gold" />
              </div>
              <span className="text-skanda-text text-sm">Re-take Six Trials</span>
            </div>
            <ChevronRight className="w-4 h-4 text-skanda-muted" />
          </button>

          {/* Theme toggle */}
          <div className="skanda-card px-4 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: theme === 'light' ? 'rgba(160,106,16,0.12)' : 'rgba(255,255,255,0.05)' }}>
                  {theme === 'light'
                    ? <Sun  className="w-4 h-4 text-skanda-gold" />
                    : <Moon className="w-4 h-4 text-skanda-dim" />
                  }
                </div>
                <div>
                  <p className="text-skanda-text text-sm">{theme === 'light' ? 'Light Mode' : 'Dark Mode'}</p>
                  <p className="text-skanda-muted text-xs mt-0.5">{theme === 'light' ? 'Parchment theme' : 'Midnight theme'}</p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative w-11 h-6 rounded-full transition-colors ${theme === 'light' ? 'bg-skanda-gold' : 'bg-skanda-surface border border-skanda-border'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${theme === 'light' ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>

          {/* Daily reminder */}
          <div className="skanda-card px-4 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${reminder.enabled ? 'bg-skanda-gold/10' : 'bg-skanda-surface'}`}>
                  {reminder.enabled
                    ? <Bell className="w-4 h-4 text-skanda-gold" />
                    : <BellOff className="w-4 h-4 text-skanda-muted" />
                  }
                </div>
                <div>
                  <p className="text-skanda-text text-sm">Daily Reminder</p>
                  {notifPerm === 'denied' && (
                    <p className="text-red-400 text-xs mt-0.5">Notifications blocked in browser settings</p>
                  )}
                  {notifPerm === 'unsupported' && (
                    <p className="text-skanda-muted text-xs mt-0.5">Not supported on this browser</p>
                  )}
                </div>
              </div>
              {notifPerm !== 'denied' && notifPerm !== 'unsupported' && (
                <button
                  onClick={toggleReminder}
                  className={`relative w-11 h-6 rounded-full transition-colors ${reminder.enabled ? 'bg-skanda-gold' : 'bg-skanda-surface border border-skanda-border'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${reminder.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              )}
            </div>
            {reminder.enabled && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-skanda-dim text-xs">Remind me at</span>
                <select
                  className="skanda-input px-2 py-1 text-xs bg-skanda-surface"
                  value={reminder.hour}
                  onChange={e => updateReminderTime(parseInt(e.target.value), reminder.minute)}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                    </option>
                  ))}
                </select>
                <select
                  className="skanda-input px-2 py-1 text-xs bg-skanda-surface"
                  value={reminder.minute}
                  onChange={e => updateReminderTime(reminder.hour, parseInt(e.target.value))}
                >
                  {[0, 15, 30, 45].map(m => (
                    <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                  ))}
                </select>
                <span className="text-skanda-muted text-xs">daily</span>
              </div>
            )}
            {reminder.enabled && (
              <p className="text-skanda-muted text-[10px] mt-1.5">
                Fires when you open the app after the set time each day
              </p>
            )}
          </div>

          {session?.user?.email === 'hitanshmishra10@gmail.com' && (
            <button
              onClick={() => navigate('/admin')}
              className="skanda-card px-4 py-3.5 w-full flex items-center justify-between hover:border-skanda-gold/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-skanda-gold/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-skanda-gold" />
                </div>
                <span className="text-skanda-text text-sm">Command Center</span>
              </div>
              <ChevronRight className="w-4 h-4 text-skanda-muted" />
            </button>
          )}

          <button
            onClick={handleLogout}
            className="skanda-card px-4 py-3.5 w-full flex items-center justify-between hover:border-red-900/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-950/30 flex items-center justify-center">
                <LogOut className="w-4 h-4 text-red-400" />
              </div>
              <span className="text-red-400 text-sm">Sign Out</span>
            </div>
            <ChevronRight className="w-4 h-4 text-skanda-muted" />
          </button>
        </div>

        <p className="text-center text-skanda-muted text-xs mt-6">
          SKANDA · Ethical billing · Clear renewal reminders · One-tap cancel
        </p>
      </div>
    </div>
  )
}
