"use client"

import { useState, useEffect, useCallback } from "react"
import { adminGetJsonArray } from "@/lib/admin/client"
import type { SecurityEvent, SecurityEventType } from "@/lib/securityEventTypes"

const TYPE_LABEL: Record<SecurityEventType, string> = {
  webhook_invalid_signature: "Invalid webhook signature",
  webhook_replay: "Webhook replay / stale timestamp",
  webhook_unauthorized: "Webhook unauthorized",
  verify_order_denied: "Verify order denied",
  rate_limit: "Rate limit",
  admin_ip_blocked: "Admin IP blocked"
}

export default function SecurityEventsPanel() {
  const [items, setItems] = useState<SecurityEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState("")
  const [type, setType] = useState("")
  const load = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    p.set("limit", "300")
    if (q.trim()) p.set("q", q.trim())
    if (type) p.set("type", type)
    const rows = await adminGetJsonArray<SecurityEvent>(`/api/admin/security-events?${p.toString()}`)
    setItems(rows)
    setLoading(false)
  }, [q, type])
  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="admin-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-black text-lg text-white">Security &amp; ops</div>
          <p className="text-xs text-navy-400 mt-1 max-w-xl">
            Recent webhook verification failures, verify-order denials, rate-limit hits, and related events (server log file, capped).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/admin/security-events?format=csv${type ? `&type=${encodeURIComponent(type)}` : ""}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""}`}
            className="admin-btn admin-btn-ghost-dark text-xs py-1.5 px-3"
          >
            Export CSV
          </a>
          <button type="button" onClick={load} className="admin-btn admin-btn-ghost-dark text-xs py-1.5 px-3" disabled={loading}>
            {loading ? "…" : "Refresh"}
          </button>
        </div>
      </div>
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search ip/path/detail..."
          className="admin-input md:col-span-2"
        />
        <select value={type} onChange={(e) => setType(e.target.value)} className="admin-input">
          <option value="">All types</option>
          {Object.entries(TYPE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <ul className="space-y-2 max-h-[min(520px,70vh)] overflow-y-auto font-mono text-xs">
        {items.map((ev, i) => (
          <li key={`${ev.t}-${i}`} className="rounded-xl bg-white/[0.03] p-3 border border-white/5 text-left">
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-white/90">
              <span className="text-navy-500 shrink-0">{new Date(ev.t).toLocaleString()}</span>
              <span className="text-amber-300/90 font-semibold">{TYPE_LABEL[ev.type] ?? ev.type}</span>
              {ev.ip && <span className="text-navy-400">ip {ev.ip}</span>}
              {ev.path && <span className="text-navy-500 truncate">{ev.path}</span>}
            </div>
            {ev.detail && Object.keys(ev.detail).length > 0 && (
              <pre className="mt-2 text-[11px] text-navy-500 whitespace-pre-wrap break-all">{JSON.stringify(ev.detail, null, 0)}</pre>
            )}
          </li>
        ))}
        {!items.length && !loading && <li className="text-navy-400 text-sm py-8 text-center">No events recorded yet</li>}
      </ul>
    </div>
  )
}
