"use client"

import Navbar from "../../components/Navbar"
import PaidGate from "../../components/PaidGate"
import AdSlot from "../../components/AdSlot"
import { useEffect, useMemo, useState } from "react"
import { PrizeSkeleton } from "../../components/Skeleton"
import Link from "next/link"

const PRIZE_TABS = [
  { key: "prize", label: "Prize" },
  { key: "voucher", label: "Voucher" }
]

const DEFAULT_IMAGE = "/images/gift.svg"

function normalizeItem(raw: any) {
  const totalSpots = Math.max(0, Number(raw?.totalSpots) ?? 10)
  const spotsLeft = Math.max(0, Math.min(totalSpots, Number(raw?.spotsLeft) ?? totalSpots))
  return {
    id: String(raw?.id ?? raw?.title ?? Math.random()),
    title: String(raw?.title ?? "Prize"),
    type: raw?.type === "voucher" ? "voucher" : "prize",
    tournamentId: raw?.tournamentId ?? "",
    tournamentTitle: raw?.tournamentTitle ?? "",
    image: raw?.image && /^https?:\/\//i.test(raw.image) ? raw.image : (raw?.image || DEFAULT_IMAGE),
    description: String(raw?.description ?? ""),
    price: raw?.price ? String(raw.price) : undefined,
    spotsLeft,
    totalSpots
  }
}

