"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import logoPng from "../app/prizes/icon.png"

const MAX_SHOW_MS = 6000
const MIN_VISIBLE_MS = 300
const SKIP_SHOW_MS = 2500
const SLOW_CONN_MS = 2000

export default function Preloader() {
  const [show, setShow] = useState(() => {
    // SSR check: only run on client
    if (typeof window === "undefined") return true
    // Skip for signed-in users (hs=1 or hs=2)
    if (document.cookie.includes("hs=1") || document.cookie.includes("hs=2")) return false
    return true
  })
  const [showSkip, setShowSkip] = useState(false)
  const [isSlow, setIsSlow] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    let cancelled = false
    let finished = false
    const started = typeof performance !== "undefined" ? performance.now() : Date.now()

    const skipT = window.setTimeout(() => setShowSkip(true), SKIP_SHOW_MS)
    const slowT = window.setTimeout(() => setIsSlow(true), SLOW_CONN_MS)
    const maxT = window.setTimeout(() => finish(), MAX_SHOW_MS)

    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
    if (conn && (conn.saveData || (conn.effectiveType && ["slow-2g", "2g", "3g"].includes(conn.effectiveType)))) {
      setIsSlow(true)
    }

    function finish() {
      if (cancelled || finished) return
      finished = true
      window.clearTimeout(maxT)
      const now = typeof performance !== "undefined" ? performance.now() : Date.now()
      const elapsed = now - started
      const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed)
      window.setTimeout(() => {
        if (cancelled) return
        setExiting(true)
        window.setTimeout(() => {
          if (!cancelled) setShow(false)
        }, 800)
      }, remaining)
    }

    if (document.readyState === "complete") {
      finish()
    } else {
      window.addEventListener("load", finish, { once: true })
    }

    return () => {
      cancelled = true
      window.clearTimeout(skipT)
      window.clearTimeout(slowT)
      window.clearTimeout(maxT)
      window.removeEventListener("load", finish)
    }
  }, [])

  useEffect(() => {
    if (!show) return
    const prevBody = document.body.style.overflow
    const prevHtml = document.documentElement.style.overflow
    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prevBody
      document.documentElement.style.overflow = prevHtml
    }
  }, [show])

  if (!show) return null

  return (
    <div
      id="app-preloader"
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-[#020205] transition-all duration-700 ease-in-out ${exiting ? "opacity-0 scale-[1.1] pointer-events-none" : "opacity-100"}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Initializing IQ Arena"
    >
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 blur-[120px] animate-pulse" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>

      <div className="relative flex flex-col items-center">
        {/* Core Logo Assembly */}
        <div className="relative w-32 h-32 mb-12">
          {/* Rotating Rings */}
          <div className="absolute inset-[-12px] border border-primary/20 rounded-full animate-[spin_4s_linear_infinite]" />
          <div className="absolute inset-[-20px] border border-cyan-400/10 rounded-full animate-[spin_6s_linear_infinite_reverse]" />
          
          {/* Logo Container */}
          <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden bg-black/50 backdrop-blur-xl border border-white/10 p-1 shadow-[0_0_50px_rgba(139,92,246,0.3)]">
            <Image
              src={logoPng}
              alt="Logo"
              width={128}
              height={128}
              className="w-full h-full object-cover rounded-[2.4rem] animate-pulse"
              priority
            />
            {/* Scanning Beam */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent h-1/2 w-full animate-[nebula-scan_2s_linear_infinite] pointer-events-none" />
          </div>
        </div>

        {/* Status Text & Progress */}
        <div className="flex flex-col items-center gap-4">
          <div className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
            {isSlow ? "Optimizing Transmission" : "Initializing Arena"}
            <span className="w-1 h-1 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.2s' }} />
          </div>
          
          <div className="w-48 h-[2px] bg-white/5 rounded-full overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-cyan-400 to-primary w-full animate-[moneyFlow_1.5s_infinite_linear]" />
          </div>

          {isSlow && (
            <div className="text-[9px] font-bold text-amber-400/60 uppercase tracking-widest animate-pulse">
              Slow network detected — adapting session
            </div>
          )}
        </div>

        {showSkip && !exiting && (
          <button
            onClick={() => setExiting(true)}
            className="mt-12 px-8 py-3 rounded-xl border border-white/10 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 hover:text-white hover:border-primary/50 transition-all active:scale-95"
          >
            Terminal Override
          </button>
        )}
      </div>

      {/* Cyberpunk Grid Lines */}
      <div className="absolute inset-0 h-full w-full pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
    </div>
  )
}
