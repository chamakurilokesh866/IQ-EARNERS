"use client"

import { useEffect, useState, useRef } from "react"
import { usePathname } from "next/navigation"
import TransitionLink from "./TransitionLink"
import { CoinIcon, UserIcon, GiftIcon } from "./AnimatedIcons"

const TOUR_STORAGE = "dashboard_tour_done"
const HIDDEN_PATHS = ["/intro", "/create-username", "/payment/callback", "/payment/unblock-callback", "/blocked", "/maintenance", "/more/admin-dashboard", "/more/admin-login"]

type ProgressData = {
  percentage: number
  paidCount: number
  usernameCount: number
  activeType: "payments" | "usernames"
}

export default function ProgressBarSide() {
  const [data, setData] = useState<ProgressData>({ percentage: 0, paidCount: 0, usernameCount: 0, activeType: "payments" })
  const [mounted, setMounted] = useState(false)
  const [prevPct, setPrevPct] = useState(0)
  const [showBurst, setShowBurst] = useState(false)
  const pathname = usePathname()

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

  // Detect when percentage increases → trigger burst animation
  useEffect(() => {
    if (data.percentage > prevPct && prevPct > 0) {
      setShowBurst(true)
      const t = setTimeout(() => setShowBurst(false), 1200)
      return () => clearTimeout(t)
    }
    setPrevPct(data.percentage)
  }, [data.percentage, prevPct])

  if (!mounted) return null
  if (data.percentage >= 100) return null
  if (HIDDEN_PATHS.some((p) => pathname?.startsWith(p))) return null

  const activeLabel = data.activeType === "payments" ? "Payments" : "Users"
  const activeCount = data.activeType === "payments" ? data.paidCount : data.usernameCount
  const activeIcon = data.activeType === "payments" ? <CoinIcon size={12} className="text-primary" /> : <UserIcon size={12} className="text-primary" />

  return (
    <>
      {/* Desktop: Side progress bar */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-30 hidden lg:flex flex-col items-center gap-4">
        <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-navy-800/95 backdrop-blur-xl border border-navy-600/80 shadow-2xl shadow-black/40 relative overflow-hidden holo-corner-glow">
          {/* Scan line inside */}
          <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" style={{ animation: "holoScanLine 5s ease-in-out infinite" }} />

          <span className="text-[10px] uppercase tracking-widest text-navy-400 font-semibold">Quiz Launch</span>

          {/* Active type indicator */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
            <span className="text-[10px]">{activeIcon}</span>
            <span className="text-[9px] font-semibold text-primary/80 tabular-nums">{activeCount} {activeLabel}</span>
          </div>

          {/* Vertical progress bar with glow */}
          <div className="relative w-5 h-36 rounded-full bg-navy-700 overflow-hidden border border-navy-600/60">
            {/* Grid lines */}
            {[20, 40, 60, 80].map((mark) => (
              <div key={mark} className="absolute left-0 right-0 h-px bg-white/5" style={{ bottom: `${mark}%` }} />
            ))}

            {/* Fill with gradient glow */}
            <div
              className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-1000 ease-out"
              style={{
                height: `${Math.min(100, data.percentage)}%`,
                background: "linear-gradient(to top, #7c3aed, #38bdf8, #34d399)",
                boxShadow: "0 0 12px rgba(124,58,237,0.5), 0 -4px 20px rgba(56,189,248,0.3), inset 0 0 8px rgba(255,255,255,0.1)"
              }}
            />

            {/* Animated top bubble */}
            {data.percentage > 0 && data.percentage < 100 && (
              <div
                className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white/90 shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                style={{
                  bottom: `calc(${data.percentage}% - 6px)`,
                  animation: "intro3dFloat 2s ease-in-out infinite",
                  transition: "bottom 1s ease-out"
                }}
              />
            )}

            {/* Shine overlay */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-transparent via-white/5 to-transparent pointer-events-none" />

            {/* Burst effect when percentage increases */}
            {showBurst && (
              <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: `calc(${data.percentage}% - 4px)` }}>
                <div className="w-2 h-2 rounded-full bg-white celebration-burst" />
                <div className="absolute inset-0 rounded-full" style={{ border: "1px solid rgba(56,189,248,0.6)", animation: "vortexPulseRing 0.8s ease-out both" }} />
              </div>
            )}
          </div>

          {/* Percentage with glow animation */}
          <div className="relative">
            <span
              className="text-xl font-bold num-display tabular-nums"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #38bdf8, #34d399)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: showBurst ? "drop-shadow(0 0 8px rgba(56,189,248,0.5))" : "none",
                transition: "filter 0.3s"
              }}
            >
              {data.percentage}%
            </span>
          </div>
        </div>

        <TransitionLink
          href="/user?tab=Referrals"
          className="flex flex-col items-center gap-1 p-2 rounded-xl bg-accent/20 hover:bg-accent/30 border border-accent/50 text-accent transition-all hover:scale-105 active:scale-95"
        >
          <GiftIcon size={18} className="text-accent" />
          <span className="text-[10px] font-semibold whitespace-nowrap">Refer & Earn</span>
        </TransitionLink>
      </div>

      {/* Mobile: Top horizontal progress bar */}
      <div className="fixed top-20 left-4 right-4 z-30 flex lg:hidden items-center gap-2 p-3 rounded-xl bg-navy-800/95 backdrop-blur-xl border border-navy-600/80 relative overflow-hidden">
        {/* Mobile scan line */}
        <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" style={{ animation: "holoScanLine 5s ease-in-out infinite" }} />

        {/* Active type badge */}
        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/10 border border-primary/15 shrink-0">
          <span className="text-[9px]">{activeIcon}</span>
          <span className="text-[8px] font-semibold text-primary/70 tabular-nums">{activeCount}</span>
        </div>

        {/* Progress bar */}
        <div className="flex-1 h-2.5 rounded-full bg-navy-700 overflow-hidden relative border border-navy-600/40">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out relative"
            style={{
              width: `${Math.min(100, data.percentage)}%`,
              background: "linear-gradient(90deg, #7c3aed, #38bdf8, #34d399)",
              boxShadow: "0 0 8px rgba(124,58,237,0.4)"
            }}
          >
            {/* Animated shine */}
            <div className="absolute inset-0 overflow-hidden rounded-full">
              <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)", animation: "celebrationGoldShine 2s linear infinite" }} />
            </div>
          </div>
        </div>

        <span
          className="text-sm font-bold num-display w-10 text-right tabular-nums"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #38bdf8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}
        >
          {data.percentage}%
        </span>
        <TransitionLink href="/user?tab=Referrals" className="pill bg-accent/20 text-accent text-xs shrink-0">Refer</TransitionLink>
      </div>
    </>
  )
}

