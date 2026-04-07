"use client"

import { useEffect, useState, useCallback } from "react"

type RequestState = {
  active: { id: string; targetUsername: string; message: string; status: string; createdAt: number; rank?: number } | null
  pendingNext: { targetUsername: string; message: string; rank?: number } | null
  history: Array<{
    id: string
    targetUsername: string
    message: string
    status: string
    upiId?: string
    action?: string
    respondedAt?: number
  }>
}

export default function UpiRequestPanel() {
  const [data, setData] = useState<RequestState | null>(null)
  const [targetUsername, setTargetUsername] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [players, setPlayers] = useState<Array<{ name: string; score: number; rank?: number }>>([])
  const [collapsed, setCollapsed] = useState(false)

  const load = useCallback(async () => {
    const [r1, r2] = await Promise.all([
      fetch("/api/admin/upi-request", { cache: "no-store", credentials: "include" }),
      fetch("/api/leaderboard", { cache: "no-store", credentials: "include" })
    ])
    const j1 = await r1.json().catch(() => ({}))
    const j2 = await r2.json().catch(() => ({}))
    if (j1?.ok && j1?.data) setData(j1.data)
    if (j2?.ok && Array.isArray(j2.data)) setPlayers(j2.data)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSend = async () => {
    const user = targetUsername.trim()
    const msg = message.trim()
    if (!user || !msg) {
      setError("Username and message required")
      return
    }
    setLoading(true)
    setError("")
    try {
      const r = await fetch("/api/admin/upi-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUsername: user, message: msg }),
        credentials: "include"
      })
      const j = await r.json()
      if (j?.ok) {
        setTargetUsername("")
        setMessage("")
        load()
      } else {
        setError(j?.error ?? "Failed")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSendToNext = async () => {
    setLoading(true)
    setError("")
    try {
      const r = await fetch("/api/admin/upi-request/send-next", { method: "POST", credentials: "include" })
      const j = await r.json()
      if (j?.ok) load()
      else setError(j?.error ?? "Failed")
    } finally {
      setLoading(false)
    }
  }

  const handleClear = async (what: "active" | "pending" | "both" | "history") => {
    setLoading(true)
    setError("")
    try {
      const r = await fetch("/api/admin/upi-request/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ what }),
        credentials: "include"
      })
      if (r.ok) load()
    } finally {
      setLoading(false)
    }
  }

  const topPlayer = players.length ? players[0]?.name : ""
  const nextRank = data?.pendingNext?.rank ?? 2

  const handleReset = async () => {
    if (!confirm("Reset leaderboard, participants & enrollments? This starts the next round. Only do after prize is completed.")) return
    setLoading(true)
    setError("")
    try {
      const r = await fetch("/api/admin/reset", { method: "POST" })
      const j = await r.json().catch(() => ({}))
      if (j?.ok) {
        load()
      } else {
        setError(j?.error ?? "Failed")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-card admin-card-accent p-6 border-primary/20 relative animate-upi-slide">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-lg">UPI Request (1st Place Prize)</div>
          <p className="mt-1 text-sm text-navy-400">Send to leaderboard rank 1. Next = 2nd position from top (by score).</p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-2 hover:bg-navy-700 transition-colors"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? "⊕" : "✕"}
        </button>
      </div>

      {!collapsed && (
        <>
          {!data?.active && (
            <div className="mt-4 space-y-3 animate-upi-slide">
              <div>
                <label className="block text-sm text-navy-300 mb-1">Username (rank 1 from leaderboard)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={topPlayer ? `e.g. ${topPlayer}` : "Enter username"}
                    value={targetUsername}
                    onChange={(e) => { setTargetUsername(e.target.value); setError("") }}
                    className="flex-1 rounded-lg bg-navy-700 px-4 py-2 border border-navy-600 focus:border-primary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => topPlayer && setTargetUsername(topPlayer)}
                    disabled={!topPlayer || loading}
                    className="pill bg-accent/20 border border-accent/50 text-accent hover:bg-accent/30 text-sm font-medium shrink-0"
                    title="Use leaderboard rank 1"
                  >
                    Use Rank 1
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-navy-300 mb-1">Message (asking for UPI ID)</label>
                <textarea
                  rows={2}
                  placeholder="Congratulations! You are #1. Please share your UPI ID to receive the prize."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-lg bg-navy-700 px-4 py-2 border border-navy-600 focus:border-primary transition-colors"
                />
              </div>
              <button onClick={handleSend} disabled={loading} className="pill bg-primary hover:scale-[1.02] active:scale-[0.98] transition-transform">
                {loading ? "Sending…" : "Send to User"}
              </button>
            </div>
          )}

          {data?.active && (
            <div className="mt-4 rounded-lg bg-navy-700/80 p-4 border border-navy-600 animate-upi-slide relative">
              <button
                type="button"
                onClick={() => handleClear("active")}
                className="absolute top-2 right-2 rounded p-1.5 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                title="Cancel active request"
              >
                ✕
              </button>
              <div className="font-medium text-primary">Active: {data.active.targetUsername} {data.active.rank ? `(Rank ${data.active.rank})` : ""}</div>
              <p className="mt-1 text-sm text-navy-300">{data.active.message}</p>
              <p className="mt-2 text-xs text-navy-400">Waiting for user response...</p>
              <button onClick={() => handleClear("active")} className="mt-2 pill bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm">
                Delete / Cancel
              </button>
            </div>
          )}

          {data?.pendingNext && (
            <div className="mt-4 rounded-lg bg-accent/20 border border-accent/40 p-4 animate-upi-slide animate-upi-pulse relative">
              <button
                type="button"
                onClick={() => handleClear("pending")}
                className="absolute top-2 right-2 rounded p-1.5 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                title="Dismiss"
              >
                ✕
              </button>
              <div className="font-semibold text-accent">User passed. Next = Rank {nextRank} (2nd from top): {data.pendingNext.targetUsername}</div>
              <p className="mt-1 text-sm text-navy-300">{data.pendingNext.message}</p>
              <div className="mt-3 flex gap-2">
                <button onClick={handleSendToNext} disabled={loading} className="pill bg-primary text-black font-semibold hover:scale-[1.02] active:scale-[0.98] transition-transform">
                  {loading ? "Sending…" : "Send to Next User"}
                </button>
                <button onClick={() => handleClear("pending")} className="pill bg-navy-700 hover:bg-red-500/20 text-red-400 text-sm">
                  Delete
                </button>
              </div>
            </div>
          )}

          {data?.history && data.history.length > 0 && (
            <div className="mt-6 animate-upi-slide">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">Recent responses</div>
                <button onClick={() => handleClear("history")} className="pill bg-navy-700 hover:bg-red-500/20 text-red-400 text-xs">
                  Delete all
                </button>
              </div>
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {data.history.slice(0, 10).map((h) => (
                  <li key={h.id} className="rounded-lg bg-navy-700/80 p-3 border border-navy-600 text-sm animate-upi-slide hover:border-navy-500 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{h.targetUsername}</span>
                      <span className={`pill ${h.status === "completed" ? "bg-success/20 text-success" : "bg-navy-600"}`}>
                        {h.status === "completed" ? "Sent UPI" : "Passed"}
                      </span>
                    </div>
                    <p className="mt-1 text-navy-300">{h.message}</p>
                    {h.upiId && (
                      <p className="mt-2">
                        UPI ID: <span className="font-bold text-primary bg-primary/20 px-2 py-0.5 rounded animate-upi-pulse">{h.upiId}</span>
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={load} className="pill bg-navy-700 text-sm hover:scale-[1.02] transition-transform">Refresh</button>
            <button onClick={handleReset} disabled={loading} className="pill bg-amber-600 text-black text-sm hover:scale-[1.02] transition-transform font-semibold" title="After prize sent: reset leaderboard & start next round">Complete Prize & Reset</button>
          </div>
        </>
      )}
    </div>
  )
}
