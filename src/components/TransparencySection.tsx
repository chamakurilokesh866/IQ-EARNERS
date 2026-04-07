"use client"

import { useEffect, useState } from "react"
import TransitionLink from "./TransitionLink"
import { CheckIcon } from "./AnimatedIcons"

type TransparencyData = {
  recentWinners: { rank: number; name: string; score: number; country?: string }[]
  payoutProof: { amount: number; maskedUser: string; date?: number }[]
  totalPrizePool: number
  currency: string
  totalParticipants: number
  upcomingTournaments: number
}

export default function TransparencySection() {
  const [data, setData] = useState<TransparencyData | null>(null)

  useEffect(() => {
    fetch("/api/transparency", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j?.ok && j?.data) setData(j.data)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const refresh = () => {
      fetch("/api/transparency", { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => {
          if (j?.ok && j?.data) setData(j.data)
        })
        .catch(() => {})
    }
    const id = setInterval(refresh, 30000)
    return () => clearInterval(id)
  }, [])

  if (!data) return null

  const currencySymbol = data.currency === "INR" ? "₹" : data.currency === "USD" ? "$" : ""

  return (
    <section className="rounded-3xl border border-[#e8eaf0] bg-white overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
      <div className="p-5 sm:p-7 border-b border-[#e8eaf0] bg-blue-50/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
        <div className="relative z-10">
          <h2 className="text-xl font-black text-[#1a2340] flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <CheckIcon size={18} className="text-white" />
            </span>
            Trust & Transparency
          </h2>
          <p className="text-sm text-[#64748b] mt-2 font-bold leading-relaxed">Real wins. Real payouts. Verified platform data.</p>
        </div>
      </div>
      <div className="p-5 sm:p-7 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white">
        {/* Recent Winners */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-[#1a2340] flex items-center gap-2 uppercase tracking-[0.2em] opacity-40">
            🏆 Recent Winners
          </h3>
          {data.recentWinners.length === 0 ? (
            <p className="text-xs text-[#94a3b8] font-bold py-4">Waiting for today's champions...</p>
          ) : (
            <ul className="space-y-3">
              {data.recentWinners.map((w, i) => (
                <li key={w.rank} className="flex items-center justify-between p-3 rounded-2xl bg-[#f8fafc] border border-[#e8eaf0] hover:bg-[#f1f5f9] transition-all group">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-black flex items-center justify-center border border-blue-100 shadow-sm group-hover:scale-110 transition-transform">
                      #{w.rank}
                    </span>
                    <span className="font-black text-[#1a2340] text-sm group-hover:text-[#7c3aed] transition-colors">{w.name}</span>
                  </div>
                  <span className="text-[#7c3aed] font-black text-xs px-2 py-1 rounded-lg bg-blue-50 border border-blue-100">{w.score} PTS</span>
                </li>
              ))}
            </ul>
          )}
          <TransitionLink href="/leaderboard" className="inline-flex items-center gap-1.5 text-[10px] text-[#7c3aed] font-black hover:translate-x-1 transition-all uppercase tracking-widest">
            Full Leaderboard <span className="text-lg">→</span>
          </TransitionLink>
        </div>

        {/* Payout Proof */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-[#1a2340] flex items-center gap-2 uppercase tracking-[0.2em] opacity-40">
            💸 Recent Payouts
          </h3>
          {data.payoutProof.length === 0 ? (
            <p className="text-xs text-[#94a3b8] font-bold py-4">Payouts will appear after wins are claimed.</p>
          ) : (
            <ul className="space-y-3">
              {data.payoutProof.slice(0, 5).map((p, i) => (
                <li key={i} className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/30 border border-emerald-100/50 hover:bg-emerald-50 transition-all group">
                  <span className="text-[#64748b] font-black text-xs uppercase tracking-tight group-hover:text-[#1a2340] transition-colors">{p.maskedUser}</span>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-black text-emerald-700 text-xs">
                      {currencySymbol}{p.amount} PAID
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Live stats bar */}
      <div className="px-5 sm:px-7 py-5 bg-[#f8fafc] border-t border-[#e8eaf0] flex flex-wrap items-center justify-between gap-6 overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-10 pointer-events-none" />
        <div className="relative z-10 flex flex-wrap items-center gap-5 sm:gap-8">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#64748b]/60">Participants</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 border border-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.3)] animate-pulse" />
              <span className="text-sm font-black text-[#1a2340]">{data.totalParticipants.toLocaleString()}</span>
            </div>
          </div>
          <div className="w-px h-8 bg-[#e8eaf0] hidden sm:block" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#64748b]/60">Total Prize Pool</span>
            <span className="text-sm font-black text-[#7c3aed]">{currencySymbol}{data.totalPrizePool.toLocaleString()}</span>
          </div>
          {data.upcomingTournaments > 0 && (
            <>
              <div className="w-px h-8 bg-[#e8eaf0] hidden sm:block" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#64748b]/60">Live Events</span>
                <span className="text-sm font-black text-[#1a2340]">{data.upcomingTournaments} Upcoming</span>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
