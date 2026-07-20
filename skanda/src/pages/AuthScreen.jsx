import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn, signUp, getProfile } from '../lib/supabase'
import { getCachedProfile } from '../lib/workoutCache'
import { useAuth } from '../hooks/useAuth'
import { Eye, EyeOff, ChevronLeft, Zap } from 'lucide-react'

function isConnError(msg = '') {
  const m = msg.toLowerCase()
  return m.includes('fetch') || m.includes('network') || m.includes('load failed') || m.includes('connect')
}

export default function AuthScreen() {
  const navigate = useNavigate()
  const { setProfile } = useAuth()
  const [mode, setMode]       = useState('login')
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [form, setForm]       = useState({ name: '', email: '', password: '' })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { data, error: err } = await signUp(form.email, form.password, form.name)
        if (err) throw err
        if (data?.user && data?.session) {
          // Email confirmation is off — user is live immediately
          navigate('/trials')
        } else if (data?.user) {
          // Email confirmation is on — sign them in automatically
          const { data: signInData, error: signInErr } = await signIn(form.email, form.password)
          if (!signInErr && signInData?.user) {
            navigate('/trials')
          } else {
            setError('Account created! Check your email to confirm, then sign in.')
          }
        }
      } else {
        const { data, error: err } = await signIn(form.email, form.password)
        if (err) {
          if (err.message?.toLowerCase().includes('not confirmed')) {
            setError('Your email isn\'t confirmed yet. Check your inbox for a confirmation link, or ask your admin to disable email confirmation in Supabase.')
          } else if (err.paused || isConnError(err.message)) {
            setError('__paused__')
          } else {
            setError(err.message || 'Something went wrong. Try again.')
          }
          return
        }
        if (data?.user) {
          // Use localStorage cache first — instant, no network round-trip.
          // Only call Supabase if the cache is empty (first login on this device).
          const cached = getCachedProfile()
          if (cached?.tier) {
            setProfile(cached)
            navigate('/dashboard')
          } else {
            const existing = await getProfile(data.user.id)
            if (existing) setProfile(existing)
            navigate(existing?.tier ? '/dashboard' : '/trials')
          }
        }
      }
    } catch (err) {
      if (err.paused || isConnError(err.message)) setError('__paused__')
      else setError(err.message || 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleDemo() {
    setProfile({ id: 'demo', name: 'Warrior', demo: true })
    navigate('/trials')
  }

  return (
    <div className="min-h-dvh bg-skanda-bg flex flex-col relative overflow-hidden">

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full opacity-[0.08]"
          style={{ background: 'radial-gradient(ellipse, #c8922a 0%, transparent 70%)' }} />
      </div>

      {/* ── Hero header ── */}
      <div className="relative px-5 pt-5 pb-8">
        <button onClick={() => navigate('/')} className="text-skanda-dim hover:text-skanda-text transition-colors mb-6 flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" />
          <span className="text-xs">Back</span>
        </button>

        <div className="flex flex-col items-center">
          {/* Mini logo */}
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 animate-glow"
            style={{
              background: 'linear-gradient(145deg, #1c1500, #100c00)',
              border: '1px solid rgba(200,146,42,0.45)',
              boxShadow: '0 4px 20px rgba(200,146,42,0.2)',
            }}>
            <span className="font-cinzel font-black text-2xl glow-gold" style={{ color: '#e8c060' }}>S</span>
          </div>
          <p className="font-cinzel font-bold tracking-[0.25em] text-xs mb-4" style={{ color: '#c8922a' }}>SKANDA</p>

          <h1 className="font-cinzel font-bold text-2xl text-skanda-text text-center leading-snug">
            {mode === 'login' ? 'Welcome back,\nWarrior.' : 'Join the\nDivine Army.'}
          </h1>
          <p className="text-skanda-dim text-sm mt-2 text-center">
            {mode === 'login'
              ? 'Your Oracle awaits.'
              : '30-day full access · No card required.'}
          </p>
        </div>
      </div>

      {/* ── Form card ── */}
      <div className="flex-1 px-5 pb-10">
        <div className="w-full max-w-sm mx-auto">
          <div className="rounded-2xl p-5"
            style={{
              background: 'linear-gradient(145deg, #100e20 0%, #0d0b1c 100%)',
              border: '1px solid #1e1a32',
              boxShadow: '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(200,146,42,0.06)',
            }}>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="skanda-label">Warrior Name</label>
                  <input
                    className="skanda-input px-4 py-3"
                    placeholder="Your name"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    required
                  />
                </div>
              )}

              <div>
                <label className="skanda-label">Email</label>
                <input
                  type="email"
                  className="skanda-input px-4 py-3"
                  placeholder="warrior@skanda.app"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="skanda-label">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="skanda-input px-4 py-3 pr-12"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-skanda-muted hover:text-skanda-dim transition-colors"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error === '__paused__' ? (
                <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl px-4 py-3 space-y-2">
                  <div className="flex items-start gap-2 text-amber-300 text-sm">
                    <span className="mt-0.5 shrink-0">⚠</span>
                    <span>Your Supabase project is paused. Free-tier projects pause after 1 week of inactivity.</span>
                  </div>
                  <a
                    href="https://app.supabase.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center py-2 rounded-lg text-xs font-bold"
                    style={{ background: 'rgba(200,146,42,0.15)', color: '#c8922a', border: '1px solid rgba(200,146,42,0.4)' }}
                  >
                    Open Supabase Dashboard → Restore Project
                  </a>
                  <p className="text-amber-600 text-xs text-center">Then come back here and try again</p>
                </div>
              ) : error ? (
                <div className="flex items-start gap-2 text-red-400 text-sm bg-red-950/25 border border-red-900/35 rounded-xl px-4 py-3">
                  <span className="mt-0.5">⚠</span>
                  <span>{error}</span>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="btn-gold w-full py-3.5 font-cinzel font-bold tracking-[0.15em] text-sm mt-1"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    {mode === 'login' ? 'Entering...' : 'Creating...'}
                  </span>
                ) : mode === 'login' ? 'ENTER THE FORGE' : 'BEGIN MY JOURNEY'}
              </button>
            </form>

            {/* Divider */}
            <div className="mt-5 flex items-center gap-3">
              <div className="flex-1 divider-gold" />
              <span className="text-skanda-muted text-xs">or</span>
              <div className="flex-1 divider-gold" />
            </div>

            {/* Demo mode */}
            <button
              onClick={handleDemo}
              className="btn-ghost w-full py-3 text-sm mt-4 flex items-center justify-center gap-2"
            >
              <Zap className="w-3.5 h-3.5 text-skanda-gold" />
              Try Demo — No Account Needed
            </button>
          </div>

          {/* Toggle login/signup */}
          <p className="text-center text-skanda-dim text-sm mt-5">
            {mode === 'login' ? "New to SKANDA? " : 'Already a warrior? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
              className="font-semibold transition-colors hover:opacity-80"
              style={{ color: '#c8922a' }}
            >
              {mode === 'login' ? 'Sign up free →' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
