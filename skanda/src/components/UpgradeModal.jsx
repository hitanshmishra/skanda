import { X, Camera, Zap, TrendingUp, Crown } from 'lucide-react'

const PRO_FEATURES = [
  { icon: Camera,     text: 'Unlimited meal photo scans',                detail: 'Free tier: 3/week' },
  { icon: Zap,        text: 'Unlimited Oracle AI insights',              detail: 'Free tier: 1/day' },
  { icon: TrendingUp, text: 'Unlimited weekly plan evolutions',          detail: 'Free tier: none' },
  { icon: Crown,      text: 'AI-generated weekly meal plans',            detail: 'Pro only' },
]

export default function UpgradeModal({ reason, onClose }) {
  // reason: 'scans' | 'insights' | 'evolutions'

  const headlines = {
    scans:      { title: "Weekly scan limit reached",             sub: "Resets Monday. Upgrade to scan without limits." },
    insights:   { title: "Daily Oracle insight used",            sub: "Resets at midnight. Upgrade for unlimited daily counsel." },
    evolutions: { title: "Plan evolution requires Pro",          sub: "Trial evolutions exhausted. Upgrade to evolve your plan every week." },
  }

  const { title, sub } = headlines[reason] || headlines.scans

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-sm bg-skanda-surface border border-skanda-border rounded-t-3xl sm:rounded-2xl mx-auto p-6 animate-slide-up">
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 text-skanda-muted hover:text-skanda-dim">
          <X className="w-5 h-5" />
        </button>

        {/* Crown icon */}
        <div className="w-14 h-14 rounded-2xl bg-skanda-gold/20 border border-skanda-gold/30 flex items-center justify-center mx-auto mb-4">
          <Crown className="w-7 h-7 text-skanda-gold" />
        </div>

        {/* Headline */}
        <div className="text-center mb-5">
          <h2 className="font-cinzel font-bold text-xl text-skanda-text mb-1">{title}</h2>
          <p className="text-skanda-dim text-sm">{sub}</p>
        </div>

        {/* Feature list */}
        <div className="space-y-3 mb-6">
          {PRO_FEATURES.map(({ icon: Icon, text, detail }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-skanda-gold/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-skanda-gold" />
              </div>
              <div className="flex-1">
                <p className="text-skanda-text text-sm font-medium">{text}</p>
                <p className="text-skanda-muted text-xs">{detail}</p>
              </div>
              <span className="text-emerald-400 text-xs font-bold">✓ PRO</span>
            </div>
          ))}
        </div>

        {/* Price */}
        <div className="skanda-card p-3 text-center mb-4 border-skanda-gold/20">
          <p className="text-skanda-gold font-cinzel font-bold text-2xl">$4.99 <span className="text-sm font-normal text-skanda-dim">/ month</span></p>
          <p className="text-skanda-muted text-xs mt-0.5">₹199/month · Cancel anytime · No hidden fees</p>
        </div>

        {/* CTA */}
        <button className="btn-gold w-full py-4 font-cinzel font-bold tracking-wider text-sm">
          UPGRADE TO PRO
        </button>

        {/* Founding member note */}
        <div className="mt-3 p-2.5 bg-skanda-gold/5 border border-skanda-gold/20 rounded-xl text-center">
          <p className="text-skanda-gold text-xs font-semibold">🏅 Founding Member Offer</p>
          <p className="text-skanda-dim text-xs mt-0.5">First 100 users get Pro at <strong className="text-skanda-text">$2.99/month forever</strong>. Lock it in now.</p>
        </div>

        <button onClick={onClose} className="w-full text-center text-skanda-muted text-xs mt-3 py-1">
          Continue with Free tier
        </button>
      </div>
    </div>
  )
}
