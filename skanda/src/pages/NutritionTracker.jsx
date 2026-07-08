import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { logNutrition, getTodayNutrition, cloudSaveNutritionDay } from '../lib/supabase'
import { Camera, Plus, ChevronLeft, ChevronRight, Utensils, CalendarDays, Flame, TrendingUp, Award } from 'lucide-react'
import { saveNutritionDay, getNutritionStreak, getWeeklyNutritionSummary } from '../lib/workoutCache'

const MACRO_COLORS = {
  calories: '#c8922a',
  protein:  '#a78bfa',
  carbs:    '#34d399',
  fat:      '#f97316',
}

function MacroRing({ value, target, label, color, unit = '' }) {
  const pct  = Math.min(100, Math.round((value / (target || 1)) * 100))
  const circ = 2 * Math.PI * 30
  const offset = circ * (1 - pct / 100)

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-18 h-18">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 70 70" width="72" height="72">
          <circle cx="35" cy="35" r="30" fill="none" stroke="#1e1b2e" strokeWidth="5" />
          <circle cx="35" cy="35" r="30" fill="none" stroke={color} strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-skanda-text font-bold text-sm leading-none">{Math.round(value)}</span>
          {unit && <span className="text-skanda-muted text-xs leading-none">{unit}</span>}
        </div>
      </div>
      <p className="text-skanda-dim text-xs text-center">{label}</p>
      <p className="text-xs font-semibold" style={{ color }}>{pct}%</p>
    </div>
  )
}

const QUICK_FOODS = [
  { name: 'Chicken Breast 150g', cal: 248, p: 46, c: 0, f: 5 },
  { name: 'Greek Yogurt 200g',   cal: 120, p: 17, c: 6,  f: 2 },
  { name: 'Brown Rice 150g',     cal: 162, p: 3,  c: 34, f: 1 },
  { name: 'Eggs × 3',            cal: 216, p: 18, c: 1,  f: 15 },
  { name: 'Whey Protein Shake',  cal: 150, p: 30, c: 5,  f: 2 },
  { name: 'Banana',              cal: 89,  p: 1,  c: 23, f: 0 },
]

