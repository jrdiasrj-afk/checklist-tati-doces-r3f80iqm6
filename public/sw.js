//
// Service Worker do Tati Check — app shell em cache + fallback offline.
// Estratégia:
//   - Navegações (HTML): rede primeiro, cai para o app shell/offline sem rede.
//   - Assets estáticos (_app/, ícones, manifest): stale-while-revalidate.
//   - API do PocketBase: sempre rede (dados de checklist nunca vêm de cache).
//
const CACHE_NAME = 'tati-check-v2'
const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {})))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Nunca interceptar a API do backend — dados sempre frescos.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/backend/')) return

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone()
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put('/index.html', copy))
            .catch(() => {})
          return res
        })
        .catch(() => caches.match('/index.html').then((c) => c || caches.match('/offline.html'))),
    )
    return
  }

  // Stale-while-revalidate para assets do próprio app.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const network = fetch(event.request)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(event.request, copy))
                .catch(() => {})
            }
            return res
          })
          .catch(() => cached)
        return cached || network
      }),
    )
  }
})
