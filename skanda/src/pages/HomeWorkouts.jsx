import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  generateHomeWorkout, getHomeEquipment, saveHomeEquipment,
  getSkillLevels, saveSkillLevels, getRecentHomeSessions,
  getTodayDayType, SKILL_PROGRESSIONS,
} from '../lib/homeWorkouts'
import { saveSkillProgress, getSkillProgress } from '../lib/supabase'
import {
  ChevronLeft, Settings2, ChevronDown, ChevronUp, Play,
  Zap, Target, ArrowUp, Footprints, Check, X, Lock, ChevronRight,
  Flame, Dumbbell, Utensils, User,
} from 'lucide-react'

// ── Equipment toggle ──────────────────────────────────────────────────────────

function EquipToggle({ label, icon, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-skanda-border last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <p className="text-skanda-text text-sm font-medium">{label}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className="w-11 h-6 rounded-full transition-all relative"
        style={{
          background: checked ? 'linear-gradient(135deg, #b87820, #d8a030)' : 'rgba(255,255,255,0.08)',
          border: checked ? 'none' : '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
          style={{
            left: checked ? '22px' : '2px',
            background: checked ? '#06050d' : 'rgba(255,255,255,0.4)',
          }}
        />
      </button>
    </div>
  )
}

// ── Skill track card ──────────────────────────────────────────────────────────

const TRACK_META = {
  push: { label: 'Push',  icon: <Zap className="w-4 h-4" />,       color: '#f97316' },
  pull: { label: 'Pull',  icon: <ArrowUp className="w-4 h-4" />,   color: '#a78bfa' },
  core: { label: 'Core',  icon: <Target className="w-4 h-4" />,    color: '#34d399' },
  legs: { label: 'Legs',  icon: <Footprints className="w-4 h-4" />, color: '#60a5fa' },
}

function SkillCard({ track, levelData, hasPullBar, onTap }) {
  const meta       = TRACK_META[track]
  const progressions = SKILL_PROGRESSIONS[track]
  const currentProg = progressions[levelData.level - 1]
  const locked      = track === 'pull' && !hasPullBar

  return (
    <button
      onClick={() => !locked && onTap(track)}
      className="skanda-card p-4 text-left relative overflow-hidden transition-all"
      style={{ border: locked ? '1px solid rgba(255,255,255,0.05)' : `1px solid ${meta.color}22` }}
    >
      {locked && (
        <div className="absolute inset-0 bg-skanda-bg/80 flex flex-col items-center justify-center z-10 rounded-2xl gap-1">
          <Lock className="w-5 h-5 text-skanda-muted" />
          <p className="text-skanda-muted text-xs text-center px-2">Needs pull-up bar</p>
        </div>
      )}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: meta.color + '18', color: meta.color }}>
          {meta.icon}
        </div>
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: meta.color }}>
          {meta.label}
        </span>
        <ChevronRight className="w-3 h-3 text-skanda-muted ml-auto" />
      </div>
      <p className="text-skanda-text text-xs font-semibold mb-1 leading-tight">{currentProg?.name}</p>
      <p className="text-skanda-muted text-xs mb-2 leading-tight">{levelData.sessions}/3 sessions at this level</p>
      {/* 5 progress dots */}
      <div className="flex gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex-1 h-1 rounded-full transition-all"
            style={{
              background: i < levelData.level
                ? `linear-gradient(90deg, ${meta.color}cc, ${meta.color})`
                : 'rgba(255,255,255,0.08)',
              boxShadow: i === levelData.level - 1 ? `0 0 6px ${meta.color}80` : 'none',
            }}
          />
        ))}
      </div>
      <p className="text-xs mt-1.5" style={{ color: meta.color + 'aa' }}>Level {levelData.level} / 5</p>
    </button>
  )
}

// ── Skill Ladder Modal ─────────────────────────────────────────────────────────

