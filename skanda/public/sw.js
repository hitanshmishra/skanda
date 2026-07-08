const CACHE_NAME = 'skanda-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim())
})

// Handle Web Push
self.addEventListener('push', e => {
  const data = e.data?.json() || {}
  e.waitUntil(
    self.registration.showNotification(data.title || 'SKANDA', {
      body:  data.body  || 'Time to train, warrior.',
      icon:  '/favicon.svg',
      badge: '/favicon.svg',
      data:  { url: data.url || '/' },
      actions: [
        { action: 'open',    title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss'  },
      ],
    })
  )
})

// Tap notification → navigate to correct URL
self.addEventListener('notificationclick', e => {
  e.notification.close()
  if (e.action === 'dismiss') return
  const url = e.notification.data?.url || '/'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Focus existing window AND navigate it to the notification URL
          return client.focus().then(() => client.navigate ? client.navigate(url) : null)
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
