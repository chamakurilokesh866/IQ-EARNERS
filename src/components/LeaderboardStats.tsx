"use client"

import { useEffect, useState } from "react"

const STAT_ICONS: Record<string, string> = {
  totalPlayers: "👥",
  prizesCount: "💎",
  quizzesCount: "📝",
  averageScore: "🎯",
  activeToday: "⚡"
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="group rounded-2xl border border-[#e8eaf0] bg-[#f8fafc] p-4 sm:p-6 transition-all duration-300 hover:border-[#7c3aed] hover:bg-white hover:shadow-xl hover:shadow-blue-500/5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl sm:text-3xl group-hover:scale-125 transition-transform duration-500 ease-out">{icon}</span>
        <div className="w-8 h-1 bg-blue-500/10 rounded-full group-hover:bg-blue-500/30 transition-colors" />
      </div>
      <div>
        <div className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.2em] mb-1">{label}</div>
        <div className="text-2xl sm:text-3xl font-black text-[#1a2340] tabular-nums tracking-tighter">{value}</div>
      </div>
    </div>
  )
}

export default function LeaderboardStats() {
  const [stats, setStats] = useState<{ totalPlayers: number; prizesCount: number; quizzesCount: number; averageScore: number; activeToday?: number } | null>(null)
  
  useEffect(() => {
    fetch("/api/stats/public", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setStats(j.data))
      .catch(() => setStats(null))
  }, [])

  const items = [
    { key: "totalPlayers", label: "Players", value: String(stats?.totalPlayers ?? "0"), icon: STAT_ICONS.totalPlayers },
    { key: "prizesCount", label: "Prizes", value: String(stats?.prizesCount ?? "0"), icon: STAT_ICONS.prizesCount },
    { key: "quizzesCount", label: "Quizzes", value: String(stats?.quizzesCount ?? "0"), icon: STAT_ICONS.quizzesCount },
    { key: "averageScore", label: "Avg Score", value: String(stats?.averageScore ?? "0"), icon: STAT_ICONS.averageScore },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 stagger-reveal">
      {items.map((item) => (
        <div key={item.key} className="lb-stat-item stagger-item">
          <StatCard label={item.label} value={item.value} icon={item.icon} />
        </div>
      ))}
    </div>
  )
}
