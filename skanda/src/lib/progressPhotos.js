const STORAGE_KEY = 'skanda_progress_photos'
const MAX_PHOTOS  = 20
const MAX_DIM     = 900   // px — resize before storing
const QUALITY     = 0.75  // JPEG quality

// ── Compress via canvas ───────────────────────────────────────────────────────

export function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height))
      const w = Math.round(img.width  * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', QUALITY))
    }
    img.onerror = (err) => { URL.revokeObjectURL(url); reject(err) }
    img.src = url
  })
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export function getPhotos() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function savePhoto(dataUrl, note = '') {
  const photos = getPhotos()
  const entry = {
    id:      Date.now().toString(),
    date:    new Date().toISOString(),
    dataUrl,
    note,
  }
  const updated = [entry, ...photos].slice(0, MAX_PHOTOS)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return entry
}

export function deletePhoto(id) {
  const updated = getPhotos().filter(p => p.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

// ── Weekly prompt logic ───────────────────────────────────────────────────────

export function needsWeeklyPhoto() {
  const photos = getPhotos()
  if (photos.length === 0) return true
  const lastMs   = new Date(photos[0].date).getTime()
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  return Date.now() - lastMs > sevenDays
}

export function dismissPhotoPrompt() {
  localStorage.setItem('skanda_photo_prompt_dismissed', new Date().toDateString())
}

export function isPhotoPromptDismissedToday() {
  return localStorage.getItem('skanda_photo_prompt_dismissed') === new Date().toDateString()
}
