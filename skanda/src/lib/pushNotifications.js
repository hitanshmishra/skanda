const REMINDER_KEY   = 'skanda_daily_reminder'   // { enabled, hour, minute }
const FIRED_KEY      = 'skanda_reminder_fired'   // date string

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    return reg
  } catch {
    return null
  }
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied')  return 'denied'
  const result = await Notification.requestPermission()
  return result
}

export function getNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export function getReminderSettings() {
  try {
    return JSON.parse(localStorage.getItem(REMINDER_KEY) || 'null') || { enabled: false, hour: 7, minute: 0 }
  } catch {
    return { enabled: false, hour: 7, minute: 0 }
  }
}

export function saveReminderSettings(settings) {
  localStorage.setItem(REMINDER_KEY, JSON.stringify(settings))
}

// Call on app mount — fires notification if reminder is due and hasn't fired today
export async function checkAndFireReminder() {
  const settings = getReminderSettings()
  if (!settings.enabled) return
  if (Notification.permission !== 'granted') return

  const today      = new Date().toDateString()
  const firedToday = localStorage.getItem(FIRED_KEY) === today
  if (firedToday) return

  const now    = new Date()
  const due    = new Date()
  due.setHours(settings.hour, settings.minute, 0, 0)

  if (now >= due) {
    localStorage.setItem(FIRED_KEY, today)
    await showReminder()
  }
}

async function showReminder() {
  const messages = [
    'Your training awaits, warrior. The iron doesn\'t lift itself.',
    'Day begins with discipline. Open your battle plan.',
    'Consistency beats intensity. Show up today.',
    'Log your rations. Hit your macros. Conquer the day.',
    'A warrior\'s body is built one rep at a time. Begin.',
  ]
  const body = messages[Math.floor(Math.random() * messages.length)]

  try {
    const reg = await navigator.serviceWorker.ready
    await reg.showNotification('SKANDA — Time to Train', {
      body,
      icon:  '/favicon.svg',
      badge: '/favicon.svg',
      data:  { url: '/dashboard' },
      actions: [
        { action: 'open',    title: 'Open App'  },
        { action: 'dismiss', title: 'Dismiss'   },
      ],
    })
  } catch {
    // SW not ready — fallback to Notification API
    if (Notification.permission === 'granted') {
      new Notification('SKANDA — Time to Train', { body, icon: '/favicon.svg' })
    }
  }
}
