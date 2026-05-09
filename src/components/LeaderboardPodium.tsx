"use client"

import FlagImg from "./FlagImg"

type Item = { name: string; score: number; totalTimeSeconds?: number; place: number; country?: string }

const MEDALS = { 1: "🏅", 2: "🥈", 3: "🥉" } as const
const RINGS = {
  1: "ring-4 ring-[#7c3aed] ring-offset-4 ring-offset-white shadow-xl shadow-blue-500/30",
  2: "ring-2 ring-slate-400/50 ring-offset-2 ring-offset-white shadow-lg shadow-slate-400/20",
  3: "ring-2 ring-amber-600/50 ring-offset-2 ring-offset-white shadow-lg shadow-amber-600/20"
} as const

export default function LeaderboardPodium({ items = [], onSelect }: { items?: Item[]; onSelect?: (name: string) => void }) {
  const byPlace = (p: number) => items.find((i) => i.place === p)
  const second = byPlace(2)
  const first = byPlace(1)
  const third = byPlace(3)

  if (!items.length) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-[#e8eaf0] bg-[#f8fafc] p-12 text-center">
        <div className="text-6xl mb-6 grayscale opacity-20">🏆</div>
        <div className="text-2xl font-black text-[#1a2340] uppercase tracking-tight">The Podium Awaits</div>
        <p className="mt-2 text-[#64748b] font-bold">No academic rankings registered yet. Be the first to claim the inaugural throne!</p>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="grid grid-cols-3 gap-2 sm:gap-8 items-end">
        {/* 2nd Place */}
        {second && (
          <div className="flex flex-col items-center">
            <button
              onClick={() => onSelect?.(second.name)}
              className="w-full flex flex-col items-center p-3 sm:p-8 rounded-2xl sm:rounded-[2.5rem] bg-white border border-[#e8eaf0] hover:border-slate-400 hover:shadow-xl transition-all duration-500 group active:scale-95"
            >
              <div className="text-[7px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 sm:mb-4">Silver / 2nd</div>
              <div className={`relative w-12 h-12 sm:w-24 sm:h-24 rounded-xl sm:rounded-3xl overflow-hidden bg-slate-50 ${RINGS[2]} group-hover:scale-110 transition-transform`}>
                <FlagImg code={second.country} size={96} />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/10 to-transparent" />
              </div>
              <div className="mt-3 sm:mt-6 text-[10px] sm:text-base font-black text-[#1a2340] truncate w-full text-center uppercase tracking-tight" title={second.name}>{second.name}</div>
              <div className="mt-1 sm:mt-2 flex items-baseline gap-0.5 sm:gap-1">
                <span className="text-sm sm:text-xl font-black text-[#1a2340]">{second.score}</span>
                <span className="text-[7px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">PTS</span>
              </div>
            </button>
          </div>
        )}

        {/* 1st Place - Elevated */}
        {first && (
          <div className="flex flex-col items-center">
            <div className="mb-2 sm:mb-6 relative">
               <div className="absolute inset-0 bg-blue-500/20 blur-2xl animate-pulse-glow" />
               <span className="relative z-10 text-3xl sm:text-7xl animate-bounce-slow flex items-center justify-center">👑</span>
            </div>
            <button
              onClick={() => onSelect?.(first.name)}
              className="w-full flex flex-col items-center p-4 sm:p-12 rounded-[1.5rem] sm:rounded-[3rem] bg-white border-2 border-[#7c3aed] shadow-2xl shadow-blue-500/20 hover:translate-y-[-8px] transition-all duration-700 group relative overflow-hidden active:scale-95"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16" />
              <div className="text-[7px] sm:text-[10px] font-black text-[#7c3aed] uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-3 sm:mb-6 leading-none text-center">1st Place</div>
              <div className={`relative w-16 h-16 sm:w-36 sm:h-36 rounded-2xl sm:rounded-[2rem] overflow-hidden bg-blue-50 ${RINGS[1]} group-hover:scale-110 transition-transform duration-700`}>
                <FlagImg code={first.country} size={144} />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/10 to-transparent" />
              </div>
              <div className="mt-4 sm:mt-8 text-xs sm:text-2xl font-black text-[#1a2340] truncate w-full text-center uppercase tracking-tighter" title={first.name}>{first.name}</div>
              <div className="mt-1 sm:mt-3 flex items-baseline gap-1 sm:gap-2">
                <span className="text-xl sm:text-4xl font-black text-[#1a2340] tracking-tighter">{first.score}</span>
                <span className="text-[7px] sm:text-[10px] font-black text-[#7c3aed] uppercase tracking-widest sm:tracking-[0.3em]">PTS</span>
              </div>
              <div className="mt-2 sm:mt-4 px-2 sm:px-4 py-1 sm:py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[#7c3aed] text-[6px] sm:text-[10px] font-black tracking-widest uppercase text-center">
                {first.totalTimeSeconds != null ? `${Number(first.totalTimeSeconds).toFixed(1)}s` : "—"}
                <span className="hidden sm:inline"> SPEED</span>
              </div>
            </button>
          </div>
        )}

        {/* 3rd Place */}
        {third && (
          <div className="flex flex-col items-center">
            <button
              onClick={() => onSelect?.(third.name)}
              className="w-full flex flex-col items-center p-3 sm:p-8 rounded-2xl sm:rounded-[2.5rem] bg-white border border-[#e8eaf0] hover:border-amber-600/50 hover:shadow-xl transition-all duration-500 group active:scale-95"
            >
              <div className="text-[7px] sm:text-[10px] font-black text-amber-700/60 uppercase tracking-widest mb-2 sm:mb-4">Bronze / 3rd</div>
              <div className={`relative w-12 h-12 sm:w-24 sm:h-24 rounded-xl sm:rounded-3xl overflow-hidden bg-amber-50 ${RINGS[3]} group-hover:scale-110 transition-transform`}>
                <FlagImg code={third.country} size={96} />
                <div className="absolute inset-0 bg-gradient-to-t from-amber-900/10 to-transparent" />
              </div>
              <div className="mt-3 sm:mt-6 text-[10px] sm:text-base font-black text-[#1a2340] truncate w-full text-center uppercase tracking-tight" title={third.name}>{third.name}</div>
              <div className="mt-1 sm:mt-2 flex items-baseline gap-0.5 sm:gap-1">
                <span className="text-sm sm:text-xl font-black text-[#1a2340]">{third.score}</span>
                <span className="text-[7px] sm:text-[9px] font-black text-amber-700/60 uppercase tracking-widest">PTS</span>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
