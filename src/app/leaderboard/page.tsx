"use client"

import Navbar from "../../components/Navbar"
import LeaderboardStats from "../../components/LeaderboardStats"
import LeaderboardPodium from "../../components/LeaderboardPodium"
import LeaderboardTable from "../../components/LeaderboardTable"
import LeaderboardTabs from "../../components/LeaderboardTabs"
import TransparencySection from "../../components/TransparencySection"
import UserProfileModal from "../../components/UserProfileModal"
import PaidGate from "../../components/PaidGate"
import LiveMegaTournamentBanner from "../../components/LiveMegaTournamentBanner"
import { LeaderboardSkeleton } from "../../components/Skeleton"
import AdSlot from "../../components/AdSlot"
import { useEffect, useMemo, useState } from "react"
export default function Page() {
  const [players, setPlayers] = useState<Array<{ name: string; score: number; totalTimeSeconds?: number; country?: string }>>([])
  const [loading, setLoading] = useState(true)
  const [liveMega, setLiveMega] = useState<{ prizePool: string; enrolled: number; capacity: number; liveQuizHour: number; liveQuizMinute: number; liveMegaTimeEnabled?: boolean } | null>(null)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  useEffect(() => {
    fetch("/api/live-mega", { cache: "no-store" }).then((r) => r.json()).then((j) => {
      if (j?.ok && j?.data) setLiveMega(j.data)
    }).catch(() => { })
  }, [])
  useEffect(() => {
    let mounted = true
    let pollId: ReturnType<typeof setInterval> | null = null
    const POLL_MS = 10000
    const refresh = () => {
      fetch("/api/leaderboard")
        .then((r) => r.ok ? r.json() : Promise.reject(new Error("Not ok")))
        .then((j) => { if (mounted && Array.isArray(j?.data)) setPlayers(j.data) })
        .catch(() => { if (mounted) setPlayers((p) => p.length ? p : []) })
        .finally(() => { if (mounted) setLoading(false) })
    }
    const startPolling = () => {
      if (pollId) return
      pollId = setInterval(refresh, POLL_MS)
    }
    const stopPolling = () => {
      if (pollId) { clearInterval(pollId); pollId = null }
    }
    refresh()
    startPolling()
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") { refresh(); startPolling() }
      else stopPolling()
    }
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      mounted = false
      stopPolling()
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [])
  const topThree = useMemo(() => {
    const sorted = [...players].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      const ta = a.totalTimeSeconds ?? Infinity
      const tb = b.totalTimeSeconds ?? Infinity
      return ta - tb
    }).slice(0, 3)
    return sorted.map((p, idx) => ({ name: p.name, score: p.score, totalTimeSeconds: p.totalTimeSeconds, country: p.country, place: idx + 1 }))
  }, [players])

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-transparent leaderboard-premium-shell">
      <Navbar />
      <PaidGate>
        <AdSlot slotId="leaderboard_top" />
        <section className="relative mx-auto w-full max-w-7xl xl:max-w-[1600px] 2xl:max-w-[1800px] px-4 sm:px-8 pt-4 pb-10 sm:pt-6 sm:pb-16 lg:pt-3">
          {/* Header Section */}
          <div className="text-center mb-12 sm:mb-20">
            <div className="inline-flex items-center gap-2.5 px-6 py-2 rounded-2xl bg-blue-50 border border-blue-100 text-[#7c3aed] shadow-sm text-sm font-black mb-8 animate-bounce-slow uppercase tracking-widest">
              🏆 Live Global Rankings
            </div>
            <h1 className="text-6xl sm:text-8xl font-black tracking-tighter text-[#1a2340] mb-6 select-none">
              THE LEADERBOARD
            </h1>
            <p className="mt-4 text-[#64748b] text-base sm:text-xl max-w-2xl mx-auto font-bold leading-relaxed px-4">
              Celebrate the top performers. Tap any student to view their academic achievements and quiz history.
            </p>
          </div>

          {liveMega && liveMega.liveMegaTimeEnabled && (
            <div className="mb-12">
              <LiveMegaTournamentBanner
                prizePool={liveMega.prizePool}
                enrolled={liveMega.enrolled}
                capacity={liveMega.capacity}
                liveQuizHour={liveMega.liveQuizHour ?? 20}
                liveQuizMinute={liveMega.liveQuizMinute ?? 0}
                liveMegaTimeEnabled={true}
                hideWhenLive
              />
            </div>
          )}

          {loading ? (
            <LeaderboardSkeleton />
          ) : (
            <div className="space-y-12 sm:space-y-20">
              {/* Podium Section */}
              <div className="relative">
                <p className="text-center text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.3em] mb-4">Elite Tier — Top 3 Finalists</p>
                <div className="rounded-[2.5rem] bg-white border border-[#e8eaf0] p-6 sm:p-12 shadow-sm relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
                   <LeaderboardPodium items={topThree} onSelect={setSelectedUser} />
                </div>
              </div>

              {/* Stats & Controls */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-4 space-y-8">
                  <div className="rounded-3xl bg-white border border-[#e8eaf0] p-6 shadow-sm">
                    <LeaderboardStats />
                  </div>
                  <div className="rounded-3xl bg-white border border-[#e8eaf0] p-4 shadow-sm">
                    <LeaderboardTabs />
                  </div>
                  <AdSlot slotId="leaderboard_sidebar" />
                </div>

                <div className="lg:col-span-8 space-y-8">
                  <AdSlot slotId="leaderboard_mid" />
                  
                  {/* Rankings Table */}
                  <div className="rounded-3xl bg-white border border-[#e8eaf0] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <LeaderboardTable players={players} onSelect={setSelectedUser} />
                  </div>
                </div>
              </div>

              {/* Trust Section */}
              <div className="pt-8">
                <TransparencySection />
              </div>
            </div>
          )}
        </section>
      </PaidGate>
      {selectedUser && <UserProfileModal username={selectedUser} onClose={() => setSelectedUser(null)} />}
    </main>
  )
}
