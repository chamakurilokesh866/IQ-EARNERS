"use client"

import { useEffect, useState, useRef } from "react"
import TransitionLink from "./TransitionLink"

type ProgressData = {
  percentage: number
  paidCount: number
  usernameCount: number
  activeType: "payments" | "usernames"
}

export default function ProgressBarHorizontal({ percentage: initialPct, hideWhenComplete = true }: { percentage: number; hideWhenComplete?: boolean }) {
  const [data, setData] = useState<ProgressData>({ percentage: initialPct, paidCount: 0, usernameCount: 0, activeType: "payments" })
  const [mounted, setMounted] = useState(false)
  const [animating, setAnimating] = useState(false)
  const prevRef = useRef(initialPct)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    let cancelled = false
    const load = () => {
      fetch("/api/progress", { cache: "no-store", credentials: "include", headers: { "Cache-Control": "no-cache", Pragma: "no-cache" } })
        .then((r) => r.json())
        .then((j) => {
          if (!cancelled && j && typeof (j.percentage ?? 0) === "number") {
            const pct = Math.min(100, Math.max(0, j.percentage))
            if (pct > prevRef.current && prevRef.current > 0) {
              setAnimating(true)
              setTimeout(() => setAnimating(false), 1200)
            }
            prevRef.current = pct
            setData({
              percentage: pct,
              paidCount: j.paidCount ?? 0,
              usernameCount: j.usernameCount ?? 0,
              activeType: j.activeType ?? "payments"
            })
          }
        })
        .catch(() => { })
    }
    load()
    const id = setInterval(load, 15000)
    return () => { cancelled = true; clearInterval(id) }
  }, [mounted])

  const { percentage: pct } = data
  if (hideWhenComplete && pct >= 100) return null

  const activeIcon = data.activeType === "payments" ? "💰" : "👤"
  const activeCount = data.activeType === "payments" ? data.paidCount : data.usernameCount
  const activeLabel = data.activeType === "payments" ? "Payments" : "Users"

  return (
    <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-navy-800/95 backdrop-blur-xl border border-navy-600/80 shadow-lg w-full relative overflow-hidden">
      {/* Scan line */}
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" style={{ animation: "holoScanLine 6s ease-in-out infinite" }} />

      <span className="text-[10px] sm:text-xs uppercase tracking-wider text-navy-400 font-semibold shrink-0 hidden sm:inline">Quiz Launch</span>

      {/* Active type badge */}
      <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/10 border border-primary/15 shrink-0">
        <span className="text-[9px]">{activeIcon}</span>
        <span className="text-[8px] font-semibold text-primary/70 tabular-nums">{activeCount} {activeLabel}</span>
      </div>

      {/* Progress bar */}
      <div className="flex-1 min-w-0 h-2.5 w-full rounded-full bg-navy-700 overflow-hidden relative border border-navy-600/40">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out relative"
          style={{
            width: `${Math.min(100, Math.max(0, pct))}%`,
            minWidth: pct > 0 ? "4px" : 0,
            background: "linear-gradient(90deg, #7c3aed, #38bdf8, #34d399)",
            boxShadow: animating
              ? "0 0 16px rgba(124,58,237,0.6), 0 0 30px rgba(56,189,248,0.3)"
              : "0 0 8px rgba(124,58,237,0.3)"
          }}
        >
          {/* Animated shine */}
          <div className="absolute inset-0 overflow-hidden rounded-full">
            <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)", animation: "celebrationGoldShine 2.5s linear infinite" }} />
          </div>
        </div>
      </div>

      <span
        className="text-sm sm:text-base font-bold num-display shrink-0 w-10 sm:w-12 text-right tabular-nums"
        style={{
          background: "linear-gradient(135deg, #7c3aed, #38bdf8, #34d399)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          filter: animating ? "drop-shadow(0 0 8px rgba(56,189,248,0.5))" : "none",
          transition: "filter 0.3s"
        }}
      >
        {pct}%
      </span>

      <TransitionLink
        href="/user?tab=Referrals"
        className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-accent/20 hover:bg-accent/30 border border-accent/50 text-accent text-xs sm:text-sm font-semibold transition-all hover:scale-105 active:scale-95 shrink-0"
      >
        <span>🎁</span>
        <span className="whitespace-nowrap">Refer & Earn</span>
      </TransitionLink>
    </div>
  )
}
