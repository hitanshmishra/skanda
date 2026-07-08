import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { generateMealPlan } from '../lib/claude'
import { ChevronLeft, Zap, Utensils, ChevronDown, ChevronUp } from 'lucide-react'

const GOAL_OPTIONS = [
  { value: 'muscle gain',   label: 'Muscle Gain'   },
  { value: 'fat loss',      label: 'Fat Loss'       },
  { value: 'maintenance',   label: 'Maintenance'    },
  { value: 'performance',   label: 'Performance'    },
]

export default function MealPlanner() {
  const navigate = useNavigate()
  const { profile } = useAuth()

  const nt = profile?.nutrition_targets
  const defaultCalories = nt?.calories  || 2000
  const defaultProtein  = nt?.protein_g || Math.round(defaultCalories * 0.30 / 4)
  const defaultCarbs    = nt?.carbs_g   || Math.round(defaultCalories * 0.40 / 4)
  const defaultFat      = nt?.fat_g     || Math.round(defaultCalories * 0.30 / 9)

  const [calories, setCalories] = useState(defaultCalories)
  const [protein,  setProtein]  = useState(defaultProtein)
  const [carbs,    setCarbs]    = useState(defaultCarbs)
  const [fat,      setFat]      = useState(defaultFat)
  const [goal,     setGoal]     = useState(profile?.goal || 'muscle gain')
  const [plan,     setPlan]     = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [expanded, setExpanded] = useState({})

  async function handleGenerate() {
    setLoading(true)
    setError('')
    setPlan(null)
    try {
      const result = await generateMealPlan({ calories, protein, carbs, fat, goal })
      if (!result?.meals?.length) throw new Error('No plan returned — try again.')
      setPlan(result)
      setExpanded(Object.fromEntries(result.meals.map((_, i) => [i, true])))
    } catch (e) {
      setError(e.message || 'Failed to generate plan.')
    } finally {
      setLoading(false)
    }
  }

  const totalCalc = plan
    ? plan.meals.reduce((s, m) => s + (m.total?.calories || 0), 0)
    : null

  return (
    <div className="min-h-dvh bg-skanda-bg flex flex-col">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 flex items-center gap-3 border-b border-skanda-border">
        <button onClick={() => navigate('/nutrition')} className="text-skanda-dim hover:text-skanda-text">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-cinzel font-bold text-skanda-text">MEAL PLANNER</h1>
          <p className="text-skanda-dim text-xs">AI-generated 1-day plan to hit your macros</p>
        </div>
      </header>

      <div className="flex-1 px-5 py-5 overflow-auto pb-10 space-y-4">
        {/* Macro inputs */}
        <div className="skanda-card p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-skanda-gold">Daily Targets</p>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Calories (kcal)', value: calories, set: setCalories },
              { label: 'Protein (g)',     value: protein,  set: setProtein  },
              { label: 'Carbs (g)',       value: carbs,    set: setCarbs    },
              { label: 'Fat (g)',         value: fat,      set: setFat      },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <label className="text-skanda-dim text-[11px] block mb-1">{label}</label>
                <input
                  type="number"
                  inputMode="numeric"
                  className="skanda-input w-full px-3 py-2 text-sm"
                  value={value}
                  onChange={e => set(Math.max(0, parseInt(e.target.value) || 0))}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="text-skanda-dim text-[11px] block mb-1">Goal</label>
            <div className="flex flex-wrap gap-2">
              {GOAL_OPTIONS.map(g => (
                <button
                  key={g.value}
                  onClick={() => setGoal(g.value)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={goal === g.value
                    ? { background: 'rgba(200,146,42,0.18)', color: '#c8922a', border: '1px solid rgba(200,146,42,0.4)' }
                    : { background: 'rgba(255,255,255,0.04)', color: 'var(--skanda-dim)', border: '1px solid rgba(255,255,255,0.08)' }
                  }
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="btn-gold w-full py-4 font-cinzel font-bold tracking-wider text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-skanda-bg/40 border-t-skanda-bg rounded-full animate-spin" />
              Building Your Plan...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              GENERATE MEAL PLAN
            </>
          )}
        </button>

        {error && (
          <div className="skanda-card p-3 border-red-900/40">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Plan display */}
        {plan && (
          <div className="space-y-3 animate-slide-up">
            {totalCalc !== null && (
              <div className="flex items-center gap-2 px-1">
                <Utensils className="w-3.5 h-3.5 text-skanda-gold" />
                <span className="text-skanda-dim text-xs">
                  Total: <span className="text-skanda-gold font-bold">{totalCalc} kcal</span> across {plan.meals.length} meals
                </span>
              </div>
            )}

            {plan.meals.map((meal, i) => (
              <div key={i} className="skanda-card overflow-hidden">
                {/* Meal header */}
                <button
                  className="w-full px-4 py-3 flex items-center justify-between"
                  onClick={() => setExpanded(e => ({ ...e, [i]: !e[i] }))}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold"
                      style={{ background: 'rgba(200,146,42,0.12)', color: '#c8922a' }}>
                      {i + 1}
                    </div>
                    <div className="text-left">
                      <p className="text-skanda-text font-semibold text-sm">{meal.name}</p>
                      <p className="text-skanda-dim text-xs">{meal.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-skanda-gold text-sm font-bold">{meal.total?.calories} kcal</span>
                    {expanded[i] ? <ChevronUp className="w-4 h-4 text-skanda-dim" /> : <ChevronDown className="w-4 h-4 text-skanda-dim" />}
                  </div>
                </button>

                {/* Macro pills */}
                {expanded[i] && (
                  <div className="border-t border-skanda-border">
                    <div className="flex gap-3 px-4 py-2 text-xs">
                      <span className="text-emerald-400 font-semibold">{meal.total?.protein}g P</span>
                      <span className="text-blue-400 font-semibold">{meal.total?.carbs}g C</span>
                      <span className="text-amber-400 font-semibold">{meal.total?.fat}g F</span>
                    </div>

                    <div className="px-4 pb-3 space-y-2">
                      {meal.foods?.map((food, j) => (
                        <div key={j} className="flex items-center justify-between py-1.5 border-b border-skanda-border/50 last:border-0">
                          <span className="text-skanda-text text-sm flex-1 mr-2">{food.item}</span>
                          <div className="flex gap-2 text-xs text-skanda-dim shrink-0">
                            <span>{food.calories}kcal</span>
                            <span className="text-emerald-400">{food.protein}g P</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
