const STORAGE_KEY = 'skanda_body_measurements'
const MAX_ENTRIES = 52  // 1 year of weekly logs

export const MEASUREMENT_FIELDS = [
  { key: 'waist_in',    label: 'Waist',      unit: 'in', goal: 'down' },
  { key: 'chest_in',    label: 'Chest',      unit: 'in', goal: 'up'   },
  { key: 'left_arm_in', label: 'Left Arm',   unit: 'in', goal: 'up'   },
  { key: 'right_arm_in',label: 'Right Arm',  unit: 'in', goal: 'up'   },
  { key: 'thighs_in',   label: 'Thighs',     unit: 'in', goal: 'up'   },
]

export function getMeasurements() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveMeasurement(values) {
  const entries = getMeasurements()
  const entry = {
    id:   Date.now().toString(),
    date: new Date().toISOString(),
    ...values,
  }
  const updated = [entry, ...entries].slice(0, MAX_ENTRIES)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return entry
}

export function getLatestMeasurement() {
  const entries = getMeasurements()
  return entries[0] || null
}
