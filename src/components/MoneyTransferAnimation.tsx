"use client"

type Props = { message?: string }
export default function MoneyTransferAnimation({ message = "Connecting to server…" }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-8 relative">
      {/* Background grid */}
      <div className="absolute inset-0 holo-grid-bg opacity-10 pointer-events-none rounded-xl" />

      <div className="flex items-center justify-center gap-4 sm:gap-8 mb-6 relative">
        {/* User node */}
        <div className="flex flex-col items-center relative">
          <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-primary/15 border-2 border-primary/40 flex items-center justify-center text-2xl sm:text-3xl relative vortex-glow">
            <span className="relative z-10">👤</span>
            {/* Pulse rings */}
            <div className="absolute inset-0 rounded-full border border-primary/20" style={{ animation: "vortexPulseRing 2s ease-out infinite" }} />
          </div>
          <span className="text-xs text-white/50 mt-2 font-medium">You</span>
        </div>

        {/* Energy beam connector */}
        <div className="flex items-center gap-1 relative">
          {/* Energy beam */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 rounded-full vortex-energy-beam opacity-60" />

          {/* Animated coins */}
          <div className="relative flex items-center gap-2">
            <div className="w-6 h-1 sm:w-8 sm:h-1.5 rounded-full overflow-hidden">
              <div className="h-full w-1/2 bg-gradient-to-r from-amber-400 to-primary rounded-full money-flow-bar" />
            </div>
            <span className="text-xl sm:text-2xl vortex-coin-spin relative z-10" style={{ filter: "drop-shadow(0 0 8px rgba(245,179,1,0.4))" }}>💰</span>
            <div className="w-6 h-1 sm:w-8 sm:h-1.5 rounded-full overflow-hidden">
              <div className="h-full w-1/2 bg-gradient-to-r from-primary to-amber-400 rounded-full money-flow-bar" style={{ animationDelay: "0.4s" }} />
            </div>
            <span className="text-xl sm:text-2xl vortex-coin-spin relative z-10" style={{ animationDelay: "0.3s", filter: "drop-shadow(0 0 8px rgba(245,179,1,0.4))" }}>💰</span>
            <div className="w-6 h-1 sm:w-8 sm:h-1.5 rounded-full overflow-hidden">
              <div className="h-full w-1/2 bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full money-flow-bar" style={{ animationDelay: "0.8s" }} />
            </div>
          </div>
        </div>

        {/* Server node */}
        <div className="flex flex-col items-center relative">
          <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center text-2xl sm:text-3xl relative" style={{ animation: "vortexGlow 2s ease-in-out infinite", animationDelay: "1s" }}>
            <span className="relative z-10">🏦</span>
            {/* Pulse rings */}
            <div className="absolute inset-0 rounded-full border border-emerald-400/20" style={{ animation: "vortexPulseRing 2s ease-out 0.5s infinite" }} />
          </div>
          <span className="text-xs text-white/50 mt-2 font-medium">Server</span>
        </div>
      </div>

      {/* Status message */}
      <p className="text-base sm:text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary via-amber-400 to-primary" style={{ backgroundSize: "200% auto", animation: "celebrationGoldShine 3s linear infinite" }}>
        {message}
      </p>

      {/* Subtle progress indicator */}
      <div className="mt-4 w-32 h-1 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-amber-400" style={{ animation: "portalProgressGlow 2s ease-in-out infinite" }} />
      </div>
    </div>
  )
}
