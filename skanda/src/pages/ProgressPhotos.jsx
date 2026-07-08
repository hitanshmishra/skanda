import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getPhotos, savePhoto, deletePhoto, compressImage,
} from '../lib/progressPhotos'
import { useAuth } from '../hooks/useAuth'
import { cloudSavePhoto, cloudDeletePhoto } from '../lib/supabase'
import { ChevronLeft, Camera, Upload, Trash2, SplitSquareHorizontal, X } from 'lucide-react'

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Before / After Comparison Slider ─────────────────────────────────────────

function CompareSlider({ before, after, onClose }) {
  const [pos, setPos] = useState(50)

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-5 pt-10 pb-3">
        <div>
          <p className="text-white/60 text-xs">BEFORE · {formatDate(before.date)}</p>
          <p className="text-white/60 text-xs">AFTER · {formatDate(after.date)}</p>
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      <div className="flex-1 relative mx-5 mb-6 rounded-2xl overflow-hidden select-none"
        style={{ touchAction: 'none' }}>
        {/* After (base layer) */}
        <img src={after.dataUrl}
          className="absolute inset-0 w-full h-full object-contain bg-black" />

        {/* Before (clipped left portion) */}
        <div className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <img src={before.dataUrl}
            className="w-full h-full object-contain bg-zinc-900" />
        </div>

        {/* Divider + handle */}
        <div className="absolute top-0 bottom-0 pointer-events-none"
          style={{ left: `${pos}%`, transform: 'translateX(-50%)', width: 3, background: 'rgba(255,255,255,0.9)' }}>
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-xl"
            style={{ zIndex: 10 }}>
            <SplitSquareHorizontal className="w-5 h-5 text-gray-800" />
          </div>
        </div>

        {/* BEFORE / AFTER labels */}
        <div className="absolute top-3 left-3 pointer-events-none">
          <span className="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded-full">BEFORE</span>
        </div>
        <div className="absolute top-3 right-3 pointer-events-none">
          <span className="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded-full">AFTER</span>
        </div>

        {/* Invisible range input overlay */}
        <input
          type="range" min="0" max="100" value={pos}
          onChange={e => setPos(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-col-resize"
          style={{ zIndex: 20 }}
        />
      </div>

      <p className="text-white/40 text-xs text-center pb-6">Drag to compare</p>
    </div>
  )
}

// ── Delete confirmation ───────────────────────────────────────────────────────

function DeleteConfirm({ photo, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full bg-skanda-surface rounded-t-3xl p-6 space-y-4">
        <p className="text-skanda-text font-semibold text-center">Delete this photo?</p>
        <p className="text-skanda-dim text-sm text-center">This cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 btn-ghost py-3 text-sm">Cancel</button>
          <button onClick={onConfirm}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-red-400"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ProgressPhotos() {
  const navigate        = useNavigate()
  const { session }     = useAuth()
  const fileRef         = useRef()

  const [photos,   setPhotos]   = useState(() => getPhotos())
  const [note,     setNote]     = useState('')
  const [saving,   setSaving]   = useState(false)
  const [preview,  setPreview]  = useState(null)  // { dataUrl } pending save
  const [compare,  setCompare]  = useState(null)  // { before, after }
  const [toDelete, setToDelete] = useState(null)
  const [error,    setError]    = useState('')

  useEffect(() => { setPhotos(getPhotos()) }, [])

  async function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    setError('')
    setSaving(true)
    try {
      const dataUrl = await compressImage(file)
      setPreview({ dataUrl })
    } catch {
      setError('Could not read image. Try a different file.')
    } finally {
      setSaving(false)
    }
  }

  function confirmSave() {
    if (!preview) return
    const entry = savePhoto(preview.dataUrl, note.trim())
    if (session?.user?.id) cloudSavePhoto(session.user.id, entry)
    setPhotos(getPhotos())
    setPreview(null)
    setNote('')
  }

  function handleDelete(photo) {
    deletePhoto(photo.id)
    if (session?.user?.id) cloudDeletePhoto(session.user.id, photo.id)
    setPhotos(getPhotos())
    setToDelete(null)
  }

  function openCompare(idx) {
    if (photos.length < 2) return
    // idx = the "after" (newer); pick earliest as "before"
    const after  = photos[idx]
    const before = photos[photos.length - 1]
    if (idx === 0) {
      // Tapped the newest photo — compare first two
      setCompare({ before: photos[1], after: photos[0] })
    } else {
      setCompare({ before, after })
    }
  }

  return (
    <div className="min-h-dvh bg-skanda-bg flex flex-col">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 flex items-center gap-3 border-b border-skanda-border">
        <button onClick={() => navigate('/dashboard')} className="text-skanda-dim hover:text-skanda-text">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-cinzel font-bold text-skanda-text">PROGRESS PHOTOS</h1>
          <p className="text-skanda-dim text-xs">{photos.length} photo{photos.length !== 1 ? 's' : ''} · stored on device</p>
        </div>
        {photos.length >= 2 && (
          <button
            onClick={() => setCompare({ before: photos[photos.length - 1], after: photos[0] })}
            className="ml-auto flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}>
            <SplitSquareHorizontal className="w-3.5 h-3.5" /> Compare
          </button>
        )}
      </header>

      <div className="flex-1 px-5 py-5 pb-10 overflow-auto space-y-4">
        {/* Add photo CTA */}
        {!preview && (
          <div
            onClick={() => fileRef.current?.click()}
            className="rounded-2xl border-2 border-dashed border-skanda-border hover:border-skanda-gold/40 transition-colors cursor-pointer p-8 flex flex-col items-center gap-3"
          >
            {saving ? (
              <div className="w-8 h-8 border-2 border-skanda-gold border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-skanda-gold/10 border border-skanda-gold/20 flex items-center justify-center">
                  <Camera className="w-7 h-7 text-skanda-gold" />
                </div>
                <div className="text-center">
                  <p className="text-skanda-text font-semibold">Add Progress Photo</p>
                  <p className="text-skanda-dim text-xs mt-1">Camera or gallery · compressed for storage</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-xs text-skanda-dim bg-skanda-surface border border-skanda-border px-3 py-1 rounded-full flex items-center gap-1">
                    <Camera className="w-3 h-3" /> Camera
                  </span>
                  <span className="text-xs text-skanda-dim bg-skanda-surface border border-skanda-border px-3 py-1 rounded-full flex items-center gap-1">
                    <Upload className="w-3 h-3" /> Gallery
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*"
          className="hidden" onChange={e => handleFile(e.target.files?.[0])} />

        {/* Preview pending save */}
        {preview && (
          <div className="space-y-3 animate-slide-up">
            <div className="rounded-2xl overflow-hidden bg-black flex items-center justify-center" style={{ maxHeight: 380 }}>
              <img src={preview.dataUrl} alt="Preview" className="max-w-full max-h-96 object-contain" />
            </div>
            <input
              type="text"
              className="skanda-input w-full px-3 py-2.5 text-sm"
              placeholder='Optional note — e.g. "Week 4 front pose"'
              value={note}
              onChange={e => setNote(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => { setPreview(null); setNote('') }}
                className="flex-1 btn-ghost py-3 text-sm">
                Retake
              </button>
              <button onClick={confirmSave}
                className="flex-1 btn-gold py-3 text-sm font-bold">
                Save Photo
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        {/* Photo grid */}
        {photos.length === 0 && !preview && (
          <div className="text-center py-10">
            <p className="text-skanda-muted text-sm">No photos yet.</p>
            <p className="text-skanda-muted text-xs mt-1">Take a photo every week to track your transformation.</p>
          </div>
        )}

        {photos.length > 0 && !preview && (
          <div>
            <p className="text-skanda-dim text-xs uppercase tracking-widest mb-3">Your Photos</p>
            <div className="grid grid-cols-2 gap-3">
              {photos.map((photo, i) => (
                <div key={photo.id} className="relative rounded-xl overflow-hidden bg-skanda-surface"
                  style={{ aspectRatio: '3/4' }}>
                  <img src={photo.dataUrl} alt={photo.note || 'Progress'}
                    className="w-full h-full object-cover" />

                  {/* Overlay with actions */}
                  <div className="absolute inset-0 flex flex-col justify-between p-2"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }}>
                    <button
                      onClick={() => setToDelete(photo)}
                      className="self-end w-7 h-7 rounded-full bg-black/50 flex items-center justify-center">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                    <div>
                      {i === 0 && (
                        <span className="text-xs font-bold text-skanda-gold">Latest</span>
                      )}
                      <p className="text-white text-[11px] mt-0.5">{formatDate(photo.date)}</p>
                      {photo.note && (
                        <p className="text-white/70 text-[10px] truncate">{photo.note}</p>
                      )}
                    </div>
                  </div>

                  {/* Compare tap */}
                  {photos.length >= 2 && i > 0 && (
                    <button
                      onClick={() => openCompare(i)}
                      className="absolute inset-0 w-full h-full opacity-0"
                      aria-label="Compare with latest"
                    />
                  )}
                </div>
              ))}
            </div>

            {photos.length >= 2 && (
              <p className="text-skanda-muted text-xs text-center mt-3">
                Tap the Compare button to see your transformation side by side
              </p>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {compare && (
        <CompareSlider
          before={compare.before}
          after={compare.after}
          onClose={() => setCompare(null)}
        />
      )}

      {toDelete && (
        <DeleteConfirm
          photo={toDelete}
          onConfirm={() => handleDelete(toDelete)}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  )
}
