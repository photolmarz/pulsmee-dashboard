const CACHE = 'pulsmee-v1'
const SHELL = ['/p/', '/_next/static/']

self.addEventListener('install', e => {
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim())
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  // Cache les pages /p/ pour accès hors ligne
  if (url.pathname.startsWith('/p/')) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          const clone = response.clone()
          caches.open(CACHE).then(cache => cache.put(e.request, clone))
          return response
        })
        .catch(() => caches.match(e.request))
    )
    return
  }

  // Cache les assets statiques Next.js
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        return cached || fetch(e.request).then(response => {
          caches.open(CACHE).then(cache => cache.put(e.request, response.clone()))
          return response
        })
      })
    )
    return
  }
})
