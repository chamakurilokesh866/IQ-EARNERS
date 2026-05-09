"use client"

type Props = { message?: string; compact?: boolean }

export default function MoneyTransferAnimation({ message = "Connecting to server…", compact = false }: Props) {
  if (compact) {
    return (
      <div className="relative flex flex-col items-center justify-center py-1">
        <div className="absolute inset-0 holo-grid-bg pointer-events-none rounded-lg opacity-[0.07]" aria-hidden />
        <div className="relative mb-2 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10 text-base">
            👤
          </div>
          <div className="flex items-center gap-0.5">
            <span className="text-sm" style={{ animation: "vortexPulseRing 1s ease-out infinite" }}>
              →
            </span>
            <span className="text-lg">💳</span>
          </div>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-500/35 bg-emerald-500/10 text-base"
            style={{ animation: "vortexGlow 1.4s ease-in-out infinite" }}
          >
            🏦
          </div>
        </div>
        <p className="text-center text-xs font-semibold leading-snug text-cyan-100/90">{message}</p>
        <div className="mt-2 h-0.5 w-24 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full w-1/2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
            style={{ animation: "portalProgressGlow 1.2s ease-in-out infinite" }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col items-center justify-center py-8">
      <div className="absolute inset-0 holo-grid-bg pointer-events-none rounded-xl opacity-10" />

      <div className="relative mb-6 flex items-center justify-center gap-4 sm:gap-8">
        <div className="relative flex flex-col items-center">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/40 bg-primary/15 text-2xl sm:h-18 sm:w-18 sm:text-3xl vortex-glow">
            <span className="relative z-10">👤</span>
            <div className="absolute inset-0 rounded-full border border-primary/20" style={{ animation: "vortexPulseRing 2s ease-out infinite" }} />
          </div>
          <span className="mt-2 text-xs font-medium text-white/50">You</span>
        </div>

        <div className="relative flex items-center gap-1">
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full vortex-energy-beam opacity-60" />
          <div className="relative flex items-center gap-2">
            <div className="h-1 w-6 overflow-hidden rounded-full sm:h-1.5 sm:w-8">
              <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-amber-400 to-primary money-flow-bar" />
            </div>
            <span className="relative z-10 text-xl vortex-coin-spin sm:text-2xl" style={{ filter: "drop-shadow(0 0 8px rgba(245,179,1,0.4))" }}>
              💰
            </span>
            <div className="h-1 w-6 overflow-hidden rounded-full sm:h-1.5 sm:w-8">
              <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-primary to-amber-400 money-flow-bar" style={{ animationDelay: "0.4s" }} />
            </div>
            <span className="relative z-10 text-xl vortex-coin-spin sm:text-2xl" style={{ animationDelay: "0.3s", filter: "drop-shadow(0 0 8px rgba(245,179,1,0.4))" }}>
              💰
            </span>
            <div className="h-1 w-6 overflow-hidden rounded-full sm:h-1.5 sm:w-8">
              <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 money-flow-bar" style={{ animationDelay: "0.8s" }} />
            </div>
          </div>
        </div>

        <div className="relative flex flex-col items-center">
          <div
            className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-500/40 bg-emerald-500/15 text-2xl sm:h-18 sm:w-18 sm:text-3xl"
            style={{ animation: "vortexGlow 2s ease-in-out infinite", animationDelay: "1s" }}
          >
            <span className="relative z-10">🏦</span>
            <div className="absolute inset-0 rounded-full border border-emerald-400/20" style={{ animation: "vortexPulseRing 2s ease-out 0.5s infinite" }} />
          </div>
          <span className="mt-2 text-xs font-medium text-white/50">Server</span>
        </div>
      </div>

      <p
        className="text-base font-bold text-transparent sm:text-lg bg-gradient-to-r from-primary via-amber-400 to-primary bg-clip-text"
        style={{ backgroundSize: "200% auto", animation: "celebrationGoldShine 3s linear infinite" }}
      >
        {message}
      </p>

      <div className="mt-4 h-1 w-32 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-amber-400" style={{ animation: "portalProgressGlow 2s ease-in-out infinite" }} />
      </div>
    </div>
  )
}