function PrizeCard({
  id,
  title,
  tournamentId,
  tournamentTitle,
  image,
  description,
  price,
  spotsLeft,
  totalSpots,
  onEnroll
}: {
  id: string
  title: string
  tournamentId?: string
  tournamentTitle: string
  image: string
  description: string
  price?: string
  spotsLeft: number
  totalSpots: number
  onEnroll?: (id: string) => void
}) {
  const percentage = totalSpots > 0 ? Math.round(((totalSpots - spotsLeft) / totalSpots) * 100) : 0
  const canEnroll = spotsLeft > 0
  return (
    <div className="group rounded-[2rem] border border-white/10 bg-white/[0.05] shadow-[0_8px_40px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all duration-500 hover:border-white/[0.14] hover:bg-white/[0.07] hover:-translate-y-1 overflow-hidden liquid-glass-panel">
      <div className="relative h-48 overflow-hidden bg-slate-950/80">
        <img
          className="h-full w-full object-cover opacity-95 transition-transform duration-700 group-hover:scale-110"
          src={image}
          alt={title}
          onError={(e) => {
            ;(e.target as HTMLImageElement).src = DEFAULT_IMAGE
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060a14]/90 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-4 left-4">
          <div className="rounded-full border border-white/15 bg-[#0f1a33]/85 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/90 backdrop-blur-md">
            Verified Asset
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="mb-1 truncate font-black text-xl uppercase tracking-tight text-white">{title}</div>
        {tournamentTitle && tournamentId && (
          <Link
            href={`/tournaments${tournamentId ? `?t=${tournamentId}` : ""}`}
            className="mb-4 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#7eb3ff] hover:underline"
          >
            🏆 {tournamentTitle}
          </Link>
        )}
        {price && <div className="mb-3 text-lg font-black tracking-tighter text-[#7eb3ff]">{price}</div>}
        <p className="mb-6 line-clamp-2 text-sm font-medium leading-relaxed text-slate-400">
          {description || "Participate in the associated academic tournament to secure this award."}
        </p>

        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
            <span>{spotsLeft} Positions Remaining</span>
            <span>{percentage}% Allotted</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-[#7c3aed] shadow-[0_0_12px_rgba(124,58,237,0.45)] transition-all duration-1000 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          className="h-12 w-full rounded-xl bg-[#7c3aed] text-xs font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500 disabled:shadow-none"
          onClick={() => canEnroll && onEnroll?.(id)}
          disabled={!canEnroll}
        >
          {canEnroll ? "Enroll Target" : "Inventory Depleted"}
        </button>
      </div>
    </div>
  )
}

export default function PrizesPage() {
  const [tab, setTab] = useState<"prize" | "voucher">("prize")
  const [items, setItems] = useState<any[]>([])
  const [tournaments, setTournaments] = useState<any[]>([])
  const [tournamentId, setTournamentId] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/tournaments", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setTournaments(Array.isArray(j?.data) ? j.data : []))
      .catch(() => setTournaments([]))
  }, [])

  useEffect(() => {
    let mounted = true
    setLoading(true)
    const qs = new URLSearchParams()
    qs.set("type", tab)
    if (tournamentId) qs.set("tournamentId", tournamentId)
    fetch(`/api/prizes?${qs}`)
      .then((r) => r.json())
      .then((j) => mounted && setItems(Array.isArray(j?.data) ? j.data : []))
      .catch(() => mounted && setItems([]))
      .finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [tab, tournamentId])

  const normalized = useMemo(() => items.map(normalizeItem), [items])
  const onEnroll = async (id: string) => {
    await fetch("/api/prizes/enroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => { })
    const qs = new URLSearchParams()
    qs.set("type", tab)
    if (tournamentId) qs.set("tournamentId", tournamentId)
    const r = await fetch(`/api/prizes?${qs}`)
    const j = await r.json()
    setItems(Array.isArray(j?.data) ? j.data : [])
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-transparent text-slate-100">
      <Navbar />

      <PaidGate>
        <section className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-4 sm:px-8 sm:pb-20 sm:pt-6 lg:pt-3">
          <AdSlot slotId="prizes_top" />

          <div className="mb-12 text-center sm:mb-16">
            <div className="liquid-glass-panel mb-6 inline-flex animate-bounce-slow items-center gap-2.5 rounded-2xl px-5 py-2 text-xs font-black uppercase tracking-widest text-[#7eb3ff] sm:mb-8 sm:text-sm">
              💎 Exclusive Rewards
            </div>
            <h1
              className="mb-4 select-none text-5xl font-black uppercase tracking-tighter text-white sm:mb-6 sm:text-7xl md:text-8xl"
              style={{ fontFamily: "var(--font-display), ui-serif, Georgia, serif" }}
            >
              Prizes &amp; Vouchers
            </h1>
            <p className="mx-auto max-w-2xl px-4 text-base font-semibold leading-relaxed text-slate-400 sm:text-xl">
              Secure tangible assets by demonstrating academic excellence. Win certificates, high-tech gadgets, and premium gift vouchers.
            </p>
          </div>

          <div className="mb-12 flex flex-col items-center justify-center gap-5 md:mb-16 md:flex-row md:gap-6">
            <div className="liquid-glass-panel flex rounded-2xl p-1.5">
              {PRIZE_TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key as "prize" | "voucher")}
                  className={`rounded-xl px-7 py-3 text-xs font-black uppercase tracking-widest transition-all ${
                    tab === t.key
                      ? "bg-[#7c3aed] text-white shadow-[0_0_28px_rgba(124,58,237,0.35)]"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {t.label}s
                </button>
              ))}
            </div>

            <div className="group relative w-full max-w-md md:w-auto md:max-w-none">
              <select
                value={tournamentId}
                onChange={(e) => setTournamentId(e.target.value)}
                className="liquid-glass-panel h-14 w-full cursor-pointer appearance-none rounded-2xl border-0 bg-white/[0.06] pl-6 pr-12 text-sm font-black uppercase tracking-widest text-white outline-none ring-1 ring-white/10 transition-all focus:ring-2 focus:ring-[#7c3aed]/50 md:min-w-[280px]"
              >
                <option value="">All Academic Stages</option>
                {tournaments.map((t: any) => (
                  <option key={t.id} value={t.id} className="bg-[#0f1628] text-white">
                    {t.title ?? t.id}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-hover:text-[#7eb3ff]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>
          </div>

          <AdSlot slotId="prizes_mid" />

          {loading ? (
            <PrizeSkeleton />
          ) : normalized.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
              {normalized.map((i, idx) => (
                <div key={i.id} className="animate-slide-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <PrizeCard
                    id={i.id}
                    title={i.title}
                    tournamentId={i.tournamentId}
                    tournamentTitle={i.tournamentTitle}
                    image={i.image}
                    description={i.description}
                    price={i.price}
                    spotsLeft={i.spotsLeft}
                    totalSpots={i.totalSpots}
                    onEnroll={onEnroll}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="liquid-glass-panel mx-auto max-w-4xl rounded-[3rem] p-12 text-center sm:p-20">
              <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl border border-white/10 bg-white/5 shadow-inner">
                <span className="text-4xl opacity-30 grayscale">📦</span>
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight text-white">Zero Inventory Match</h3>
              <p className="mt-2 font-bold text-slate-400">
                No {tab === "prize" ? "tangible rewards" : "vouchers"} found for this filter combination.
              </p>
              <button
                type="button"
                onClick={() => {
                  setTournamentId("")
                  setTab("prize")
                }}
                className="mt-8 rounded-xl border border-white/15 bg-white/5 px-8 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:border-[#7c3aed]/50 hover:bg-white/10"
              >
                Reset Filter Logic
              </button>
            </div>
          )}
          
          <div className="mt-20">
            <AdSlot slotId="prizes_bottom" />
          </div>
        </section>
      </PaidGate>
    </main>
  )
}
