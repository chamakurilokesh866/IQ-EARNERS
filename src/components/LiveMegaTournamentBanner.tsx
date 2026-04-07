"use client"

import { useEffect, useState } from "react"
import TransitionLink from "./TransitionLink"
import dynamic from "next/dynamic"

const TournamentEnrollModal = dynamic(() => import("./TournamentEnrollModal"), { ssr: false })

function pad(n: number) {
  return n.toString().padStart(2, "0")
}

function getNextLiveTime(hour: number, minute: number): number {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0)
  if (today.getTime() > now.getTime()) return today.getTime()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.getTime()
}

function formatLiveDate(targetMs: number): string {
  const d = new Date(targetMs)
  const now = new Date()
  const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  const timeStr = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })
  if (isToday) return `Today ${timeStr}`
  return `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} at ${timeStr}`
}

type Props = {
  prizePool?: string | number
  enrolled?: number
  capacity?: number
  liveQuizHour?: number
  liveQuizMinute?: number
  /** When false, hide "LIVE AT" tag and countdown. */
  liveMegaTimeEnabled?: boolean
  compact?: boolean
  /** When true, hide the banner (quiz is live). Used on home & leaderboard. */
  hideWhenLive?: boolean
  /** "home" = link to /tournaments + Join Now. "tournaments" = show enrollment modal on click, no Join Now. */
  variant?: "home" | "tournaments"
  /** Featured tournament for enrollment modal (when variant="tournaments"). */
  featuredTournament?: { id: string; title?: string; fee?: number; cashfreeFormUrl?: string } | null
}

export default function LiveMegaTournamentBanner({
  prizePool = "₹0",
  enrolled = 0,
  capacity = 100,
  liveQuizHour = 20,
  liveQuizMinute = 0,
  liveMegaTimeEnabled = true,
  compact = false,
  hideWhenLive = true,
  variant = "home",
  featuredTournament = null
}: Props) {
  const [target, setTarget] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  const [showEnrollModal, setShowEnrollModal] = useState(false)

  useEffect(() => {
    setTarget(getNextLiveTime(liveQuizHour, liveQuizMinute))
  }, [liveQuizHour, liveQuizMinute])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!target) return null

  const diff = Math.max(0, target - now)
  const hours = Math.floor(diff / (60 * 60 * 1000))
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000))
  const seconds = Math.floor((diff % (60 * 1000)) / 1000)
  const isLive = diff <= 0
  const effectiveCapacity = Math.max(capacity, enrolled, 1)
  const pct = Math.min(100, Math.round((enrolled / effectiveCapacity) * 100))

  if (hideWhenLive && isLive) return null

  if (compact) {
    return (
      <TransitionLink
        href="/tournaments"
        className="flex items-center justify-between rounded-xl px-4 py-3 bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 border border-primary/40 hover:border-primary/60 transition-all"
      >
        <div className="flex items-center gap-2">
          {liveMegaTimeEnabled && <span className="px-2 py-0.5 rounded bg-accent/30 text-accent text-xs font-bold animate-pulse">LIVE</span>}
          <span className="font-semibold">Mega Tournament</span>
        </div>
        <div className="text-right text-sm">
          <div className="font-bold text-primary">{prizePool}</div>
          {liveMegaTimeEnabled && <div className="text-white/60 text-xs">{pad(hours)}:{pad(minutes)}:{pad(seconds)}</div>}
        </div>
      </TransitionLink>
    )
  }

  const handleBannerClick = () => {
    if (variant === "tournaments" && featuredTournament?.id) {
      setShowEnrollModal(true)
    }
  }

  const baseClass = "block rounded-2xl overflow-hidden border-2 border-primary/50 bg-gradient-to-br from-primary/15 via-black to-accent/10 hover:border-primary/70 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300"

  const content = (
    <div className="p-6 sm:p-8 relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="relative flex flex-col gap-4">
        {/* Tags - stacked vertically to avoid overlap */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
          {liveMegaTimeEnabled && (
            <span className="inline-flex items-center gap-1 w-fit px-3 py-1 rounded-full bg-accent/30 text-accent text-sm font-bold animate-pulse">
              ⏳ LIVE AT {pad(liveQuizHour)}:{pad(liveQuizMinute)}
            </span>
          )}
          <span className="inline-flex w-fit px-3 py-1 rounded-full bg-primary/30 text-primary text-sm font-semibold">MEGA TOURNAMENT</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
          Everyone plays at the same time
        </h2>
        <p className="text-white/70 text-sm sm:text-base">
          Join the scheduled live quiz. Real-time leaderboard. Big prize pool.
        </p>
        {/* Info cards - stacked on mobile, grid on larger screens */}
        <div className={`grid gap-3 sm:gap-4 ${liveMegaTimeEnabled ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3"}`}>
          {liveMegaTimeEnabled && (
            <div className="rounded-xl bg-white/5 border border-white/10 p-3 sm:p-4 flex flex-col items-center justify-center text-center min-w-0">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-primary tabular-nums tracking-tight whitespace-nowrap">{pad(hours)}:{pad(minutes)}:{pad(seconds)}</div>
              <div className="text-[10px] sm:text-xs text-white/60 mt-1 truncate w-full">Countdown</div>
            </div>
          )}
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 sm:p-4 flex flex-col items-center justify-center text-center min-w-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-accent tracking-tight whitespace-nowrap truncate w-full">{prizePool}</div>
            <div className="text-[10px] sm:text-xs text-white/60 mt-1 truncate w-full">Prize Pool</div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 sm:p-4 flex flex-col items-center justify-center text-center min-w-0">
            <div className="text-lg sm:text-xl md:text-2xl font-bold tabular-nums tracking-tight whitespace-nowrap">{enrolled} / {capacity}</div>
            <div className="text-[10px] sm:text-xs text-white/60 mt-1 truncate w-full">Participants</div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 sm:p-4 flex flex-col justify-center items-center min-w-0">
            <div className="w-full h-1.5 sm:h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="text-[10px] sm:text-xs text-white/60 mt-2 truncate w-full text-center">{pct}% filled</div>
          </div>
        </div>
        {/* CTA - only on home, not on tournaments */}
        {variant === "home" && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-1">
            <span className="text-sm text-white/50">Don&apos;t miss out — enroll now</span>
            <span className="inline-flex items-center gap-2 font-semibold text-primary">
              Join Now <span className="text-lg">→</span>
            </span>
          </div>
        )}
        {variant === "tournaments" && featuredTournament?.id && (
          <div className="mt-1">
            <span className="text-sm text-white/50">Click to enroll</span>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {variant === "tournaments" && featuredTournament?.id ? (
        <>
          <button
            type="button"
            onClick={handleBannerClick}
            className={`w-full text-left ${baseClass} cursor-pointer`}
          >
            {content}
          </button>
          {showEnrollModal && (
            <TournamentEnrollModal
              tournament={featuredTournament}
              liveDate={formatLiveDate(target)}
              onSuccess={() => setShowEnrollModal(false)}
              onClose={() => setShowEnrollModal(false)}
            />
          )}
        </>
      ) : (
        <TransitionLink href="/tournaments" className={baseClass}>
          {content}
        </TransitionLink>
      )}
    </>
  )
}
