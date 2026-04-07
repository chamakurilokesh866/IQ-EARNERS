"use client"

import { useEffect, useMemo, useState } from "react"
import type { AlertItem } from "../utils/admin"

export default function AdminAlerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"All" | "info" | "warning" | "critical">("All")

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch("/api/admin/security-alerts", { cache: "no-store", credentials: "include" })
        const j = await r.json().catch(() => ({ data: [] }))
        const data = Array.isArray(j?.data) ? j.data : []
        setAlerts(data)
      } catch {
        setAlerts([])
      } finally {
        setLoading(false)
      }
    }
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [])
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set())
  const filtered = useMemo(() => {
    let list = filter === "All" ? alerts : alerts.filter((a) => a.severity === filter)
    list = list.filter((a) => !resolvedIds.has(a.id))
    return list
  }, [alerts, filter, resolvedIds])
  const markResolved = (id: string) => setResolvedIds((prev) => new Set(prev).add(id))
  const color = (sev: string) =>
    sev === "critical" ? "bg-primary" : sev === "warning" ? "bg-accent text-black" : "bg-navy-700"

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="font-semibold">Alerts</div>
        <div className="text-sm text-navy-400">Loading security alerts…</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Security Alerts</div>
        <div className="flex items-center gap-2">
          {(["All", "info", "warning", "critical"] as const).map((t) => (
            <button key={t} onClick={() => setFilter(t)} className={`pill ${filter === t ? "bg-primary" : "bg-navy-700"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="text-sm text-navy-400">No security alerts at the moment.</div>
      ) : (
      <ul className="space-y-3">
        {filtered.map((a) => (
          <li key={a.id} className="card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`pill ${color(a.severity)}`}>{a.severity}</span>
                <div className="font-semibold">{a.title}</div>
              </div>
              <div className="text-xs text-navy-300">{a.time}</div>
            </div>
            <div className="mt-2 text-sm text-navy-300">{a.desc}</div>
            <div className="mt-3 flex items-center gap-3">
              <span className={`pill ${a.status === "open" ? "bg-navy-700" : "bg-success text-black"}`}>{a.status}</span>
              {a.status === "open" && (
                <button className="rounded bg-primary px-3 py-1 text-sm" onClick={() => markResolved(a.id)}>Dismiss</button>
              )}
            </div>
          </li>
        ))}
      </ul>
      )}
    </div>
  )
}