/** Inline quiz launch progress bar. Pass showWhenComplete so home page still shows bar at 100%. */
export function QuizLaunchProgressBar({ showWhenComplete = false }: { showWhenComplete?: boolean } = {}) {
  const [data, setData] = useState<ProgressData>({ percentage: 0, paidCount: 0, usernameCount: 0, activeType: "payments" })
  const [mounted, setMounted] = useState(false)
  const prevRef = useRef(0)
  const [animating, setAnimating] = useState(false)
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
  if (!mounted) return null
  if (data.percentage >= 100 && !showWhenComplete) return null

  if (data.percentage >= 100 && showWhenComplete) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-4 relative overflow-hidden sm:p-6">
        <div className="absolute inset-0 holo-grid-bg opacity-10 pointer-events-none" />
        <span className="text-xs uppercase tracking-widest text-emerald-400/90 font-semibold">Quiz Launch Progress</span>
        <div className="text-2xl font-black text-emerald-300 tabular-nums">100%</div>
        <p className="text-sm text-emerald-200/80 text-center font-medium">
          Launch target reached — daily quiz is live for paid members.
        </p>
        <p className="text-[11px] text-white/45 text-center">
          {data.paidCount} entry payments recorded · thank you for growing the community
        </p>
      </div>
    )
  }

  const activeLabel = data.activeType === "payments" ? "Payments" : "Usernames"
  const activeCount = data.activeType === "payments" ? data.paidCount : data.usernameCount
  const activeIcon = data.activeType === "payments" ? <CoinIcon size={14} className="text-primary" /> : <UserIcon size={14} className="text-primary" />

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-navy-600/60 bg-navy-800/80 p-4 relative overflow-hidden sm:gap-4 sm:p-6">
      {/* Background effects */}
      <div className="absolute inset-0 holo-grid-bg opacity-10 pointer-events-none" />
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" style={{ animation: "holoScanLine 6s ease-in-out infinite" }} />

      <span className="px-2 text-center text-[11px] font-semibold uppercase tracking-widest text-navy-400 sm:text-xs">Quiz Launch Progress</span>

      {/* Active type badge — wrap on narrow screens so nothing clips */}
      <div className="flex max-w-full min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-1">
        <span className="shrink-0 text-sm">{activeIcon}</span>
        <span className="min-w-0 text-center text-[11px] font-semibold tabular-nums text-primary/80 sm:text-xs">
          {activeCount} {activeLabel}
        </span>
        <span className="text-center text-[9px] text-white/40 sm:text-[10px]">driving progress</span>
      </div>

      {/* Progress bar with premium styling */}
      <div className="w-full max-w-xs h-5 rounded-full bg-navy-700 overflow-hidden relative border border-navy-600/50">
        {/* Tick marks */}
        {[25, 50, 75].map((mark) => (
          <div key={mark} className="absolute top-0 bottom-0 w-px bg-white/10" style={{ left: `${mark}%` }} />
        ))}

        <div
          className="h-full rounded-full transition-all duration-1000 ease-out relative"
          style={{
            width: `${Math.min(100, data.percentage)}%`,
            background: "linear-gradient(90deg, #7c3aed, #38bdf8, #34d399, #38bdf8)",
            backgroundSize: "200% 100%",
            animation: "holoBtnShimmer 4s linear infinite",
            boxShadow: animating
              ? "0 0 20px rgba(124,58,237,0.6), 0 0 40px rgba(56,189,248,0.3)"
              : "0 0 10px rgba(124,58,237,0.3)"
          }}
        >
          {/* Shine sweep */}
          <div className="absolute inset-0 overflow-hidden rounded-full">
            <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)", animation: "celebrationGoldShine 3s linear infinite" }} />
          </div>
        </div>

        {/* Burst on increase */}
        {animating && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 -translate-x-1" style={{ left: `${data.percentage}%` }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="absolute w-2 h-2 rounded-full bg-cyan-400" style={{ animation: `dnaParticleExplode 0.8s ease-out ${i * 0.1}s both`, ['--dx' as string]: `${(i - 1) * 15}px`, ['--dy' as string]: `${(i - 1) * -12}px` }} />
            ))}
          </div>
        )}
      </div>

      {/* Percentage display */}
      <span
        className="text-3xl font-bold num-display tabular-nums"
        style={{
          background: "linear-gradient(135deg, #7c3aed, #38bdf8, #34d399)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          filter: animating ? "drop-shadow(0 0 12px rgba(56,189,248,0.5))" : "none",
          transition: "filter 0.3s"
        }}
      >
        {data.percentage}%
      </span>

      <p className="px-2 text-center text-xs text-white/60 sm:text-sm">More referrals = sooner the quiz unlocks. Share your link!</p>
      <a
        href="/user?tab=Referrals"
        className="pill mx-auto flex w-full max-w-xs items-center justify-center gap-2 border border-accent/50 bg-accent/20 px-4 py-2 text-center text-sm font-semibold text-accent hover:bg-accent/30 sm:w-auto"
      >
        <GiftIcon size={14} className="shrink-0" /> Refer & Earn
      </a>
    </div>
  )
}

export function useDashboardTour() {
  const [showTour, setShowTour] = useState(false)
  useEffect(() => {
    try {
      if (typeof window === "undefined") return
      const done = localStorage.getItem(TOUR_STORAGE)
      if (!done) setShowTour(true)
    } catch { }
  }, [])
  const skip = () => {
    try { localStorage.setItem(TOUR_STORAGE, "1") } catch { }
    setShowTour(false)
  }
  return { showTour, skip }
}
