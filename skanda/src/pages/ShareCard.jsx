import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getStreak } from '../lib/workoutCache'
import { getPRs, getRecentSessions } from '../lib/supabase'
import { drawShareCard, shareOrDownload } from '../lib/shareCard'
import { ChevronLeft, Share2, Download, RefreshCw } from 'lucide-react'

export default function ShareCard() {
  const navigate        = useNavigate()
  const { session, profile } = useAuth()
  const canvasRef       = useRef()
  const [preview,   setPreview]   = useState(null)   // dataURL for <img>
  const [loading,   setLoading]   = useState(true)
  const [sharing,   setSharing]   = useState(false)
  const [shareMsg,  setShareMsg]  = useState('')

  useEffect(() => {
    generate()
  }, [profile?.id])

  async function generate() {
    setLoading(true)
    setShareMsg('')

    const userId = session?.user?.id
    const streak = getStreak().current

    let topPR = null
    let weeklyVolume = 0

    if (userId) {
      try {
        const [prs, sessions] = await Promise.all([
          getPRs(userId),
          getRecentSessions(userId, 7),
        ])
        // Best PR by weight
        topPR = prs.reduce((best, pr) =>
          !best || pr.weight_lbs > best.weight_lbs ? pr : best, null)
        weeklyVolume = sessions.reduce((s, x) => s + (x.total_volume_lbs || 0), 0)
      } catch {}
    }

    const canvas = canvasRef.current
    if (!canvas) { setLoading(false); return }

    await drawShareCard(canvas, {
      name:         profile?.name || 'Warrior',
      tier:         profile?.tier || 'arambha',
      streak,
      topPR,
      weeklyVolume,
    })

    setPreview(canvas.toDataURL('image/png'))
    setLoading(false)
  }

  async function handleShare() {
    if (!canvasRef.current || sharing) return
    setSharing(true)
    try {
      const result = await shareOrDownload(canvasRef.current, profile?.name || 'warrior')
      setShareMsg(result === 'shared' ? 'Shared!' : 'Saved to downloads!')
      setTimeout(() => setShareMsg(''), 3000)
    } catch {
      setShareMsg('Could not share — try Download instead.')
      setTimeout(() => setShareMsg(''), 4000)
    } finally {
      setSharing(false)
    }
  }

  async function handleDownload() {
    if (!canvasRef.current) return
    const blob = await new Promise(res => canvasRef.current.toBlob(res, 'image/png'))
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `skanda-progress.png`
    a.click()
    URL.revokeObjectURL(url)
    setShareMsg('Saved to downloads!')
    setTimeout(() => setShareMsg(''), 3000)
  }

  return (
    <div className="min-h-dvh bg-skanda-bg flex flex-col">
      <header className="px-5 pt-6 pb-4 flex items-center gap-3 border-b border-skanda-border">
        <button onClick={() => navigate('/profile')} className="text-skanda-dim hover:text-skanda-text">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-cinzel font-bold text-skanda-text">SHARE PROGRESS</h1>
          <p className="text-skanda-dim text-xs">Your legend, exported</p>
        </div>
        <button onClick={generate} disabled={loading}
          className="ml-auto text-skanda-dim hover:text-skanda-text disabled:opacity-30">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center px-5 py-6 gap-5">
        {/* Hidden canvas — used for rendering */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Card preview */}
        <div className="w-full max-w-sm">
          {loading ? (
            <div className="w-full aspect-[3/4] rounded-2xl bg-skanda-surface border border-skanda-border flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-skanda-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : preview ? (
            <img
              src={preview}
              alt="Progress card preview"
              className="w-full rounded-2xl shadow-2xl border border-skanda-border"
              style={{ boxShadow: '0 0 40px rgba(200,146,42,0.15)' }}
            />
          ) : (
            <div className="w-full aspect-[3/4] rounded-2xl bg-skanda-surface border border-skanda-border flex items-center justify-center">
              <p className="text-skanda-dim text-sm">Could not render card</p>
            </div>
          )}
        </div>

        {/* Status message */}
        {shareMsg && (
          <p className="text-sm font-semibold" style={{ color: '#34d399' }}>{shareMsg}</p>
        )}

        {/* Action buttons */}
        {!loading && preview && (
          <div className="flex gap-3 w-full max-w-sm">
            <button
              onClick={handleShare}
              disabled={sharing}
              className="flex-1 btn-gold py-3 text-sm font-bold flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              {sharing ? 'Sharing…' : 'Share'}
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 btn-ghost py-3 text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Download
            </button>
          </div>
        )}

        <p className="text-skanda-muted text-xs text-center max-w-xs">
          Card includes your streak, top PR, and recent volume. Regenerate anytime with the refresh button.
        </p>
      </div>
    </div>
  )
}
