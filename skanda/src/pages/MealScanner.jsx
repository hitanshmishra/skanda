import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { scanMealPhoto, fileToBase64 } from '../lib/gemini'
import { logNutrition } from '../lib/supabase'
import { getScansRemaining, consumeScan, refundScan, saveNutritionDay } from '../lib/workoutCache'
import UpgradeModal from '../components/UpgradeModal'
import { Camera, Upload, ChevronLeft, Check, Zap, AlertCircle, RefreshCw, SlidersHorizontal } from 'lucide-react'

export default function MealScanner() {
  const navigate  = useNavigate()
  const { session } = useAuth()
  const fileRef   = useRef()

  const [preview, setPreview]             = useState(null)
  const [lastFile, setLastFile]           = useState(null)
  const [scanning, setScanning]           = useState(false)
  const [result, setResult]               = useState(null)
  const [editedMacros, setEditedMacros]   = useState(null)
  const [notes, setNotes]                 = useState('')
  const [reanalyzing, setReanalyzing]     = useState(false)
  const [error, setError]                 = useState('')
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [retryCountdown, setRetryCountdown] = useState(0)
  const [logged, setLogged]               = useState(false)
  const [scansLeft, setScansLeft]         = useState(() => getScansRemaining())
  const [upgradeModal, setUpgradeModal]   = useState(false)

  // Count down after a 429 so the Retry button enables automatically
  useEffect(() => {
    if (!isRateLimited) return
    setRetryCountdown(30)
    const t = setInterval(() => {
      setRetryCountdown(c => {
        if (c <= 1) { clearInterval(t); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [isRateLimited])

  async function doScan(file, isRetry = false) {
    if (!file) return

    if (!isRetry) {
      const ok = consumeScan()
      if (!ok) { setUpgradeModal(true); return }
      setScansLeft(getScansRemaining())
    }

    setError('')
    setResult(null)
    setEditedMacros(null)
    setNotes('')
    setLogged(false)
    setIsRateLimited(false)
    setLastFile(file)

    const url = URL.createObjectURL(file)
    setPreview(url)

    setScanning(true)
    try {
      const b64  = await fileToBase64(file)
      const data = await scanMealPhoto(b64, file.type)
      if (data.error) {
        setError(data.message)
        if (data.rateLimited) {
          setIsRateLimited(true)
        } else {
          refundScan()
          setScansLeft(getScansRemaining())
        }
      } else {
        setResult(data)
        setEditedMacros({ ...data.totals })
      }
    } catch (err) {
      setError(err.message || 'Scan failed. Try a clearer photo.')
      if (!isRetry) { refundScan(); setScansLeft(getScansRemaining()) }
    } finally {
      setScanning(false)
    }
  }

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    doScan(file, false)
  }

  function handleRetry() {
    if (lastFile && retryCountdown === 0) doScan(lastFile, true)
  }

  async function handleReanalyze() {
    if (!lastFile || !notes.trim()) return
    setReanalyzing(true)
    setError('')
    try {
      const b64  = await fileToBase64(lastFile)
      const data = await scanMealPhoto(b64, lastFile.type, notes)
      if (data.error) {
        setError(data.message)
      } else {
        setResult(data)
        setEditedMacros({ ...data.totals })
      }
    } catch (err) {
      setError(err.message || 'Re-analysis failed. Try again.')
    } finally {
      setReanalyzing(false)
    }
  }

  async function logMeal() {
    const macros = editedMacros || result?.totals
    if (!macros || logged) return
    const foodNames = result?.foods?.map(f => f.name).join(', ').slice(0, 80) || 'Scanned Meal'
    const entry = {
      calories:  Math.round(macros.calories  || 0),
      protein_g: Math.round(macros.protein_g || 0),
      carbs_g:   Math.round(macros.carbs_g   || 0),
      fat_g:     Math.round(macros.fat_g     || 0),
      meal_name: notes.trim()
        ? `${foodNames} (${notes.trim().slice(0, 50)})`
        : foodNames,
    }
    try {
      if (session?.user?.id) {
        await logNutrition(session.user.id, entry)
      } else {
        // Demo / non-auth: accumulate meal macros into today's localStorage nutrition totals
        // so the Dashboard macro rings and NutritionTracker reflect the scanned meal
        const today = new Date().toISOString().split('T')[0]
        const stored = JSON.parse(localStorage.getItem('skanda_nutrition_daily') || '{}')
        const existing = stored[today] || { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
        saveNutritionDay({
          calories:  (existing.calories  || 0) + entry.calories,
          protein_g: (existing.protein_g || 0) + entry.protein_g,
          carbs_g:   (existing.carbs_g   || 0) + entry.carbs_g,
          fat_g:     (existing.fat_g     || 0) + entry.fat_g,
        })
      }
    } catch {
      // best-effort — still mark logged so the user isn't confused
    }
    setLogged(true)
  }

  return (
    <div className="min-h-dvh bg-skanda-bg flex flex-col">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 flex items-center gap-3 border-b border-skanda-border">
        <button onClick={() => navigate('/nutrition')} className="text-skanda-dim hover:text-skanda-text">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-cinzel font-bold text-skanda-text">MEAL SCANNER</h1>
          <p className="text-skanda-dim text-xs">
            {!Number.isFinite(scansLeft)
              ? <span className="text-emerald-400 font-semibold">Unlimited scans during trial</span>
              : scansLeft > 0
              ? <><span className="text-skanda-gold font-semibold">{scansLeft}</span> scan{scansLeft !== 1 ? 's' : ''} left this week</>
              : <span className="text-red-400 font-semibold">0 scans left — upgrade for more</span>
            }
          </p>
        </div>
      </header>

      <div className="flex-1 px-5 py-5 overflow-auto pb-10">
        {/* Upload area */}
        <div
          onClick={() => !scanning && fileRef.current?.click()}
          className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${
            scanning ? 'border-skanda-gold/40 cursor-wait' : 'border-skanda-border hover:border-skanda-gold/40'
          }`}
          style={{ minHeight: 220 }}
        >
          {preview ? (
            <>
              <div className="w-full flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.25)', minHeight: 180 }}>
                <img src={preview} alt="Meal"
                  className="max-w-full object-contain"
                  style={{ maxHeight: 320 }} />
              </div>
              {scanning && (
                <div className="absolute inset-0 bg-skanda-bg/80 flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 border-2 border-skanda-gold border-t-transparent rounded-full animate-spin" />
                  <p className="text-skanda-gold text-sm font-semibold">Analyzing meal...</p>
                  <p className="text-skanda-dim text-xs">AI Vision is counting your macros</p>
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
              <div className="w-16 h-16 rounded-2xl bg-skanda-gold/10 border border-skanda-gold/20 flex items-center justify-center">
                <Camera className="w-8 h-8 text-skanda-gold" />
              </div>
              <div className="text-center">
                <p className="text-skanda-text font-semibold">Photograph Your Rations</p>
                <p className="text-skanda-dim text-sm mt-1">
                  AI will identify every food item and calculate macros automatically
                </p>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1.5 text-xs text-skanda-dim bg-skanda-surface border border-skanda-border px-3 py-1.5 rounded-full">
                  <Camera className="w-3 h-3" /> Camera
                </div>
                <div className="flex items-center gap-1.5 text-xs text-skanda-dim bg-skanda-surface border border-skanda-border px-3 py-1.5 rounded-full">
                  <Upload className="w-3 h-3" /> Gallery
                </div>
              </div>
            </div>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => handleFile(e.target.files?.[0])}
        />

        {preview && !scanning && (
          <button onClick={() => fileRef.current?.click()}
            className="btn-ghost w-full py-2.5 text-sm mt-2 flex items-center justify-center gap-2">
            <Upload className="w-3.5 h-3.5" /> Use Different Photo
          </button>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 space-y-2">
            <div className="skanda-card p-3 border-red-900/40 flex gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
            {isRateLimited && (
              <button
                onClick={handleRetry}
                disabled={retryCountdown > 0}
                className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                style={{ background: 'rgba(200,146,42,0.12)', color: '#c8922a', border: '1px solid rgba(200,146,42,0.3)' }}
              >
                <RefreshCw className="w-4 h-4" />
                {retryCountdown > 0 ? `Retry in ${retryCountdown}s` : 'Retry Scan — No Credit Used'}
              </button>
            )}
          </div>
        )}

        {/* Results */}
        {result && !error && (
          <div className="mt-5 space-y-4 animate-slide-up">

            {/* Low confidence banner */}
            {result.confidence === 'low' && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs"
                style={{ background: 'rgba(234,179,8,0.08)', color: '#eab308', border: '1px solid rgba(234,179,8,0.25)' }}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Low confidence — add notes below to help AI identify ingredients and portion sizes more accurately.</span>
              </div>
            )}

            {/* Editable macro grid */}
            <div className="skanda-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-skanda-gold" />
                <span className="text-skanda-gold text-xs font-bold uppercase tracking-widest">Scan Results</span>
                {result.confidence && (
                  <span className="ml-auto text-xs text-skanda-dim">
                    Confidence: <span className={result.confidence === 'high' ? 'text-emerald-400' : result.confidence === 'medium' ? 'text-amber-400' : 'text-red-400'} style={{ fontWeight: 600 }}>{result.confidence}</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { key: 'calories',  label: 'Calories', unit: ''  },
                  { key: 'protein_g', label: 'Protein',  unit: 'g' },
                  { key: 'carbs_g',   label: 'Carbs',    unit: 'g' },
                  { key: 'fat_g',     label: 'Fat',      unit: 'g' },
                ].map(({ key, label, unit }) => (
                  <div key={key} className="bg-skanda-surface rounded-xl p-2.5 flex flex-col items-center">
                    <input
                      type="number"
                      inputMode="numeric"
                      className="w-full bg-transparent text-center text-skanda-text font-bold text-lg outline-none border-b border-transparent focus:border-skanda-gold transition-colors"
                      value={editedMacros?.[key] ?? 0}
                      onChange={e => setEditedMacros(m => ({ ...m, [key]: Math.max(0, parseInt(e.target.value) || 0) }))}
                    />
                    <p className="text-skanda-muted text-[10px] mt-1">{label}{unit ? ` (${unit})` : ''}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center gap-1 mt-2">
                <SlidersHorizontal className="w-3 h-3 text-skanda-muted" />
                <p className="text-skanda-muted text-[10px]">Tap any number to correct it</p>
              </div>

              {result.notes && (
                <p className="text-skanda-dim text-xs mt-2 italic border-t border-skanda-border pt-2">{result.notes}</p>
              )}
            </div>

            {/* Notes + re-analyze */}
            <div className="skanda-card p-4">
              <label className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: '#a78bfa' }}>
                Add Context for Better Accuracy
              </label>
              <textarea
                className="skanda-input w-full px-3 py-2.5 text-sm resize-none leading-relaxed"
                rows={2}
                placeholder={`e.g. "The omelet has 2 eggs" · "Large portion, about 400g" · "Skimmed milk, not whole"`}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
              <p className="text-skanda-muted text-[10px] mt-1.5">
                AI can't see hidden ingredients or exact sizes — tell it what it missed.
              </p>
              {notes.trim() && (
                <button
                  onClick={handleReanalyze}
                  disabled={reanalyzing}
                  className="mt-2.5 w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
                  style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}
                >
                  {reanalyzing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(167,139,250,0.3)', borderTopColor: '#a78bfa' }} />
                      Re-analyzing with your notes...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      Re-analyze with these notes
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Food breakdown */}
            {result.foods?.length > 0 && (
              <div>
                <p className="text-skanda-dim text-xs uppercase tracking-widest mb-2">Identified Items</p>
                <div className="space-y-2">
                  {result.foods.map((food, i) => (
                    <div key={i} className="skanda-card px-4 py-3 flex items-center justify-between">
                      <span className="text-skanda-text text-sm flex-1 mr-3">{food.name}</span>
                      <div className="flex gap-3 text-xs text-skanda-muted shrink-0">
                        <span>{food.calories}kcal</span>
                        <span>{food.protein_g}g P</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Log CTA */}
            {!logged ? (
              <button onClick={logMeal}
                className="btn-gold w-full py-4 font-cinzel font-bold tracking-wider text-sm flex items-center justify-center gap-2">
                LOG THIS MEAL
                <Check className="w-4 h-4" />
              </button>
            ) : (
              <div className="skanda-card p-4 border-emerald-500/30 flex items-center justify-center gap-2">
                <Check className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Meal Logged Successfully</span>
              </div>
            )}
          </div>
        )}
      </div>

      {upgradeModal && (
        <UpgradeModal reason="scans" onClose={() => setUpgradeModal(false)} />
      )}
    </div>
  )
}
