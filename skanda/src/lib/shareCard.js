// Pure Canvas card renderer — no external dependencies
// Output: 600×800px PNG, SKANDA brand colors

const W = 600
const H = 800
const GOLD   = '#c8922a'
const PURPLE = '#a78bfa'
const ORANGE = '#f97316'
const BG1    = '#0d0b1a'
const BG2    = '#1a1629'

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ')
  let line = ''
  let curY = y
  for (const word of words) {
    const test = line + word + ' '
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line.trim(), x, curY)
      curY += lineH
      line = word + ' '
    } else {
      line = test
    }
  }
  ctx.fillText(line.trim(), x, curY)
  return curY
}

export async function drawShareCard(canvas, { name, tier, streak, topPR, weeklyVolume }) {
  canvas.width  = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Wait for ALL fonts to be fully committed to the glyph cache before drawing
  try { await document.fonts.ready } catch {}

  // ── Background gradient ────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, BG1)
  bg.addColorStop(1, BG2)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Subtle radial glow centre
  const glow = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, 320)
  glow.addColorStop(0, 'rgba(200,146,42,0.07)')
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // Gold top bar
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, W, 5)

  // ── Header ────────────────────────────────────────────────────────────────
  ctx.textAlign = 'center'
  ctx.fillStyle = GOLD
  ctx.font = '900 26px Cinzel, serif'
  ctx.fillText('S K A N D A', W / 2, 58)

  // Tagline
  ctx.fillStyle = 'rgba(200,146,42,0.45)'
  ctx.font = '500 12px "DM Sans", sans-serif'
  ctx.fillText('FORGE YOUR LEGEND', W / 2, 80)

  // Thin separator
  ctx.strokeStyle = 'rgba(200,146,42,0.25)'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(60, 100); ctx.lineTo(W - 60, 100); ctx.stroke()

  // ── Name ──────────────────────────────────────────────────────────────────
  const displayName = (name || 'WARRIOR').toUpperCase()
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 40px Cinzel, serif'
  // Shrink font if name is long
  if (ctx.measureText(displayName).width > 480) ctx.font = '700 30px Cinzel, serif'
  ctx.fillText(displayName, W / 2, 170)

  // ── Tier badge ─────────────────────────────────────────────────────────────
  const tierConfig = {
    arambha: { color: '#9ca3af', label: 'ARAMBHA TIER' },
    veer:    { color: PURPLE,    label: 'VEER TIER'    },
    skanda:  { color: GOLD,      label: 'SKANDA ELITE' },
  }
  const tc = tierConfig[tier] || { color: GOLD, label: 'WARRIOR' }
  const bw = 200, bh = 36, bx = (W - bw) / 2, by = 192
  ctx.fillStyle = tc.color + '22'
  roundRect(ctx, bx, by, bw, bh, 18)
  ctx.fill()
  ctx.strokeStyle = tc.color
  ctx.lineWidth = 1.5
  roundRect(ctx, bx, by, bw, bh, 18)
  ctx.stroke()
  ctx.fillStyle = tc.color
  ctx.font = '600 13px "DM Sans", sans-serif'
  ctx.fillText(tc.label, W / 2, by + 24)

  // Separator
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(40, 258); ctx.lineTo(W - 40, 258); ctx.stroke()

  // ── Stats row ──────────────────────────────────────────────────────────────
  // 3 columns: streak | top PR | weekly volume
  const prLabel  = topPR ? `${topPR.weight_lbs} lbs` : '—'
  const prSub    = topPR ? topPR.exercise_name : 'No PRs yet'
  const volLabel = weeklyVolume > 0 ? `${(weeklyVolume / 1000).toFixed(1)}k` : '—'
  const volSub   = weeklyVolume > 0 ? 'lbs volume' : 'No sessions'

  const cols = [
    { cx: 100, value: `${streak}`,  unit: streak === 1 ? 'day' : 'days', sub: 'STREAK',   color: ORANGE },
    { cx: 300, value: prLabel,      unit: '',                              sub: prSub,      color: GOLD   },
    { cx: 500, value: volLabel,     unit: weeklyVolume > 0 ? 'lbs' : '',  sub: volSub,     color: PURPLE },
  ]

  // Column labels above
  cols.forEach(({ cx, sub: label, color }) => {
    ctx.fillStyle = color + 'aa'
    ctx.font = '600 10px "DM Sans", sans-serif'
    ctx.fillText(label.length > 18 ? label.slice(0, 16) + '…' : label, cx, 288)
  })

  // Large values
  cols.forEach(({ cx, value, color }) => {
    ctx.fillStyle = color
    ctx.font = '700 44px Cinzel, serif'
    // Shrink if value is wide
    if (ctx.measureText(value).width > 165) ctx.font = '700 32px Cinzel, serif'
    ctx.fillText(value, cx, 350)
  })

  // Units / subs below value
  cols.forEach(({ cx, unit }) => {
    if (!unit) return
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.font = '500 13px "DM Sans", sans-serif'
    ctx.fillText(unit, cx, 374)
  })

  // Vertical dividers between columns
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  ;[200, 400].forEach(x => {
    ctx.beginPath(); ctx.moveTo(x, 270); ctx.lineTo(x, 390); ctx.stroke()
  })

  // ── Bottom section ─────────────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(40, 415); ctx.lineTo(W - 40, 415); ctx.stroke()

  // Quote
  const quotes = [
    '"Forged in iron. Refined by will."',
    '"The body achieves what the mind believes."',
    '"Discipline outlasts motivation."',
    '"Every rep is a vote for who you\'re becoming."',
    '"Pain is temporary. Glory is forever."',
  ]
  const quote = quotes[streak % quotes.length]
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.font = 'italic 500 19px "DM Sans", sans-serif'
  wrapText(ctx, quote, W / 2, 465, 480, 30)

  // Date
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.font = '400 13px "DM Sans", sans-serif'
  ctx.fillText(dateStr, W / 2, 520)

  // ── Decorative bottom art ──────────────────────────────────────────────────
  // Three horizontal gold lines (taper in)
  [[560, 0.15], [580, 0.08], [600, 0.04]].forEach(([y, opacity]) => {
    ctx.strokeStyle = `rgba(200,146,42,${opacity})`
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
  })

  // Branding
  ctx.fillStyle = 'rgba(200,146,42,0.5)'
  ctx.font = '700 14px "DM Sans", sans-serif'
  ctx.fillText('SKANDA FITNESS', W / 2, 640)

  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.font = '400 12px "DM Sans", sans-serif'
  ctx.fillText('Track. Evolve. Dominate.', W / 2, 662)

  // Gold bottom bar
  ctx.fillStyle = GOLD
  ctx.fillRect(0, H - 5, W, 5)
}

export async function shareOrDownload(canvas, name = 'warrior') {
  const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))
  const filename = `skanda-${name.toLowerCase().replace(/\s+/g, '-')}.png`
  const file = new File([blob], filename, { type: 'image/png' })

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title: 'My SKANDA Progress', files: [file] })
      return 'shared'
    } catch {
      // User cancelled share — fall through to download
    }
  }

  // Fallback: download
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return 'downloaded'
}
