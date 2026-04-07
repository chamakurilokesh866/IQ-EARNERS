"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { useUI } from "../context/UIContext"
import logoPng from "../app/prizes/icon.png"

const PAGE_LABELS: Record<string, string> = {
  "/": "Home",
  "/home": "Home",
  "/daily-quiz": "Daily Quiz",
  "/intro": "Intro",
  "/leaderboard": "Leaderboard",
  "/tournaments": "Tournaments",
  "/prizes": "Prizes",
  "/more": "More",
  "/more/join": "Redirecting",
  "/user": "User",
  "/more/dashboard": "Dashboard",
  "/more/admin-dashboard": "Admin"
}

function getPageLabel(path: string): string {
  return PAGE_LABELS[path] ?? path.split("/").filter(Boolean).pop() ?? "Page"
}

const SETTLING_MS = 30
const MAX_WAIT_MS = 2500
const SLOW_NAV_MS = 1200 // Show slow warning after 1.2s

export default function TransitionLoader() {
  const pathname = usePathname()
  const { loading, setLoading, transition, setTransition } = useUI()
  const [isSlow, setIsSlow] = useState(false)
  const show = loading || transition !== null
  const fromLabel = transition?.from ?? getPageLabel(pathname)
  const toLabel = transition?.to ?? "Loading…"
  const startPathRef = useRef<string>("")

  useEffect(() => {
    const handleLogout = () => {
      setLoading(true)
      setTransition(getPageLabel(pathname), "Intro")
    }

    if (typeof window !== "undefined") {
      window.addEventListener('transitionLogout', handleLogout)
      return () => window.removeEventListener('transitionLogout', handleLogout)
    }
  }, [pathname, setLoading, setTransition])

  useEffect(() => {
    if (show) {
      if (startPathRef.current === "") startPathRef.current = pathname
    } else {
      startPathRef.current = ""
    }
  }, [show, pathname])

  useEffect(() => {
    if (!show) {
      setIsSlow(false)
      return
    }
    const clear = () => {
      setLoading(false)
      setTransition(null, null)
      startPathRef.current = ""
      setIsSlow(false)
    }
    const hasNavigated = pathname !== startPathRef.current
    const delay = hasNavigated ? SETTLING_MS : MAX_WAIT_MS
    const t = setTimeout(clear, delay)
    const sT = setTimeout(() => setIsSlow(true), SLOW_NAV_MS)
    return () => {
      clearTimeout(t)
      clearTimeout(sT)
    }
  }, [pathname, show, setLoading, setTransition])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black/95 backdrop-blur-xl overflow-hidden portal-wipe-in">
      {/* Animated background grid */}
      <div className="absolute inset-0 holo-grid-bg opacity-30" />

      {/* Floating portal orbs */}
      <div className="absolute top-1/4 left-1/4 w-40 h-40 rounded-full bg-primary/10 blur-3xl redirect-orb-float" style={{ animationDelay: "0s" }} />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-purple-500/10 blur-3xl redirect-orb-float" style={{ animationDelay: "0.5s" }} />
      <div className="absolute top-1/2 right-1/3 w-28 h-28 rounded-full bg-cyan-400/8 blur-2xl redirect-orb-float" style={{ animationDelay: "1s" }} />

      {/* Spinning outer ring */}
      <div className="absolute w-[200px] h-[200px] rounded-full border border-primary/20 portal-spin-ring" />
      <div className="absolute w-[240px] h-[240px] rounded-full border border-primary/10 portal-spin-ring" style={{ animationDirection: "reverse", animationDuration: "5s" }} />

      {/* Portal ring expansion */}
      <div className="absolute w-16 h-16 rounded-full border-2 border-primary/40 portal-ring-expand" />
      <div className="absolute w-16 h-16 rounded-full border-2 border-cyan-400/30 portal-ring-expand" style={{ animationDelay: "0.3s" }} />

      {/* Particle burst */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {[...Array(8)].map((_, i) => (
          <span key={i} className="portal-particle" />
        ))}
      </div>

      {/* Orbiting dots */}
      <div className="absolute w-2 h-2 rounded-full bg-primary portal-dot-orbit" />
      <div className="absolute w-1.5 h-1.5 rounded-full bg-cyan-400 portal-dot-orbit" style={{ animationDelay: "0.5s", animationDuration: "2s" }} />
      <div className="absolute w-1 h-1 rounded-full bg-purple-400 portal-dot-orbit" style={{ animationDelay: "1s", animationDuration: "2.5s" }} />

      <div className="relative flex flex-col items-center gap-6 redirect-content-enter">
        {/* From / To cards with portal glow */}
        <div className="flex items-center gap-4">
          <div className="portal-label-slide rounded-xl bg-white/5 border border-white/10 px-5 py-3 min-w-[120px] text-center backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent" />
            <div className="relative">
              <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-medium">From</div>
              <div className="mt-1 font-bold text-white text-sm">{fromLabel}</div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            {/* Animated arrow with data stream effect */}
            <div className="relative w-12 overflow-hidden">
              <div className="absolute inset-0 rounded-full vortex-energy-beam opacity-40" style={{ height: "2px", top: "50%", marginTop: "-1px" }} />
              <span className="relative text-2xl text-primary font-bold redirect-arrow-pulse block text-center" aria-hidden>→</span>
            </div>
            <span className="text-[9px] text-white/30 uppercase tracking-widest font-medium">warp</span>
          </div>

          <div className="portal-label-slide rounded-xl bg-primary/10 border border-primary/30 px-5 py-3 min-w-[120px] text-center backdrop-blur-sm relative overflow-hidden portal-glow-pulse" style={{ animationDelay: "0.15s" }}>
            <div className="absolute inset-0 bg-gradient-to-l from-primary/10 to-transparent" />
            <div className="relative">
              <div className="text-[10px] text-primary/70 uppercase tracking-[0.2em] font-medium">To</div>
              <div className="mt-1 font-bold text-primary text-sm">{toLabel}</div>
            </div>
          </div>
        </div>

        {/* Status text with typewriter dots */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-white/50 uppercase tracking-widest">
              {toLabel === "Intro" ? "Logging Out" : isSlow ? "Waiting for Data" : "Warping"}
            </span>
            <span className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className={`w-2 h-2 rounded-full redirect-dot-bounce ${isSlow ? 'bg-amber-400' : 'bg-primary/80'}`} style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </span>
          </div>
          {isSlow && (
            <div className="text-[10px] text-amber-400/60 font-bold uppercase tracking-widest animate-pulse">
              Poor Network Detected
            </div>
          )}
        </div>

        {/* Glowing progress bar */}
        <div className="w-56 h-2 rounded-full bg-white/5 overflow-hidden border border-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-primary via-cyan-400 to-primary portal-progress-glow" />
        </div>

        {/* Logo with glow */}
        <div className="rounded-full p-2.5 bg-white/5 border border-white/10 redirect-logo-enter relative">
          <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl" />
          <Image src={logoPng} alt="IQ Earners" className="h-12 w-12 rounded-full object-contain relative z-10" />
        </div>
      </div>

      {/* Data stream columns (cyberpunk effect) */}
      <div className="absolute left-[10%] top-0 bottom-0 w-px overflow-hidden opacity-20">
        <div className="w-full h-8 bg-gradient-to-b from-transparent via-primary to-transparent portal-data-stream" />
      </div>
      <div className="absolute left-[90%] top-0 bottom-0 w-px overflow-hidden opacity-15">
        <div className="w-full h-12 bg-gradient-to-b from-transparent via-cyan-400 to-transparent portal-data-stream" style={{ animationDelay: "0.6s" }} />
      </div>
      <div className="absolute left-[30%] top-0 bottom-0 w-px overflow-hidden opacity-10">
        <div className="w-full h-6 bg-gradient-to-b from-transparent via-purple-400 to-transparent portal-data-stream" style={{ animationDelay: "0.3s" }} />
      </div>
      <div className="absolute left-[70%] top-0 bottom-0 w-px overflow-hidden opacity-10">
        <div className="w-full h-10 bg-gradient-to-b from-transparent via-primary to-transparent portal-data-stream" style={{ animationDelay: "0.9s" }} />
      </div>
    </div>
  )
}
