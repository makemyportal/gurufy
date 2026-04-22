const CACHE_NAME = 'ldms-cache-v1'
const STATIC_ASSETS = [
  '/',
  '/logo.png',
  '/manifest.json'
]

// Install: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

// Fetch: network-first for navigation, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip external API calls (AI, Firebase, etc.)
  if (request.url.includes('googleapis.com') ||
      request.url.includes('firestore') ||
      request.url.includes('groq.com') ||
      request.url.includes('openrouter.ai') ||
      request.url.includes('sarvam.ai') ||
      request.url.includes('cloudinary.com')) {
    return
  }

  // For navigation requests (HTML pages): network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    )
    return
  }

  // For static assets: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        // Cache new static assets
        if (response.ok && (request.url.includes('/assets/') || request.url.endsWith('.js') || request.url.endsWith('.css') || request.url.endsWith('.png') || request.url.endsWith('.woff2'))) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      }).catch(() => {
        // Offline fallback
        return new Response('Offline', { status: 503, statusText: 'Offline' })
      })
    })
  )
})
