"use client"

import { useEffect, useState } from "react"

export default function UsernameCreatedAnimation({
  username,
  onCopy,
  onGoToLogin,
  copied
}: {
  username: string
  onCopy: () => void
  onGoToLogin: () => void
  copied: boolean
}) {
  const [revealed, setRevealed] = useState(0)
  const [showParticles, setShowParticles] = useState(false)
  const [showRipple, setShowRipple] = useState(false)

  useEffect(() => {
    setRevealed(0)
    setShowParticles(false)
    setShowRipple(false)
    const len = username.length
    if (len === 0) return
    const step = 55
    const t = setInterval(() => {
      setRevealed((r) => {
        if (r >= len) {
          clearInterval(t)
          // Trigger celebration effects after reveal
          setTimeout(() => setShowParticles(true), 100)
          setTimeout(() => setShowRipple(true), 200)
          return len
        }
        return r + 1
      })
    }, step)
    return () => clearInterval(t)
  }, [username])

  const isComplete = revealed >= username.length

  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        onGoToLogin()
      }, 3200)
      return () => clearTimeout(timer)
    }
  }, [isComplete, onGoToLogin])

  return (
    <div className="flex flex-col items-center w-full relative">
      {/* Particle explosion on completion */}
      {showParticles && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2">
          {[...Array(6)].map((_, i) => (
            <span key={i} className="dna-particle" />
          ))}
        </div>
      )}

      {/* Badge with 3D rotation */}
      <div className="relative mb-6 dna-badge-3d">
        <div className="relative w-20 h-20 flex items-center justify-center">
          {/* Ripple rings */}
          {showRipple && (
            <>
              <div className="absolute inset-0 rounded-full dna-ripple" />
              <div className="absolute inset-0 rounded-full dna-ripple" style={{ animationDelay: "0.2s" }} />
              <div className="absolute inset-0 rounded-full dna-ripple" style={{ animationDelay: "0.4s" }} />
            </>
          )}
          {/* Outer glow */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-emerald-500/30 blur-xl" />
          {/* Spinning ring */}
          <div className="absolute inset-[-4px] rounded-full border-2 border-primary/30" style={{ animation: "portalSpinRing 4s linear infinite" }} />
          {/* Inner badge */}
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary/40 via-emerald-500/30 to-cyan-400/40 border-2 border-primary/50 flex items-center justify-center backdrop-blur-sm shadow-[0_0_30px_rgba(124,58,237,0.3)]">
            <span className="text-3xl font-bold text-white dna-success-stamp">✓</span>
          </div>
        </div>
      </div>

      {/* Title with text reveal */}
      <h2 className="text-xl font-bold text-white mb-1 holo-field-appear" style={{ animationDelay: "0.3s" }}>
        <span className="celebration-gold-shine">Account Created</span>
      </h2>
      <div className="mb-5 space-y-1">
        <p className="text-sm text-white/60 holo-field-appear" style={{ animationDelay: "0.4s" }}>
          Your unique username
        </p>
        {isComplete && (
          <p className="text-xs text-cyan-400/80 font-medium">Redirecting you to login…</p>
        )}
      </div>

      {/* Username reveal box with DNA glow */}
      <div
        className="w-full mb-5 p-5 rounded-2xl border-2 backdrop-blur-sm relative overflow-hidden dna-box-glow"
        style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(34,197,94,0.05) 100%)" }}
      >
        {/* Scan line inside box */}
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" style={{ animation: "holoScanLine 3s ease-in-out infinite" }} />

        {/* Grid background */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "linear-gradient(rgba(124,58,237,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.3) 1px, transparent 1px)", backgroundSize: "16px 16px" }} />

        <p className="relative text-xl font-mono font-bold text-white tracking-wider select-all text-center min-h-[1.5em]">
          {username.split("").map((char, i) => (
            <span
              key={i}
              style={{
                display: "inline-block",
                opacity: i < revealed ? 1 : 0,
                animation: i < revealed ? `dnaHelixChar 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.05}s both` : "none",
                textShadow: isComplete ? "0 0 12px rgba(124,58,237,0.4)" : "none"
              }}
            >
              {char}
            </span>
          ))}
          {!isComplete && (
            <span className="inline-block w-0.5 h-5 bg-primary ml-0.5 align-middle" style={{ animation: "usernameCaretBlink 0.7s ease-in-out infinite" }} />
          )}
        </p>
      </div>

      {/* Copy button */}
      <button
        type="button"
        onClick={onCopy}
        className="holo-field-appear w-full py-3.5 px-4 rounded-xl border border-white/15 bg-white/10 text-white hover:bg-white/15 font-medium mb-3 transition-all backdrop-blur-sm hover:border-white/25 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] active:scale-[0.98]"
        style={{ animationDelay: "0.5s" }}
      >
        <span className="flex items-center justify-center gap-2">
          {copied ? (
            <>
              <span className="text-emerald-400">✓</span>
              <span className="text-emerald-300">Copied!</span>
            </>
          ) : (
            <>
              <span>📋</span>
              <span>Copy username</span>
            </>
          )}
        </span>
      </button>

      {/* Go to Login button */}
      <button
        type="button"
        onClick={onGoToLogin}
        className="holo-field-appear w-full py-3.5 px-4 rounded-xl text-black font-bold relative overflow-hidden hover:shadow-[0_0_30px_rgba(124,58,237,0.4)] active:scale-[0.98] transition-all"
        style={{
          animationDelay: "0.6s",
          background: "linear-gradient(110deg, #7c3aed 0%, #38bdf8 50%, #7c3aed 100%)",
          backgroundSize: "200% auto"
        }}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          <span>🚀</span>
          Go to Login
        </span>
      </button>
    </div>
  )
}
