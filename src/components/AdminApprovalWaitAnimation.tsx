"use client"

import { useEffect, useState } from "react"

type Props = {
  message?: string
  submessage?: string
  utr?: string
  paymentId?: string | null
  /** Tighter layout for small payment sheets */
  compact?: boolean
}

/**
 * Admin review queue — compact by default for mobile sheets; optional `compact` for extra-tight.
 */
export default function AdminApprovalWaitAnimation({
  message = "Waiting for review",
  submessage = "Proof received. A reviewer will verify it soon.",
  utr,
  paymentId,
  compact = false
}: Props) {
  const [dots, setDots] = useState("")

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."))
    }, 500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className={`relative flex flex-col items-center justify-center ${compact ? "py-2" : "py-6 sm:py-8"} overflow-hidden`}
    >
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent blur-2xl" aria-hidden />

      {/* Radar Scanning Animation */}
      <div className="relative mb-4 flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24">
        {/* Outer Rings */}
        <div className="absolute inset-0 rounded-full border border-amber-500/20 animate-[ping_3s_linear_infinite]" />
        <div className="absolute inset-2 rounded-full border border-amber-500/10 animate-[ping_3s_linear_infinite_1s]" />
        
        {/* Core Radar Circle */}
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-amber-400/30 bg-slate-900/60 shadow-[0_0_15px_rgba(245,158,11,0.2)] backdrop-blur-md sm:h-16 sm:w-16">
          {/* Scanning Sweep */}
          <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(245,158,11,0.4)_360deg)] animate-[spin_2s_linear_infinite]" />
          
          {/* Central Icon */}
          <div className="relative z-10 flex items-center justify-center">
            <svg
              className="h-6 w-6 text-amber-400 sm:h-7 sm:w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
        </div>

        {/* Small Floating Status Indicators */}
        <div className="absolute -right-1 -top-1 animate-bounce">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] text-slate-900 shadow-lg">
            !
          </div>
        </div>
      </div>

      <div className="z-10 text-center">
        <h3 className="text-sm font-bold tracking-tight text-white sm:text-base">
          {message}{dots}
        </h3>
        <p className="mt-1 px-4 text-[10px] leading-relaxed text-white/50 sm:text-[11px]">
          {submessage}
        </p>
      </div>

      {/* Status Badge */}
      <div className="mt-4 flex flex-col gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 backdrop-blur-sm transition-all hover:bg-white/[0.05]">
        <div className="flex items-center justify-between gap-6">
          <span className="text-[10px] font-medium uppercase tracking-wider text-white/40">Queue Status</span>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
            <span className="text-[10px] font-bold text-amber-200">Express Review</span>
          </div>
        </div>
        
        {paymentId && (
          <div className="mt-1 flex items-center justify-between gap-4 border-t border-white/[0.05] pt-1.5">
            <span className="text-[9px] text-white/30 uppercase tracking-tighter">Request ID</span>
            <span className="font-mono text-[10px] font-semibold text-white/80">{paymentId}</span>
          </div>
        )}
      </div>

      {/* Animated Loading Dots Footer */}
      <div className="mt-4 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1 w-3 rounded-full bg-amber-500/40"
            style={{
              animation: "vortexGlow 1.5s ease-in-out infinite",
              animationDelay: `${i * 0.2}s`
            }}
          />
        ))}
      </div>
    </div>
  )
}
