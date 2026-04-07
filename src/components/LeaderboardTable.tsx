"use client"

import { useEffect, useMemo, useState } from "react"
import FlagImg from "./FlagImg"
import { getBootstrapUrl } from "@/lib/bootstrapFetch"
import { ChevronDownIcon } from "./AnimatedIcons"

type Row = { id?: string; rank: number; name: string; score: number; totalTimeSeconds?: number; country?: string }

type SortKey = "rank" | "score" | "time" | "name"

export default function LeaderboardTable({ players = [], onSelect }: { players?: Array<{ id?: string; name: string; score: number; totalTimeSeconds?: number; country?: string }>; onSelect?: (name: string) => void }) {
  const [query, setQuery] = useState("")
  const [username, setUsername] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortKey>("rank")
  const [asc, setAsc] = useState(false) // false = rank 1 at top (descending)

  useEffect(() => {
    fetch(getBootstrapUrl(), { cache: "no-store" }).then((r) => r.json()).then((j) => setUsername(j?.data?.username ?? null)).catch(() => setUsername(null))
  }, [])

  const rows = useMemo(() => {
    const initial = [...(players ?? [])].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      const ta = a.totalTimeSeconds ?? Infinity
      const tb = b.totalTimeSeconds ?? Infinity
      return ta - tb
    })
    const withRank: Row[] = initial.map((r, i) => ({ ...r, rank: i + 1 }))

    if (sortBy === "score") withRank.sort((a, b) => (asc ? a.score - b.score : b.score - a.score))
    else if (sortBy === "time") withRank.sort((a, b) => {
      const ta = a.totalTimeSeconds ?? Infinity
      const tb = b.totalTimeSeconds ?? Infinity
      return asc ? ta - tb : tb - ta
    })
    else if (sortBy === "name") withRank.sort((a, b) => (asc ? 1 : -1) * (a.name.localeCompare(b.name)))
    else if (sortBy === "rank") withRank.sort((a, b) => (asc ? a.rank - b.rank : b.rank - a.rank))

    return withRank.filter((r) => r.name?.toLowerCase().includes(query.toLowerCase()))
  }, [query, players, sortBy, asc])

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setAsc((a) => !a)
    else {
      setSortBy(key)
      setAsc(key === "name") // rank/score/time: descending (top first), name: ascending
    }
  }

  return (
    <div className="rounded-3xl border border-[#e8eaf0] bg-white overflow-hidden shadow-sm">
      {/* Header Section */}
      <div className="p-6 sm:p-10 bg-[#f8fafc] border-b border-[#e8eaf0] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-[#1a2340] tracking-tight uppercase flex items-center gap-3">
              Elite Rankings
            </h2>
            <div className="text-xs text-[#64748b] font-black uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Tracking {rows.length} Top Performers Globally
            </div>
          </div>

          <div className="relative w-full md:w-96 group">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-14 rounded-2xl border border-[#e8eaf0] bg-white px-6 pl-14 text-[#1a2340] font-bold placeholder:text-[#94a3b8] focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] outline-none transition-all shadow-sm"
              placeholder="Search by student identifier..."
            />
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[#94a3b8] font-black text-[10px] uppercase tracking-widest">UID</div>
          </div>
        </div>

        {/* Sorting Matrix */}
        <div className="relative z-10 flex flex-wrap items-center gap-3 mt-10 pt-6 border-t border-[#e8eaf0]">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#94a3b8] mr-3">Filter Intelligence</span>
          {(["rank", "score", "time", "name"] as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => toggleSort(key)}
              className={`h-10 px-5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-2 ${sortBy === key
                ? "bg-[#7c3aed] text-white shadow-lg shadow-blue-500/20"
                : "bg-white border border-[#e8eaf0] text-[#64748b] hover:border-[#7c3aed] hover:text-[#7c3aed]"
                }`}
            >
              <span>{key === "rank" ? "Global Rank" : key === "time" ? "Completion Speed" : key}</span>
              {sortBy === key && (
                <div className={`transition-transform duration-300 ${asc ? "rotate-180" : ""}`}>
                  <ChevronDownIcon size={12} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Ranking Matrix */}
      <div className="divide-y divide-[#e8eaf0] max-h-[600px] overflow-y-auto bg-white custom-scrollbar">
        {rows.length > 0 ? (
          rows.map((r, idx) => (
            <button
              key={r.id ?? `${r.name}-${r.rank}-${idx}`}
              onClick={() => onSelect?.(r.name)}
              className={`w-full flex items-center gap-4 sm:gap-6 py-5 px-6 sm:px-10 transition-all hover:bg-[#f8fafc] group active:bg-[#f1f5f9] ${username && r.name === username ? "bg-blue-50/50 border-l-[6px] border-l-[#7c3aed]" : ""
                }`}
            >
              <div className="w-12 sm:w-16 shrink-0 flex justify-start">
                <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-black text-xs border shadow-sm ${r.rank === 1 ? "bg-amber-50 border-amber-200 text-amber-700" :
                  r.rank === 2 ? "bg-slate-50 border-slate-200 text-slate-700" :
                    r.rank === 3 ? "bg-orange-50 border-orange-200 text-orange-700" :
                      "bg-white border-[#e8eaf0] text-[#64748b]"
                  }`}>
                  #{r.rank}
                </span>
              </div>
              
              <div className="w-12 h-12 rounded-2xl bg-[#f1f5f9] border border-[#e8eaf0] flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-110 transition-transform shadow-inner">
                <FlagImg code={r.country} size={48} />
              </div>

              <div className="flex-1 min-w-0 text-left">
                <div className="text-base font-black text-[#1a2340] truncate uppercase tracking-tight group-hover:text-[#7c3aed] transition-colors">{r.name}</div>
                <div className="flex items-center gap-3 mt-1">
                   <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#f8fafc] border border-[#e8eaf0] text-[10px] font-black text-[#94a3b8] uppercase tracking-widest">
                     <span className="w-1.5 h-1.5 rounded-full bg-blue-500/40" />
                     {r.totalTimeSeconds != null ? `${r.totalTimeSeconds} SEC` : "— Speed"}
                   </div>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-2xl font-black text-[#1a2340] tracking-tighter leading-none">{r.score}</div>
                <div className="text-[10px] font-black text-[#7c3aed] uppercase tracking-[0.2em] mt-1 shadow-glow shadow-blue-500/10">PTS</div>
              </div>
            </button>
          ))
        ) : (
          <div className="py-24 text-center bg-[#f8fafc]">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-white border border-[#e8eaf0] flex items-center justify-center mb-6 shadow-sm">
              <div className="text-3xl animate-bounce">🔍</div>
            </div>
            <h3 className="text-xl font-black text-[#1a2340] uppercase tracking-tight">No Rankings Found</h3>
            <p className="text-[#64748b] font-bold mt-2">Adjust your refinement parameters and try again.</p>
          </div>
        )}
      </div>
    </div>
  )
}