function SkillLadderModal({ track, levelData, onLevelUp, onClose }) {
  const meta        = TRACK_META[track]
  const progressions = SKILL_PROGRESSIONS[track]
  const canLevelUp  = levelData.sessions >= 3 && levelData.level < 5

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full rounded-t-3xl pb-safe" style={{ background: '#100e20', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none' }}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: meta.color + '18', color: meta.color }}>
                {meta.icon}
              </div>
              <span className="font-cinzel font-bold text-skanda-text">{meta.label} Skill Progression</span>
            </div>
            <button onClick={onClose} className="text-skanda-muted hover:text-skanda-text">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2 mb-4">
            {progressions.map((prog, i) => {
              const levelNum   = i + 1
              const isComplete = levelNum < levelData.level
              const isCurrent  = levelNum === levelData.level
              const isFuture   = levelNum > levelData.level
              return (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl transition-all"
                  style={{
                    background: isCurrent ? meta.color + '12' : 'rgba(255,255,255,0.03)',
                    border: isCurrent ? `1px solid ${meta.color}40` : '1px solid rgba(255,255,255,0.05)',
                    opacity: isFuture ? 0.5 : 1,
                  }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      background: isComplete ? '#22c55e20' : isCurrent ? meta.color + '20' : 'rgba(255,255,255,0.05)',
                      border: isComplete ? '1px solid #22c55e50' : isCurrent ? `1px solid ${meta.color}60` : '1px solid rgba(255,255,255,0.08)',
                    }}>
                    {isComplete
                      ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                      : isFuture
                      ? <Lock className="w-3 h-3 text-skanda-muted" />
                      : <span className="text-xs font-black" style={{ color: meta.color }}>{levelNum}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${isCurrent ? 'text-skanda-text' : 'text-skanda-dim'}`}>
                        {prog.name}
                      </p>
                      {isCurrent && (
                        <span className="text-xs px-1.5 py-0.5 rounded font-bold"
                          style={{ background: meta.color + '20', color: meta.color }}>
                          CURRENT
                        </span>
                      )}
                    </div>
                    <p className="text-skanda-muted text-xs mt-0.5">{prog.description}</p>
                    <p className="text-xs mt-1" style={{ color: meta.color + 'cc' }}>Target: {prog.target}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {canLevelUp ? (
            <div className="space-y-2">
              <div className="p-3 rounded-xl text-center"
                style={{ background: 'rgba(200,146,42,0.08)', border: '1px solid rgba(200,146,42,0.3)' }}>
                <p className="text-skanda-gold text-xs font-bold mb-0.5">3 sessions complete — you're ready to progress!</p>
                <p className="text-skanda-dim text-xs">
                  Level up to: <span className="text-skanda-text font-semibold">
                    {progressions[levelData.level]?.name}
                  </span>
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 btn-ghost py-3 text-sm">Not yet</button>
                <button onClick={() => onLevelUp(track)} className="flex-1 btn-gold py-3 text-sm font-bold">Level Up →</button>
              </div>
            </div>
          ) : levelData.level === 5 ? (
            <div className="p-3 rounded-xl text-center"
              style={{ background: 'rgba(200,146,42,0.08)', border: '1px solid rgba(200,146,42,0.3)' }}>
              <p className="text-skanda-gold text-sm font-bold font-cinzel">Maximum Level Reached</p>
              <p className="text-skanda-dim text-xs mt-1">You've mastered the {meta.label.toLowerCase()} skill track.</p>
            </div>
          ) : (
            <div className="p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-skanda-dim text-xs text-center">
                Complete {3 - levelData.sessions} more session{3 - levelData.sessions !== 1 ? 's' : ''} at this level to unlock the next progression.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Exercise preview card ─────────────────────────────────────────────────────

function ExercisePreviewRow({ ex, isSkill }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-skanda-border last:border-0">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 text-left">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {isSkill && (
            <span className="text-xs px-1.5 py-0.5 rounded font-bold shrink-0"
              style={{ background: 'rgba(200,146,42,0.15)', color: '#c8922a' }}>
              SKILL
            </span>
          )}
          <span className="text-skanda-text text-sm font-medium truncate">{ex.name || ex.exercise}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="text-skanda-dim text-xs">
            {ex.sets}×{ex.target_reps || ex.reps_or_duration}
          </span>
          {open ? <ChevronUp className="w-3.5 h-3.5 text-skanda-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-skanda-muted" />}
        </div>
      </button>
      {open && (
        <div className="pb-3 space-y-2 animate-fade-in">
          {ex.cue && (
            <div className="px-3 py-2 rounded-lg" style={{ background: 'rgba(200,146,42,0.06)', border: '1px solid rgba(200,146,42,0.15)' }}>
              <p className="text-xs text-skanda-gold font-semibold mb-0.5">Form Cue</p>
              <p className="text-xs text-skanda-dim leading-relaxed">{ex.cue}</p>
            </div>
          )}
          {ex.why && (
            <div className="px-3 py-2 rounded-lg" style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)' }}>
              <p className="text-xs text-violet-400 font-semibold mb-0.5">Why this builds your skill</p>
              <p className="text-xs text-skanda-dim leading-relaxed">{ex.why}</p>
            </div>
          )}
          {ex.regression && (
            <p className="text-xs text-skanda-muted px-1">
              <span className="text-emerald-400 font-semibold">Easier: </span>{ex.regression}
            </p>
          )}
          {ex.progression && (
            <p className="text-xs text-skanda-muted px-1">
              <span className="text-skanda-gold font-semibold">Harder: </span>{ex.progression}
            </p>
          )}
          {ex.overload_note && (
            <p className="text-xs text-skanda-muted px-1">
              <span className="text-skanda-dim font-semibold">Target: </span>{ex.overload_note}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HomeWorkouts() {
  const navigate  = useNavigate()
  const { profile, session } = useAuth()

  const [equipment, setEquipment]         = useState(() => getHomeEquipment())
  const [skillLevels, setSkillLevels]     = useState(() => getSkillLevels(profile?.tier || 'arambha'))
  const [showEquipSetup, setShowEquipSetup] = useState(false)
  const [dayType, setDayType]             = useState(getTodayDayType)
  const [workout, setWorkout]             = useState(null)
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')
  const [ladderTrack, setLadderTrack]     = useState(null)

  // Sync skill levels when tier changes
  useEffect(() => {
    const levels = getSkillLevels(profile?.tier || 'arambha')
    setSkillLevels(levels)
  }, [profile?.tier])

  // Hydrate skill levels from cloud on mount
  useEffect(() => {
    async function loadFromCloud() {
      const uid = session?.user?.id
      if (!uid) return
      const cloudSkills = await getSkillProgress(uid)
      if (cloudSkills) {
        saveSkillLevels(cloudSkills)
        setSkillLevels(cloudSkills)
      }
    }
    loadFromCloud()
  }, [session?.user?.id])

  function saveEquipment() {
    saveHomeEquipment(equipment)
    setShowEquipSetup(false)
  }

  function handleLevelUp(track) {
    const updated = {
      ...skillLevels,
      [track]: { level: Math.min(skillLevels[track].level + 1, 5), sessions: 0 },
    }
    setSkillLevels(updated)
    saveSkillLevels(updated)
    if (session?.user?.id) saveSkillProgress(session.user.id, updated)
    setLadderTrack(null)
  }

  async function handleGenerate() {
    setLoading(true)
    setError('')
    setWorkout(null)
    try {
      const recent = getRecentHomeSessions()
      const result = await generateHomeWorkout({
        tier:           profile?.tier || 'arambha',
        weight:         profile?.weight_lbs || 170,
        goal:           profile?.goal || 'muscle_gain',
        equipment,
        skillLevels,
        dayType,
        recentSessions: recent,
        testData:       profile?.test_data || {},
      })
      if (typeof result === 'string') {
        setError(result)
      } else {
        setWorkout(result)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const DAY_OPTIONS = [
    { id: 'upper', label: 'Upper Body', desc: 'Chest · Back · Shoulders · Arms' },
    { id: 'lower', label: 'Lower Body', desc: 'Quads · Hamstrings · Glutes · Calves' },
    { id: 'full',  label: 'Full Body',  desc: 'All major muscle groups' },
  ]

  return (
    <div className="min-h-dvh bg-skanda-bg flex flex-col">

      {/* ── Header ── */}
      <header className="relative px-5 pt-8 pb-4 header-frosted">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 120% at 50% -20%, rgba(200,146,42,0.07) 0%, transparent 70%)' }} />
        <div className="relative flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="text-skanda-dim hover:text-skanda-text transition-colors p-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-skanda-muted text-xs uppercase tracking-[0.25em] mb-0.5">SKANDA</p>
            <h1 className="font-cinzel font-black text-xl text-gradient-gold">Home Training</h1>
          </div>
          <button
            onClick={() => setShowEquipSetup(!showEquipSetup)}
            className="p-1 transition-colors"
            style={{ color: showEquipSetup ? '#c8922a' : 'var(--skanda-dim)' }}
          >
            <Settings2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto pb-24">

        {/* ── Equipment panel ── */}
        {showEquipSetup && (
          <div className="mx-5 mt-4 animate-slide-up">
            <div className="skanda-card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-skanda-gold text-xs font-bold uppercase tracking-widest">Your Equipment</p>
                <p className="text-skanda-muted text-xs">Tap gear icon to close</p>
              </div>
              <EquipToggle label="Pull-up Bar" icon="🏗️" checked={equipment.pullup_bar}
                onChange={v => setEquipment(e => ({ ...e, pullup_bar: v }))} />
              <EquipToggle label="Resistance Bands" icon="🎽" checked={equipment.resistance_bands}
                onChange={v => setEquipment(e => ({ ...e, resistance_bands: v }))} />
              <EquipToggle label="Dip Bars / Parallel Bars" icon="⚙️" checked={equipment.dip_bars}
                onChange={v => setEquipment(e => ({ ...e, dip_bars: v }))} />
              <button onClick={saveEquipment} className="btn-gold w-full py-2.5 text-sm font-bold mt-4">
                Save Equipment
              </button>
            </div>
          </div>
        )}

        {/* ── Skill tracker ── */}
        <div className="mx-5 mt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-skanda-gold text-xs font-bold uppercase tracking-widest">Calisthenics Progression</p>
            <p className="text-skanda-muted text-xs">Tap to see your skill ladder</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {(['push', 'pull', 'core', 'legs']).map(track => (
              <SkillCard
                key={track}
                track={track}
                levelData={skillLevels[track]}
                hasPullBar={equipment.pullup_bar}
                onTap={setLadderTrack}
              />
            ))}
          </div>
        </div>

        {/* ── Day type selector ── */}
        <div className="mx-5 mt-5">
          <p className="text-skanda-gold text-xs font-bold uppercase tracking-widest mb-3">Today's Session</p>
          <div className="space-y-2">
            {DAY_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setDayType(opt.id)}
                className="w-full flex items-center justify-between p-4 rounded-2xl transition-all text-left"
                style={{
                  background: dayType === opt.id ? 'rgba(200,146,42,0.1)' : 'rgba(255,255,255,0.03)',
                  border: dayType === opt.id ? '1px solid rgba(200,146,42,0.5)' : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div>
                  <p className={`font-cinzel font-bold text-sm ${dayType === opt.id ? 'text-skanda-gold' : 'text-skanda-dim'}`}>
                    {opt.label}
                  </p>
                  <p className="text-skanda-muted text-xs mt-0.5">{opt.desc}</p>
                </div>
                {dayType === opt.id && <Check className="w-4 h-4 text-skanda-gold shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* ── Generate button ── */}
        <div className="mx-5 mt-5">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="btn-gold w-full py-4 font-cinzel font-bold tracking-wide flex items-center justify-center gap-2"
          >
            {loading
              ? <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Oracle is prescribing...</>
              : <><Zap className="w-4 h-4" /> Generate Today's Workout</>
            }
          </button>

          {error && (
            <div className="mt-3 p-3 rounded-xl flex items-start gap-2"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <span className="text-red-400 text-xs shrink-0 mt-0.5">⚠</span>
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}
        </div>

        {/* ── Loading shimmer ── */}
        {loading && (
          <div className="mx-5 mt-5 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skanda-card p-5 space-y-3">
                <div className="shimmer h-3 rounded w-1/3" />
                <div className="shimmer h-4 rounded w-full" />
                <div className="shimmer h-4 rounded w-4/5" />
                <div className="shimmer h-4 rounded w-3/4" />
              </div>
            ))}
          </div>
        )}

        {/* ── Workout display ── */}
        {!loading && workout && (
          <div className="mx-5 mt-5 space-y-4 animate-fade-in">

            {/* AI fallback banner */}
            {workout._fromLocal && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
                style={{ background: 'rgba(200,146,42,0.08)', color: '#c8922a', border: '1px solid rgba(200,146,42,0.2)' }}>
                <Zap className="w-3.5 h-3.5 shrink-0" />
                <span>AI unavailable — using smart local template. Connect to Wi-Fi for a personalised plan.</span>
              </div>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(200,146,42,0.12)', color: '#c8922a', border: '1px solid rgba(200,146,42,0.25)' }}>
                {workout.estimated_duration}
              </div>
              <div className="px-3 py-1.5 rounded-full text-xs font-semibold capitalize"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--skanda-dim)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {workout.intensity}
              </div>
              <div className="px-3 py-1.5 rounded-full text-xs font-semibold capitalize"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--skanda-dim)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {workout.day_type} body
              </div>
            </div>

            {/* Warmup */}
            {workout.warmup?.length > 0 && (
              <WorkoutSection title="Warmup" subtitle={`${workout.warmup.length} exercises · 5 min`} color="#34d399">
                {workout.warmup.map((ex, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-skanda-border last:border-0">
                    <span className="text-skanda-text text-sm">{ex.name}</span>
                    <div className="text-right">
                      <span className="text-skanda-dim text-xs">{ex.reps_or_duration}</span>
                      {ex.cue && <p className="text-skanda-muted text-xs italic">{ex.cue}</p>}
                    </div>
                  </div>
                ))}
              </WorkoutSection>
            )}

            {/* Skill block */}
            {workout.skill_block?.length > 0 && (
              <WorkoutSection title="Skill Work" subtitle="Calisthenics progression" color="#a78bfa">
                {workout.skill_block.map((ex, i) => (
                  <ExercisePreviewRow key={i} ex={ex} isSkill />
                ))}
                {workout.skill_block[0]?.level_up_target && (
                  <p className="text-xs text-skanda-muted pt-2 italic">
                    Level-up target: {workout.skill_block[0].level_up_target}
                  </p>
                )}
              </WorkoutSection>
            )}

            {/* Main work */}
            {workout.main_work?.length > 0 && (
              <WorkoutSection title="Main Work" subtitle={`${workout.main_work.length} exercises`} color="#c8922a">
                {workout.main_work.map((ex, i) => (
                  <ExercisePreviewRow key={i} ex={ex} isSkill={false} />
                ))}
                {workout.progressive_overload_note && (
                  <div className="mt-3 pt-3 border-t border-skanda-border">
                    <p className="text-xs text-skanda-muted">
                      <span className="text-skanda-gold font-semibold">Progression: </span>
                      {workout.progressive_overload_note}
                    </p>
                  </div>
                )}
              </WorkoutSection>
            )}

            {/* Finisher */}
            {workout.finisher && (
              <div className="skanda-card p-4" style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-4 rounded-full" style={{ background: '#ef4444' }} />
                  <p className="text-xs font-bold uppercase tracking-widest text-red-400">Finisher</p>
                  {workout.finisher.duration_est && (
                    <span className="text-xs text-skanda-muted ml-auto">{workout.finisher.duration_est}</span>
                  )}
                </div>
                <p className="text-skanda-text font-semibold text-sm">{workout.finisher.name}</p>
                <p className="text-skanda-dim text-xs mt-1 leading-relaxed">{workout.finisher.description}</p>
                {workout.finisher.notes && (
                  <p className="text-skanda-muted text-xs mt-1.5 italic">{workout.finisher.notes}</p>
                )}
              </div>
            )}

            {/* Begin session */}
            <button
              onClick={() => navigate('/home-workout-session', { state: { workout, skillLevels, equipment } })}
              className="btn-gold w-full py-4 font-cinzel font-bold tracking-wide flex items-center justify-center gap-2 mt-2"
            >
              <Play className="w-4 h-4" /> Begin Session
            </button>
          </div>
        )}
      </div>

      {/* ── Skill ladder modal ── */}
      {ladderTrack && (
        <SkillLadderModal
          track={ladderTrack}
          levelData={skillLevels[ladderTrack]}
          onLevelUp={handleLevelUp}
          onClose={() => setLadderTrack(null)}
        />
      )}

      {/* ── Bottom nav ── */}
      <BottomNav active="/home-workouts" />
    </div>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function WorkoutSection({ title, subtitle, color, children }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="skanda-card overflow-hidden" style={{ border: `1px solid ${color}22` }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-5 rounded-full" style={{ background: color }} />
          <div className="text-left">
            <p className="text-skanda-text font-semibold text-sm">{title}</p>
            <p className="text-skanda-muted text-xs">{subtitle}</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-skanda-muted" /> : <ChevronDown className="w-4 h-4 text-skanda-muted" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-skanda-border">{children}</div>}
    </div>
  )
}

function BottomNav({ active }) {
  const navigate = useNavigate()
  const items = [
    { to: '/dashboard',    Icon: Flame,    label: 'Home' },
    { to: '/workout',      Icon: Dumbbell, label: 'Train' },
    { to: '/nutrition',    Icon: Utensils, label: 'Fuel' },
    { to: '/ai',           Icon: Zap,      label: 'Oracle' },
    { to: '/profile',      Icon: User,     label: 'Profile' },
  ]
  return (
    <nav className="fixed bottom-0 inset-x-0 safe-bottom"
      style={{ background: 'rgba(6,5,13,0.85)', backdropFilter: 'blur(20px) saturate(1.5)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex max-w-lg mx-auto px-2 py-1">
        {items.map(({ to, Icon, label }) => {
          const isActive = active === to
          return (
            <button key={to} onClick={() => navigate(to)}
              className="flex-1 flex flex-col items-center py-2 gap-0.5 transition-all relative">
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ background: 'linear-gradient(90deg, transparent, #c8922a, transparent)' }} />
              )}
              <Icon className={`w-5 h-5 transition-all ${isActive ? 'text-skanda-gold' : 'text-skanda-muted'}`}
                style={isActive ? { filter: 'drop-shadow(0 0 6px rgba(200,146,42,0.7))' } : {}} />
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${isActive ? 'text-skanda-gold' : 'text-skanda-muted'}`}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
