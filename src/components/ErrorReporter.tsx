"use client"

import { useEffect, useState } from "react"

export default function ErrorReporter() {
  const [showOverlay, setShowOverlay] = useState(false)

  useEffect(() => {
    const showRefreshOverlay = () => setShowOverlay(true)
    const handler = (event: ErrorEvent) => {
      const payload = { type: "error", message: String(event.message), source: event.filename, lineno: event.lineno, colno: event.colno, stack: event.error?.stack }
      fetch("/api/log/error", { method: "POST", body: JSON.stringify(payload) }).catch(() => {})
      const isResourceError = event.target && (event.target as any).tagName && (event.target as any).tagName !== "SCRIPT"
      if (!isResourceError) showRefreshOverlay()
      return false
    }
    const rej = (event: PromiseRejectionEvent) => {
      const payload = { type: "unhandledrejection", reason: String(event.reason), stack: event.reason?.stack }
      fetch("/api/log/error", { method: "POST", body: JSON.stringify(payload) }).catch(() => {})
      const reason = String(event.reason || "").toLowerCase()
      const isNetworkOrApi = /failed to fetch|networkerror|load failed|404|500|timeout|cors|connection refused/i.test(reason)
      if (!isNetworkOrApi) showRefreshOverlay()
    }
    window.addEventListener("error", handler)
    window.addEventListener("unhandledrejection", rej)
    return () => {
      window.removeEventListener("error", handler)
      window.removeEventListener("unhandledrejection", rej)
    }
  }, [])

  if (!showOverlay) return null

  const refresh = () => window.location.reload()
  const hardRefresh = () => {
    const url = window.location.pathname + (window.location.search || "") + (window.location.search ? "&" : "?") + "_r=" + Date.now()
    window.location.href = url
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="card max-w-md w-full p-8 text-center animate-fade">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-amber-400">Something went wrong</h2>
        <p className="mt-2 text-sm text-white/70">An error occurred. Try refreshing the page.</p>
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <button type="button" onClick={refresh} className="pill bg-primary px-6 py-3 font-semibold">
            Refresh
          </button>
          <button type="button" onClick={hardRefresh} className="pill bg-navy-700 border border-navy-600 px-6 py-3 font-semibold">
            Hard refresh
          </button>
          <a href="/intro" className="pill bg-white/10 px-6 py-3 font-semibold no-underline">
            Go to home
          </a>
        </div>
      </div>
    </div>
  )
}
