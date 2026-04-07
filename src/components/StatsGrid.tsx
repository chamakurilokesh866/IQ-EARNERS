"use client"
import { useEffect, useState } from "react"

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-navy-700">{icon}</span>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm text-navy-300">{label}</div>
        </div>
      </div>
    </div>
  )
}

export default function StatsGrid() {
  const [stats, setStats] = useState<{ enrolled: number; capacity: number; prizePool: string; questions: number; duration: string } | null>(null)
  const [liveCount, setLiveCount] = useState<number>(0)
  useEffect(() => {
    fetch("/api/tournaments", { cache: "no-store" }).then((r) => r.json()).then((j) => {
      const t = Array.isArray(j?.data) && j.data.length ? j.data[j.data.length - 1] : null
      if (t) setStats({ enrolled: t.enrolled ?? 0, capacity: t.capacity ?? 0, prizePool: t.prizePool ?? "₹0", questions: t.questions ?? 0, duration: t.duration ?? "" })
    }).catch(() => setStats(null))
    fetch("/api/participants", { cache: "no-store" }).then((r) => r.json()).then((j) => setLiveCount(Array.isArray(j?.data) ? j.data.length : 0)).catch(() => setLiveCount(0))
  }, [])
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <Stat icon="👥" label="Total Enrolled" value={stats ? `${stats.enrolled}` : "0"} />
      <Stat icon="📦" label="Capacity" value={stats ? `${stats.capacity}` : "0"} />
      <Stat icon="🟢" label="Live Participants" value={`${liveCount}`} />
    </div>
  )
}
