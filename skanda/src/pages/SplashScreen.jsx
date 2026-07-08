import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Camera, TrendingUp, Shield } from 'lucide-react'
import { getCachedProfile } from '../lib/workoutCache'

const FEATURES = [
  { icon: Shield,     label: 'AI Tier Assessment',   sub: 'Know where you stand' },
  { icon: Zap,        label: 'Oracle AI Insights',    sub: '3× daily counsel' },
  { icon: Camera,     label: 'Instant Meal Scanning', sub: 'AI Vision' },
  { icon: TrendingUp, label: 'Weekly Plan Evolution', sub: 'Adapts to your progress' },
]

const AVATARS = ['#c8922a', '#9a88c8', '#5a8a60', '#c85a2a']

export default function SplashScreen() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    // Already logged in — skip the splash and go straight to the war room
    const cached = getCachedProfile()
    if (cached?.tier) {
      navigate('/dashboard', { replace: true })
      return
    }
    const t1 = setTimeout(() => setPhase(1), 500)
    const t2 = setTimeout(() => setPhase(2), 1100)
    const t3 = setTimeout(() => setPhase(3), 1700)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  return (
    <div className="min-h-dvh bg-skanda-bg overflow-y-auto relative">

      {/* ── Background layers ── */}
      <div className="fixed inset-0 pointer-events-none select-none">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full opacity-[0.09]"
          style={{ background: 'radial-gradient(ellipse, #c8922a 0%, transparent 65%)' }} />
        <div className="absolute bottom-0 -left-20 w-[350px] h-[350px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #9a88c8 0%, transparent 70%)' }} />
        {[
          { top: '15%', left: '8%',  delay: '0s',   dur: '3.5s' },
          { top: '25%', left: '90%', delay: '0.8s', dur: '4s'   },
          { top: '60%', left: '5%',  delay: '1.4s', dur: '3.8s' },
          { top: '70%', left: '93%', delay: '0.4s', dur: '4.2s' },
        ].map((p, i) => (
          <div key={i} className="absolute w-1 h-1 rounded-full animate-float"
            style={{ top: p.top, left: p.left, background: '#c8922a', opacity: 0.3,
              animationDelay: p.delay, animationDuration: p.dur }} />
        ))}
      </div>

      {/* ── All content in one scrollable column ── */}
      <div className="relative flex flex-col items-center px-6 pt-16 pb-12 max-w-sm mx-auto">

        {/* Logo */}
        <div className={`transition-all duration-700 ${phase >= 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
          <div className="relative w-28 h-28 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full animate-spin-slow"
              style={{ background: 'conic-gradient(from 0deg, transparent 60%, rgba(200,146,42,0.4) 80%, rgba(232,184,64,0.9) 100%, transparent)' }} />
            <div className="absolute inset-[3px] rounded-full" style={{ border: '1px solid rgba(200,146,42,0.2)' }} />
            <div className="absolute inset-[10px] rounded-full flex items-center justify-center animate-glow"
              style={{ background: 'linear-gradient(145deg, #1c1500 0%, #100c00 100%)', border: '1px solid rgba(200,146,42,0.5)', boxShadow: 'inset 0 1px 0 rgba(200,146,42,0.2)' }}>
              <span className="font-cinzel font-black text-5xl glow-gold" style={{ color: '#e8c060', lineHeight: 1 }}>S</span>
            </div>
          </div>
        </div>

        {/* Brand name */}
        <div className={`text-center transition-all duration-700 delay-100 ${phase >= 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <h1 className="font-cinzel font-black tracking-[0.18em] glow-gold mb-3"
            style={{ fontSize: 'clamp(2.8rem, 14vw, 4rem)', color: '#e8c060' }}>
            SKANDA
          </h1>
          <div className="flex items-center justify-center gap-3 mb-1">
            <div className="h-px w-12" style={{ background: 'linear-gradient(90deg, transparent, #c8922a60)' }} />
            <p className="text-skanda-dim text-[10px] tracking-[0.4em] uppercase font-semibold">God of War</p>
            <div className="h-px w-12" style={{ background: 'linear-gradient(90deg, #c8922a60, transparent)' }} />
          </div>
          <p className="text-skanda-muted text-xs tracking-widest">Commander of the Divine Army</p>
        </div>

        {/* Tagline */}
        <div className={`mt-8 text-center transition-all duration-700 ${phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-skanda-dim text-sm uppercase tracking-[0.3em] mb-2">The fitness AI that</p>
          <p className="font-cinzel font-bold text-xl tracking-[0.12em]" style={{ color: '#e8c060' }}>
            TESTS · TRAINS · EVOLVES
          </p>
          <p className="text-skanda-dim text-sm mt-2.5 leading-relaxed">
            Your program adapts every single week —<br />driven by your actual performance.
          </p>
        </div>

        {/* Feature grid */}
        <div className={`mt-8 grid grid-cols-2 gap-2.5 w-full transition-all duration-700 delay-100 ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {FEATURES.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="skanda-card flex items-center gap-2.5 px-3 py-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(200,146,42,0.12)', border: '1px solid rgba(200,146,42,0.2)' }}>
                <Icon className="w-3.5 h-3.5" style={{ color: '#c8922a' }} />
              </div>
              <div className="min-w-0">
                <p className="text-skanda-text text-xs font-semibold leading-tight">{label}</p>
                <p className="text-skanda-muted text-[10px] mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Social proof */}
        <div className={`mt-8 flex items-center gap-3 transition-all duration-700 delay-100 ${phase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex -space-x-2.5">
            {AVATARS.map((c, i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                style={{ background: c + '30', borderColor: '#06050d', color: c }}>
                {['A','V','S','W'][i]}
              </div>
            ))}
          </div>
          <p className="text-skanda-dim text-xs">
            Warriors already <span className="text-skanda-gold font-semibold">training</span>
          </p>
        </div>

        {/* CTA */}
        <div className={`mt-6 w-full transition-all duration-700 delay-150 ${phase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <button
            onClick={() => navigate('/auth')}
            className="btn-gold w-full py-4 font-cinzel font-bold tracking-[0.18em] text-sm"
          >
            BEGIN THE TRIALS
          </button>
          <p className="text-center text-skanda-muted text-xs mt-3">
            Free to start · No credit card · 5 minutes
          </p>
        </div>

        {/* Sanskrit footer */}
        <div className={`mt-8 w-full flex items-center gap-3 transition-all duration-500 ${phase >= 3 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, #2a2448)' }} />
          <p className="text-skanda-muted text-[10px] tracking-widest opacity-50">ষড়ানন · स्कन्द · ஷண்முகன்</p>
          <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, #2a2448, transparent)' }} />
        </div>

      </div>
    </div>
  )
}
