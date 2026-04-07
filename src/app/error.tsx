"use client"

import { useEffect } from "react"

function refresh() {
  if (typeof window !== "undefined") window.location.reload()
}

function hardRefresh() {
  if (typeof window !== "undefined") {
    const q = window.location.search || ""
    const url = window.location.pathname + (q ? q + "&" : "?") + "_r=" + Date.now()
    window.location.href = url
  }
}

function reportError(error: Error & { digest?: string }) {
  try {
    const body = { message: error.message, digest: error.digest, stack: error.stack?.slice(0, 500) }
    fetch("/api/log/error", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {})
  } catch {}
}

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const is404 = error.message?.includes("NEXT_NOT_FOUND") || (error as { status?: number }).status === 404

  useEffect(() => {
    if (process.env.NODE_ENV === "development") console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b1220] px-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-red-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1.5s" }} />

      <div className="card max-w-md w-full p-8 text-center relative z-10 bg-black/40 border-white/10 backdrop-blur-3xl shadow-2xl">
        <div className="text-6xl mb-4">{is404 ? "🔎" : "⚠️"}</div>
        <h1 className="text-3xl font-bold text-white mb-2">
          {is404 ? "Page not found" : "Something went wrong"}
        </h1>
        <p className="mt-2 text-sm text-white/50 mb-1">
          {is404
            ? "The page you're looking for doesn't exist or the link has expired."
            : "An unexpected error occurred. Try refreshing the page."}
        </p>
        {error.digest && (
          <p className="mt-1 text-xs text-white/30 font-mono">Ref: {error.digest}</p>
        )}

        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <button type="button" onClick={refresh} className="btn btn-primary">
            Refresh
          </button>
          <button type="button" onClick={hardRefresh} className="btn btn-secondary">
            Hard refresh
          </button>
          <button type="button" onClick={reset} className="btn btn-ghost">
            Try again
          </button>
          {/* Link to "/" (public, no token needed) so it always works */}
          <a href="/" className="btn btn-ghost">
            Go to Start
          </a>
          {!is404 && (
            <button type="button" onClick={() => reportError(error)} className="btn btn-ghost text-xs">
              Report error
            </button>
          )}
        </div>

        <p className="mt-6 text-xs text-white/30">
          Need help?{" "}
          <a href="/more/contact-us" className="underline hover:text-white/60 transition-colors">
            Contact support
          </a>
        </p>
      </div>
    </div>
  )
}