export default function NutritionTracker() {
  const navigate  = useNavigate()
  const { session, profile } = useAuth()
  const [logs, setLogs]         = useState([])
  const [showAdd, setShowAdd]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [form, setForm]         = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' })

  const targets = profile?.nutrition_targets || { calories: 2500, protein_g: 175, carbs_g: 300, fat_g: 75 }

  const [streak, setStreak]             = useState(0)
  const [weeklySummary, setWeeklySummary] = useState(null)

  useEffect(() => {
    async function load() {
      if (!session?.user?.id) return
      setLoadingLogs(true)
      try {
        const data = await getTodayNutrition(session.user.id)
        setLogs(data || [])
      } catch {
        // Supabase unavailable — show empty state, don't crash
      } finally {
        setLoadingLogs(false)
      }
    }
    load()
  }, [session?.user?.id])

  // Persist today's totals + recompute streak whenever logs change
  useEffect(() => {
    // Always refresh streak/summary from localStorage (prior days still count)
    setStreak(getNutritionStreak())
    setWeeklySummary(getWeeklyNutritionSummary(targets.calories, targets.protein_g))
    if (logs.length === 0) return
    const t = logs.reduce((acc, l) => ({
      calories: acc.calories + (l.calories || 0),
      protein:  acc.protein  + (l.protein_g || 0),
      carbs:    acc.carbs    + (l.carbs_g   || 0),
      fat:      acc.fat      + (l.fat_g     || 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
    saveNutritionDay(t)
    // Refresh streak/summary after saving today's data
    setStreak(getNutritionStreak())
    setWeeklySummary(getWeeklyNutritionSummary(targets.calories, targets.protein_g))
    // Fire-and-forget cloud backup
    const today = new Date().toISOString().split('T')[0]
    if (session?.user?.id) cloudSaveNutritionDay(session.user.id, today, t)
  }, [logs])

  const totals = logs.reduce((acc, l) => ({
    calories: acc.calories + (l.calories || 0),
    protein:  acc.protein  + (l.protein_g || 0),
    carbs:    acc.carbs    + (l.carbs_g   || 0),
    fat:      acc.fat      + (l.fat_g     || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  async function addQuick(food) {
    setSaving(true)
    const entry = { calories: food.cal, protein_g: food.p, carbs_g: food.c, fat_g: food.f, meal_name: food.name }
    try {
      if (session?.user?.id) await logNutrition(session.user.id, entry)
      setLogs(prev => [...prev, { ...entry, id: Date.now(), created_at: new Date().toISOString() }])
    } catch {
      // Log locally even if Supabase call fails
      setLogs(prev => [...prev, { ...entry, id: Date.now(), created_at: new Date().toISOString() }])
    } finally {
      setSaving(false)
    }
  }

  async function addCustom() {
    if (!form.name || !form.calories) return
    setSaving(true)
    const entry = {
      calories:  parseFloat(form.calories) || 0,
      protein_g: parseFloat(form.protein)  || 0,
      carbs_g:   parseFloat(form.carbs)    || 0,
      fat_g:     parseFloat(form.fat)      || 0,
      meal_name: form.name,
    }
    try {
      if (session?.user?.id) await logNutrition(session.user.id, entry)
      setLogs(prev => [...prev, { ...entry, id: Date.now(), created_at: new Date().toISOString() }])
      setForm({ name: '', calories: '', protein: '', carbs: '', fat: '' })
      setShowAdd(false)
    } catch {
      // Still update local state on failure
      setLogs(prev => [...prev, { ...entry, id: Date.now(), created_at: new Date().toISOString() }])
      setForm({ name: '', calories: '', protein: '', carbs: '', fat: '' })
      setShowAdd(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-dvh bg-skanda-bg flex flex-col">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 flex items-center justify-between border-b border-skanda-border">
        <button onClick={() => navigate('/dashboard')} className="text-skanda-dim hover:text-skanda-text">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-cinzel font-bold text-skanda-text">RATIONS</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/meal-plan')}
            className="w-9 h-9 rounded-xl bg-skanda-surface border border-skanda-border flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-skanda-dim" />
          </button>
          <button onClick={() => navigate('/meal-scan')}
            className="w-9 h-9 rounded-xl bg-skanda-gold/10 border border-skanda-gold/30 flex items-center justify-center">
            <Camera className="w-4 h-4 text-skanda-gold" />
          </button>
        </div>
      </header>

      {/* Macro rings */}
      <div className="mx-5 mt-4 skanda-card p-4">
        {/* Streak badge row */}
        {streak > 0 && (
          <div className="flex items-center justify-between mb-3">
            <p className="text-skanda-dim text-xs uppercase tracking-widest">Today's Macros</p>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)' }}>
              <Flame className="w-3.5 h-3.5" style={{ color: '#f97316' }} />
              <span className="text-xs font-bold" style={{ color: '#f97316' }}>{streak}-day streak</span>
            </div>
          </div>
        )}

        <div className="flex justify-around">
          <MacroRing value={totals.calories} target={targets.calories} label="Calories" color={MACRO_COLORS.calories} />
          <MacroRing value={totals.protein}  target={targets.protein_g} label="Protein"  color={MACRO_COLORS.protein}  unit="g" />
          <MacroRing value={totals.carbs}    target={targets.carbs_g}   label="Carbs"    color={MACRO_COLORS.carbs}    unit="g" />
          <MacroRing value={totals.fat}      target={targets.fat_g}     label="Fat"      color={MACRO_COLORS.fat}      unit="g" />
        </div>

        {/* Calorie bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-skanda-muted mb-1">
            <span>{Math.round(totals.calories)} eaten</span>
            <span>{Math.max(0, targets.calories - Math.round(totals.calories))} remaining</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${Math.min(100, (totals.calories / (targets.calories || 1)) * 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Weekly nutrition summary */}
      {weeklySummary && (
        <div className="mx-5 mt-3 skanda-card p-4"
          style={{ background: 'rgba(167,139,250,0.06)', borderColor: 'rgba(167,139,250,0.2)' }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4" style={{ color: '#a78bfa' }} />
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#a78bfa' }}>This Week</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-skanda-text font-bold text-base leading-none">{weeklySummary.avgCalories}</p>
              <p className="text-skanda-muted text-xs mt-1">avg kcal/day</p>
            </div>
            <div className="text-center border-x border-skanda-border">
              <p className="font-bold text-base leading-none" style={{ color: '#a78bfa' }}>
                {weeklySummary.proteinHits}/{weeklySummary.loggedDays}
              </p>
              <p className="text-skanda-muted text-xs mt-1">protein days</p>
            </div>
            <div className="text-center">
              <p className="text-skanda-text font-bold text-base leading-none">{weeklySummary.loggedDays}</p>
              <p className="text-skanda-muted text-xs mt-1">days logged</p>
            </div>
          </div>
          {weeklySummary.bestDay && (
            <div className="mt-3 pt-3 border-t border-skanda-border flex items-center gap-2">
              <Award className="w-3.5 h-3.5 shrink-0" style={{ color: '#c8922a' }} />
              <p className="text-skanda-muted text-xs">
                Best day: <span className="text-skanda-text font-semibold">
                  {new Date(weeklySummary.bestDay.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span> — {Math.round(weeklySummary.bestDay.protein)}g protein
              </p>
            </div>
          )}
        </div>
      )}

      {/* Quick add */}
      <div className="mx-5 mt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-skanda-dim text-xs uppercase tracking-widest">Quick Add</p>
          <button
            onClick={() => navigate('/meal-scan')}
            className="flex items-center gap-1.5 text-xs text-skanda-gold font-semibold"
          >
            <Camera className="w-3.5 h-3.5" /> Scan Photo
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_FOODS.map(food => (
            <button key={food.name} onClick={() => addQuick(food)}
              className="skanda-card p-3 text-left hover:border-skanda-gold/30 transition-colors">
              <p className="text-skanda-text text-xs font-semibold leading-snug">{food.name}</p>
              <p className="text-skanda-muted text-xs mt-1">{food.cal} kcal · {food.p}g P</p>
            </button>
          ))}
        </div>
      </div>

      {/* Add custom */}
      <div className="mx-5 mt-4">
        {!showAdd ? (
          <button onClick={() => setShowAdd(true)}
            className="btn-ghost w-full py-3 text-sm flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Add Custom Food
          </button>
        ) : (
          <div className="skanda-card p-4 space-y-3">
            <p className="text-skanda-dim text-xs uppercase tracking-widest mb-1">Custom Entry</p>
            <input className="skanda-input px-3 py-2.5 text-sm" placeholder="Food name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              {[['calories','Calories'],['protein','Protein (g)'],['carbs','Carbs (g)'],['fat','Fat (g)']].map(([k, label]) => (
                <div key={k}>
                  <label className="skanda-label text-[10px]">{label}</label>
                  <input type="number" className="skanda-input px-3 py-2 text-sm" placeholder="0"
                    value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowAdd(false)} className="btn-ghost flex-1 py-2 text-sm">Cancel</button>
              <button onClick={addCustom} disabled={saving || !form.name || !form.calories}
                className="btn-gold flex-1 py-2 text-sm font-bold">Add</button>
            </div>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loadingLogs && (
        <div className="mx-5 mt-5 space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="skanda-card px-4 py-3 flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="shimmer h-3 rounded w-28" />
                <div className="shimmer h-2.5 rounded w-20" />
              </div>
              <div className="shimmer h-4 rounded w-12" />
            </div>
          ))}
        </div>
      )}

      {/* Log */}
      {!loadingLogs && logs.length > 0 && (
        <div className="mx-5 mt-5 mb-10">
          <p className="text-skanda-dim text-xs uppercase tracking-widest mb-3">Today's Log</p>
          <div className="space-y-2">
            {[...logs].reverse().map((log, i) => (
              <div key={log.id || i} className="skanda-card px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-skanda-text text-sm">{log.meal_name || 'Meal'}</p>
                  <p className="text-skanda-muted text-xs mt-0.5">
                    {Math.round(log.protein_g || 0)}g protein · {Math.round(log.carbs_g || 0)}g carbs
                  </p>
                </div>
                <p className="text-skanda-gold font-bold text-sm">{Math.round(log.calories)}kcal</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
