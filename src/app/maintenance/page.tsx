"use client"

import { useEffect, useState } from "react"

export default function MaintenancePage() {
  const [status, setStatus] = useState<{ message?: string; until?: number } | null>(null)
  const [timeLeft, setTimeLeft] = useState<string>("")

  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch("/api/maintenance?t=" + Date.now(), { cache: "no-store" })
        const j = await r.json()
        if (!j?.maintenance) {
          window.location.replace("/intro")
          return
        }
        setStatus({ message: j.message, until: j.until })
      } catch {
        setStatus({})
      }
    }
    check()
    const t = setInterval(check, 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!status?.until || status.until <= Date.now()) {
      setTimeLeft("")
      return
    }
    const update = () => {
      const diff = Math.max(0, status!.until! - Date.now())
      if (diff <= 0) {
        setTimeLeft("Any moment now…")
        return
      }
      const m = Math.floor(diff / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(m > 0 ? `~${m} min` : `~${s}s`)
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [status?.until])

  useEffect(() => {
    const preventContextMenu = (e: MouseEvent) => e.preventDefault()
    const preventNav = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest("a") || target.closest("[role='link']")) e.preventDefault()
    }
    document.addEventListener("contextmenu", preventContextMenu)
    document.addEventListener("click", preventNav, true)
    return () => {
      document.removeEventListener("contextmenu", preventContextMenu)
      document.removeEventListener("click", preventNav, true)
    }
  }, [])

  const displayMessage = status?.message?.trim() || "We're making some improvements. Please check back shortly."
  const showTime = timeLeft && status?.until && status.until > Date.now()

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 text-white app-page-surface"
      style={{ userSelect: "none" }}
    >
      <div className="text-6xl mb-6">🔧</div>
      <h1 className="text-2xl font-bold text-center mb-4">Website Under Maintenance</h1>
      <p className="text-navy-400 text-center max-w-md mb-4">
        {displayMessage}
      </p>
      {showTime && (
        <p className="text-primary text-center font-semibold mb-4">
          Estimated time remaining: {timeLeft}
        </p>
      )}
      <p className="text-xs text-navy-500 text-center max-w-sm">
        The page will automatically refresh when we&apos;re back. No data will be lost.
      </p>
    </div>
  )
}
