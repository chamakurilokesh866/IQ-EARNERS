"use client"

import Navbar from "../../components/Navbar"
import TransitionLink from "../../components/TransitionLink"
import AdSlot from "../../components/AdSlot"
import LiveMegaTournamentBanner from "../../components/LiveMegaTournamentBanner"
import TransparencySection from "../../components/TransparencySection"
import PaidGate from "../../components/PaidGate"
import { getBootstrapUrl } from "@/lib/bootstrapFetch"
import { useEffect, useMemo, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

export default function Page() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [liveMega, setLiveMega] = useState<{ prizePool: string; enrolled: number; capacity: number; liveQuizHour: number; liveQuizMinute: number; liveMegaTimeEnabled?: boolean; featuredTournament?: { id: string; title?: string; fee?: number; cashfreeFormUrl?: string } | null } | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [tab, setTab] = useState<"available" | "completed" | "missed">("available")
  const [typed, setTyped] = useState("")
  const [blink, setBlink] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()
  useEffect(() => {
    fetch("/api/tournaments", { cache: "no-store" }).then((r) => r.json()).then((j) => {
      setItems(Array.isArray(j?.data) ? j.data : [])
      setLoading(false)
    }).catch(() => { setItems([]); setLoading(false) })
    fetch("/api/live-mega", { cache: "no-store" }).then((r) => r.json()).then((j) => {
      if (j?.ok && j?.data) setLiveMega({ ...j.data, featuredTournament: j.data?.featuredTournament ?? null })
    }).catch(() => { })
    fetch(getBootstrapUrl(), { cache: "no-store" }).then((r) => r.json()).then((j) => {
      const name = j?.data?.username || (typeof document !== "undefined" ? (document.cookie.match(/(?:^|; )username=([^;]+)/)?.[1] ? decodeURIComponent(document.cookie.match(/(?:^|; )username=([^;]+)/)![1]) : null) : null)
      setUsername(name)
      if (name) {
        const u = search.get("u")
        const enc = typeof window !== "undefined" ? window.btoa(name) : name
        if (u !== enc) {
          const q = new URLSearchParams(search?.toString() || "")
          q.set("u", enc)
          router.replace(`${pathname}?${q.toString()}`)
        }
      }
    }).catch(() => { })
  }, [])
  useEffect(() => {
    if (!username) return
    setTyped("")
    let i = 0
    const id = setInterval(() => {
      i++
      setTyped(username.slice(0, i))
      if (i >= username.length) clearInterval(id)
    }, 80)
    const cursorId = setInterval(() => setBlink((b) => !b), 500)
    return () => { clearInterval(id); clearInterval(cursorId) }
  }, [username])
  const cards = useMemo(() => {
    const mapped = items.map((t) => {
      const enrolled = Number(t.enrolled ?? 0)
      const capacity = Math.max(1, Number(t.capacity ?? 1))
      const pct = Math.min(100, Math.round(enrolled / capacity * 100))
      return { ...t, pct, enrolled, capacity }
    })
    const now = Date.now()
    const available = mapped.filter((t) => t?.endTime && new Date(t.endTime).getTime() > now).sort((a: any, b: any) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime())
    const completed = mapped.filter((t) => !t?.endTime || new Date(t.endTime).getTime() <= now).sort((a: any, b: any) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())
    const missed = completed
    if (tab === "available") return available
    if (tab === "completed") return completed
    return missed
  }, [items])
  return (
    <PaidGate>
    <main className="min-h-screen bg-transparent text-[#1a2340]">
      <Navbar />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-3 pb-6 sm:pt-4 sm:pb-8 lg:pt-3">
        <AdSlot slotId="tournament_top" />
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 border-b border-[#e8eaf0] pb-6">
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-[#000000]">Tournament Access</h1>
          {username && <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6b7a99] truncate">{username}</div>}
        </div>
        <p className="mt-4 text-[#6b7a99] text-xs sm:text-sm uppercase tracking-widest font-bold">Competitive Integrity • Real-time Rankings • Prize Pool Distribution</p>
        {username && (
          <div className="mt-1 text-2xl font-extrabold bg-gradient-to-r from-[#1a2340] to-[#7c3aed] bg-clip-text text-transparent animate-fade">
            {typed}
            <span className={`ml-1 text-[#7c3aed] ${blink ? "opacity-100" : "opacity-0"}`}>|</span>
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-4 text-[9px] font-black uppercase tracking-[0.25em] text-[#8892a4]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed]/40" />
            Fair Play Protocols
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed]/40" />
            Precision Timing
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed]/40" />
            Verified Outcomes
          </div>
        </div>
        {liveMega && liveMega.liveMegaTimeEnabled && (
          <div className="mt-6">
            <LiveMegaTournamentBanner
              prizePool={liveMega.prizePool}
              enrolled={liveMega.enrolled}
              capacity={liveMega.capacity}
              liveQuizHour={liveMega.liveQuizHour ?? 20}
              liveQuizMinute={liveMega.liveQuizMinute ?? 0}
              liveMegaTimeEnabled={true}
              variant="tournaments"
              featuredTournament={liveMega.featuredTournament ?? null}
              hideWhenLive
            />
          </div>
        )}
        <AdSlot slotId="tournament_mid" />
        <div className="mt-10 scroll-tabs border-b border-[#e8eaf0] pb-4">
          <div className="scroll-tabs-inner">
            <button className={`text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-full transition-all ${tab === "available" ? "bg-[#7c3aed] text-white" : "text-[#6b7a99] hover:text-[#7c3aed] bg-white border border-[#e8eaf0]"}`} onClick={() => setTab("available")}>Active Events</button>
            <button className={`text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-full transition-all ${tab === "completed" ? "bg-[#7c3aed] text-white" : "text-[#6b7a99] hover:text-[#7c3aed] bg-white border border-[#e8eaf0]"}`} onClick={() => setTab("completed")}>Archived</button>
            <button className={`text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-full transition-all ${tab === "missed" ? "bg-[#7c3aed] text-white" : "text-[#6b7a99] hover:text-[#7c3aed] bg-white border border-[#e8eaf0]"}`} onClick={() => setTab("missed")}>Lapsed</button>
          </div>
        </div>
        {loading ? (
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="qp-card shimmer h-48"></div>
            <div className="qp-card shimmer h-48"></div>
          </div>
        ) : !cards.length ? (
          <div className="mt-6 text-sm text-[#6b7a99]">No tournaments available</div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 stagger-reveal">
            {cards.map((t) => (
              <div key={t.id ?? t.title} className="qp-card p-8 stagger-item relative overflow-hidden group hover:border-[#7c3aed]/40 transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#7c3aed]/5 blur-3xl pointer-events-none group-hover:bg-[#7c3aed]/10 transition-colors" />

                {t?.endTime && new Date(t.endTime).getTime() > Date.now() && (
                  <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-[#7c3aed]/10 border border-[#7c3aed]/20 text-[#7c3aed] text-[9px] font-black uppercase tracking-widest">Live Arena</span>
                )}

                <div className="relative z-10">
                  <h3 className="text-xl font-black text-[#1a2340] uppercase tracking-tight">{t.title}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1 w-8 bg-[#7c3aed]/30" />
                    <span className="text-[10px] font-bold text-[#8892a4] uppercase tracking-widest">{t.enrolled}/{t.capacity} Participants</span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-6 text-sm relative z-10">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-[#8892a4] uppercase tracking-[0.2em]">Allocation Pool</span>
                    <span className="text-lg font-black text-[#1a2340]">{t.prizePool ?? "₹0"}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-[#8892a4] uppercase tracking-[0.2em]">Entry Type</span>
                    <span className="text-lg font-black text-[#1a2340] uppercase tracking-tighter">{t.fee > 0 ? `₹${t.fee}` : "PREMIUM"}</span>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-3 relative z-10">
                  <TransitionLink href="/leaderboard" className="px-6 py-3 rounded-xl bg-[#f8f9fc] border border-[#e8eaf0] hover:border-[#7c3aed]/40 text-[10px] font-black uppercase tracking-widest transition-all">Rankings</TransitionLink>
                  <TransitionLink href="/daily-quiz" className="px-6 py-3 rounded-xl bg-[#7c3aed] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#7c3aed]/20 hover:scale-[1.02] active:scale-[0.98] transition-all">Engage →</TransitionLink>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-10">
          <TransparencySection />
        </div>
        <div className="mt-10">
          <AdSlot slotId="tournament_bottom" />
        </div>
      </section>
    </main>
    </PaidGate>
  )
}
