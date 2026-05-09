"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"

export default function PaymentFailedAnimation({
  onRetry,
  autoRedirectSeconds = 0,
  subtitle,
  redirectTo,
}: {
  /** If set, shows a primary button to try payment again instead of only waiting */
  onRetry?: () => void
  /** If > 0 and `onRetry` is not set, redirect after countdown (seconds) */
  autoRedirectSeconds?: number
  subtitle?: string
  redirectTo?: string
}) {
  const [secs, setSecs] = useState(autoRedirectSeconds)

  useEffect(() => {
    if (onRetry || autoRedirectSeconds <= 0) return
    if (secs <= 0) {
      const target = redirectTo ?? "/intro"
      window.location.replace(target)
      return
    }
    const t = window.setTimeout(() => setSecs((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [onRetry, autoRedirectSeconds, secs, redirectTo])

  return (
    <div className="flex flex-col items-center justify-center py-10 relative">
      {/* Dynamic Background Glitch Lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ left: "-100%" }}
            animate={{ left: "100%" }}
            transition={{ duration: 1.5, delay: i * 0.3, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 bottom-0 w-px bg-red-500/50"
            style={{ left: `${i * 25}%` }}
          />
        ))}
      </div>

      <div className="relative mb-8">
        {/* Main Error Node */}
        <motion.div
           initial={{ scale: 0.8, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           transition={{ type: "spring", damping: 12 }}
           className="w-24 h-24 rounded-2xl bg-gradient-to-br from-red-600/20 to-red-900/40 border-2 border-red-500/50 flex items-center justify-center text-5xl relative z-10 shadow-[0_0_50px_rgba(239,68,68,0.3)]"
        >
          <span className="relative">🚫</span>
          
          {/* Scanning line */}
          <motion.div 
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-0.5 bg-red-400/80 shadow-[0_0_10px_red] z-20"
          />
        </motion.div>

        {/* Orbiting particles */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            animate={{ rotate: 360 }}
            transition={{ duration: 3 + i, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[-20px] rounded-full border border-red-500/10 pointer-events-none"
          >
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_red]" />
          </motion.div>
        ))}
      </div>

      {/* Warning Text with Glitch */}
      <motion.div 
        animate={{ x: [-1, 1, -1] }}
        transition={{ duration: 0.1, repeat: 10 }}
        className="text-center"
      >
        <h2 className="text-3xl font-black text-red-500 uppercase tracking-tighter mb-1 font-mono">
          Payment Rejected
        </h2>
        {subtitle ? (
          <p className="text-sm text-white/55 max-w-sm mx-auto mb-4 leading-relaxed">{subtitle}</p>
        ) : null}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] text-red-400/70 font-mono font-bold uppercase tracking-widest">
            Security Protocol Engaged
          </span>
        </div>
      </motion.div>

      {onRetry ? (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-sm"
        >
          <button
            type="button"
            onClick={onRetry}
            className="w-full sm:flex-1 py-4 rounded-2xl bg-primary text-black text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/25 hover:brightness-110 active:scale-[0.98] transition-all"
          >
            Try again
          </button>
        </motion.div>
      ) : autoRedirectSeconds > 0 ? (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-red-500/5 border border-red-500/10 rounded-full px-6 py-2 flex items-center gap-3 backdrop-blur-md"
        >
          <div className="w-4 h-4 rounded-full border-2 border-red-500/30 border-t-red-500 animate-spin" />
          <span className="text-[11px] text-white/60 font-medium uppercase tracking-wider">
            Returning in <span className="text-white font-bold tabular-nums">{secs}s</span>
          </span>
        </motion.div>
      ) : null}

      {/* IQ Protect Badge */}
      <div className="mt-8 flex items-center gap-2 grayscale opacity-30">
        <span className="px-1.5 py-0.5 rounded bg-white/10 text-[8px] font-bold text-white uppercase tracking-tighter border border-white/20">
          IQ Protect
        </span>
        <span className="text-[9px] text-white/40 font-medium">End-to-End Encryption</span>
      </div>
    </div>
  )
}

