const CACHE_NAME = "iq-earners-v3"
const APP_SHELL = [
  "/",
  "/more/admin-login",
  "/more/admin-dashboard",
  "/favicon.ico",
  "/icon.svg"
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))).catch(() => {})
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return
  const url = new URL(request.url)
  const isAPI = url.pathname.startsWith("/api/")
  const cacheFirstPaths = ["/", "/daily-quiz", "/leaderboard", "/prizes"]
  const isShell = cacheFirstPaths.includes(url.pathname)
  const isAdminShell = url.pathname === "/more/admin-dashboard" || url.pathname === "/more/admin-login"
  const isAdminApi = url.pathname.startsWith("/api/admin/") || url.pathname.startsWith("/api/stats")
  if (isAPI && (url.pathname.startsWith("/api/quizzes") || url.pathname.startsWith("/api/prizes"))) {
    event.respondWith(
      fetch(request).then(async (res) => {
        const copy = res.clone()
        const cache = await caches.open(CACHE_NAME)
        await cache.put(request, copy)
        return res
      }).catch(async () => {
        const cache = await caches.open(CACHE_NAME)
        const hit = await cache.match(request)
        return hit || new Response(JSON.stringify({ ok: true, data: [] }), { headers: { "Content-Type": "application/json" } })
      })
    )
    return
  }
  if (isAPI && isAdminApi) {
    event.respondWith(
      fetch(request)
        .then(async (res) => {
          if (res.ok) {
            const copy = res.clone()
            const cache = await caches.open(CACHE_NAME)
            await cache.put(request, copy)
          }
          return res
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME)
          const hit = await cache.match(request)
          return (
            hit ||
            new Response(JSON.stringify({ ok: false, offline: true, data: null }), {
              headers: { "Content-Type": "application/json" },
            })
          )
        })
    )
    return
  }
  // Network-first for app HTML so new deploys show up; cache only as offline fallback.
  if (isShell || isAdminShell) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {})
          }
          return res
        })
        .catch(() =>
          caches
            .match(request)
            .then((hit) => hit || (isAdminShell ? caches.match("/more/admin-dashboard") : caches.match("/")))
            .catch(() => fetch(request))
        )
    )
    return
  }
})

self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data?.json() ?? {}
  } catch {}
  const title = data.title || "Quiz Available"
  const body = data.body || "Your quiz is ready"
  const url = data.url || "/daily-quiz"
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/favicon.ico",
      data: { url }
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification?.data?.url || "/daily-quiz"
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientsArr) => {
      for (const c of clientsArr) {
        if ("focus" in c) return c.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
