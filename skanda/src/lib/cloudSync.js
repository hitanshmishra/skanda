// Cloud → localStorage hydration — runs once after login
// Strategy: cloud data is the source of truth for backup data.
// We add cloud entries that are missing locally; never delete local entries.

import {
  cloudGetMeasurements,
  cloudGetNutritionDays,
  cloudGetPhotos,
} from './supabase'

const SYNC_KEY = 'skanda_cloud_sync_date'

function todayKey() {
  return new Date().toISOString().split('T')[0]
}

// Only hydrate once per calendar day to avoid hammering the DB on every page load
export function shouldRunSync() {
  try {
    return localStorage.getItem(SYNC_KEY) !== todayKey()
  } catch {
    return true
  }
}

function markSynced() {
  try {
    localStorage.setItem(SYNC_KEY, todayKey())
  } catch {}
}

// ── Measurements ──────────────────────────────────────────────────────────────

function hydrateMeasurements(cloudRows) {
  if (!cloudRows.length) return
  try {
    const local = JSON.parse(localStorage.getItem('skanda_body_measurements') || '[]')
    const localIds = new Set(local.map(e => e.id))
    const newEntries = cloudRows
      .filter(r => !localIds.has(r.id))
      .map(r => ({
        id:           r.id,
        date:         r.logged_at,
        waist_in:     r.waist_in,
        chest_in:     r.chest_in,
        left_arm_in:  r.left_arm_in,
        right_arm_in: r.right_arm_in,
        thighs_in:    r.thighs_in,
      }))
    if (!newEntries.length) return
    const merged = [...local, ...newEntries]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 52)
    localStorage.setItem('skanda_body_measurements', JSON.stringify(merged))
  } catch {}
}

// ── Nutrition daily ───────────────────────────────────────────────────────────

function hydrateNutritionDays(cloudRows) {
  if (!cloudRows.length) return
  try {
    const local = JSON.parse(localStorage.getItem('skanda_nutrition_daily') || '{}')
    let changed = false
    cloudRows.forEach(r => {
      // Prefer the entry with higher calories (more complete log wins)
      if (!local[r.date] || (r.calories || 0) > (local[r.date].calories || 0)) {
        local[r.date] = {
          calories: r.calories || 0,
          protein:  r.protein  || 0,
          carbs:    r.carbs    || 0,
          fat:      r.fat      || 0,
        }
        changed = true
      }
    })
    if (changed) localStorage.setItem('skanda_nutrition_daily', JSON.stringify(local))
  } catch {}
}

// ── Progress photos ───────────────────────────────────────────────────────────

function hydratePhotos(cloudRows) {
  if (!cloudRows.length) return
  try {
    const local = JSON.parse(localStorage.getItem('skanda_progress_photos') || '[]')
    const localIds = new Set(local.map(p => p.id))
    const newPhotos = cloudRows
      .filter(r => !localIds.has(r.id))
      .map(r => ({
        id:      r.id,
        date:    r.taken_at,
        dataUrl: r.photo_data,
        note:    r.note || '',
      }))
    if (!newPhotos.length) return
    const merged = [...local, ...newPhotos]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 20)
    localStorage.setItem('skanda_progress_photos', JSON.stringify(merged))
  } catch {}
}

// ── Main hydration entry point ────────────────────────────────────────────────

export async function runCloudHydration(userId) {
  if (!userId || userId === 'demo' || !userId.match(/^[0-9a-f-]{36}$/i)) return
  if (!shouldRunSync()) return

  try {
    const [measurements, nutritionDays, photos] = await Promise.all([
      cloudGetMeasurements(userId),
      cloudGetNutritionDays(userId, 14),
      cloudGetPhotos(userId),
    ])
    hydrateMeasurements(measurements)
    hydrateNutritionDays(nutritionDays)
    hydratePhotos(photos)
    // Only stamp as synced if we got actual data back — prevents locking out fresh devices
    if (measurements.length || nutritionDays.length || photos.length) {
      markSynced()
    }
  } catch {
    // Hydration is best-effort — never throw
  }
}
