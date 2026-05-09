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

const SETTLING_MS = 10
const MAX_WAIT_MS = 2000
const SLOW_NAV_MS = 1000 // Show slow warning after 1s

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

  return <div className="fixed inset-0 z-[250] flex items-center justify-center bg-[#020205]/95 backdrop-blur-2xl overflow-hidden portal-wipe-in">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 blur-[150px] animate-pulse" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent animate-[nebula-scan_2s_linear_infinite]" />
      </div>

      {/* Warp Elements */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden pointer-events-none opacity-20">
        <div className="h-0.5 w-[300vw] bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-[moneyFlow_1.5s_infinite_linear]" style={{ transform: 'translateX(-50%)' }} />
        <div className="h-0.5 w-[300vw] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent animate-[moneyFlow_2s_infinite_linear] mt-2" style={{ transform: 'translateX(-50%)' }} />
      </div>

      <div className="relative flex flex-col items-center gap-12 redirect-content-enter scale-90 sm:scale-100">
        {/* Core Icon Assembly */}
        <div className="relative flex items-center justify-center gap-6">
           <div className="w-20 h-20 rounded-[2rem] bg-white/5 border border-white/10 flex flex-col items-center justify-center p-2 backdrop-blur-xl relative group">
              <div className="text-[8px] font-black uppercase text-white/30 tracking-widest leading-none mb-1">Departure</div>
              <div className="text-white font-black text-xs uppercase truncate max-w-full italic">{fromLabel}</div>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-primary rounded-full group-hover:w-8 transition-all" />
           </div>

           <div className="flex flex-col items-center gap-1">
              <div className="w-16 h-px bg-gradient-to-r from-primary to-cyan-400 relative overflow-hidden">
                 <div className="absolute inset-0 bg-white translate-x-[-100%] animate-[moneyFlow_1s_infinite_linear]" />
              </div>
              <span className="text-[10px] font-black text-primary animate-pulse tracking-widest uppercase">Warping</span>
           </div>

           <div className="w-24 h-24 rounded-[2.5rem] bg-primary/20 border border-primary/40 flex flex-col items-center justify-center p-2 backdrop-blur-xl relative shadow-[0_0_50px_rgba(139,92,246,0.3)] animate-pulse">
              <div className="text-[8px] font-black uppercase text-primary tracking-widest leading-none mb-1">Arrival</div>
              <div className="text-white font-black text-sm uppercase truncate max-w-full italic tracking-tighter">{toLabel}</div>
           </div>
        </div>

        {/* Status Copy */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-3">
             <span className="w-1 h-1 rounded-full bg-cyan-400 animate-ping" />
             <span className="text-[10px] font-black uppercase tracking-[0.6em] text-white/50">
                {isSlow ? "Adapting Synchronisation" : "Reconfiguring Terminal"}
             </span>
             <span className="w-1 h-1 rounded-full bg-primary animate-ping" style={{ animationDelay: '0.2s' }} />
          </div>
          
          <div className="w-64 h-[2px] bg-white/5 rounded-full overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-cyan-400 to-primary w-full animate-[moneyFlow_1.5s_infinite_linear]" />
          </div>

          {isSlow && (
            <div className="text-[9px] font-bold text-amber-400/60 uppercase tracking-[0.2em] animate-pulse">
              Temporal instability detected — resolving data stream
            </div>
          )}
        </div>

        {/* Iconic Logo Glow */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-[-10px] bg-primary/20 blur-xl rounded-full animate-pulse" />
          <div className="relative w-full h-full rounded-2xl overflow-hidden border border-white/20 p-1 bg-black/50 backdrop-blur-xl">
             <Image src={logoPng} alt="IQ" width={64} height={64} className="w-full h-full object-cover rounded-xl opacity-80" />
          </div>
        </div>
      </div>

      {/* Cyberpunk Grid */}
      <div className="absolute inset-0 h-full w-full pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
    </div>
}
