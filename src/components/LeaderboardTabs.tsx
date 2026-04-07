"use client"

import { useState } from "react"

type Tab = "Daily" | "Weekly" | "Tournament" | "All-Time"

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "Daily", label: "Daily", icon: "📅" },
  { id: "Weekly", label: "Weekly", icon: "📆" },
  { id: "Tournament", label: "Tournament", icon: "🏆" },
  { id: "All-Time", label: "All-Time", icon: "🌟" }
]

export default function LeaderboardTabs() {
  const [tab, setTab] = useState<Tab>("All-Time")

  return (
    <div className="flex flex-wrap gap-3">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          className={`h-12 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 flex items-center shadow-sm ${
            tab === t.id
              ? "bg-[#7c3aed] text-white shadow-blue-500/20"
              : "bg-white border border-[#e8eaf0] text-[#64748b] hover:border-[#7c3aed] hover:text-[#7c3aed] hover:translate-y-[-2px]"
          }`}
        >
          <span className="mr-3 text-lg">{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  )
}
