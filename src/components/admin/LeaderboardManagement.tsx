"use client"

import { useState, useEffect, useCallback } from "react"

export function LeaderboardManagement() {
  const [players, setPlayers] = useState<any[]>([])
  const [tournaments, setTournaments] = useState<any[]>([])
  const [name, setName] = useState("")
  const [score, setScore] = useState(0)
  useEffect(() => {
    fetch("/api/leaderboard").then(r => r.ok ? r.json() : { data: [] }).then((j) => setPlayers(j.data ?? [])).catch(() => {})
    fetch("/api/tournaments").then(r => r.ok ? r.json() : { data: [] }).then((j) => setTournaments(j.data ?? [])).catch(() => {})
  }, [])
  const add = async () => {
    if (!name.trim() || Number.isNaN(score)) return
    const res = await fetch("/api/leaderboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ item: { name, score } }) })
    if (res.ok) {
      fetch("/api/leaderboard").then(r => r.json()).then(j => setPlayers(j.data ?? []))
      setName(""); setScore(0)
    }
  }
  return (
    <div className="card p-6">
      <div className="font-semibold">Leaderboard Management</div>
      <div className="mt-3 flex items-center gap-3">
        <input className="admin-form-field" placeholder="Player name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="admin-form-field" type="number" placeholder="Score" value={score} onChange={(e) => setScore(Number(e.target.value))} />
        <button className="admin-btn admin-btn-primary" onClick={add}>Add Player</button>
      </div>
      <ul className="mt-4 space-y-2">
        {players.map((p, idx) => (
          <li key={idx} className="flex items-center justify-between rounded bg-navy-700 p-3">
            <span className="font-medium">{p.name}</span>
            <div className="flex items-center gap-3">
              <div className="text-primary font-semibold">{p.score}</div>
              <button className="admin-btn admin-btn-danger text-xs" onClick={() => fetch(`/api/leaderboard/${p.id}`, { method: "DELETE", credentials: "include" }).then(() => fetch("/api/leaderboard").then(r => r.ok ? r.json() : { data: [] }).then(j => setPlayers(j.data ?? []))).catch(() => {})}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-6 border-t border-navy-700 pt-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-bold text-red-400 text-sm">Dangerous Actions</div>
            <p className="text-[10px] text-navy-400 mt-1 uppercase tracking-widest font-black">Destructive</p>
          </div>
          <button
            onClick={async () => {
              if (confirm("Are you sure? This will delete ALL completions and reset the leaderboard for everyone.")) {
                const res = await fetch("/api/admin/quiz/clear-completions", { 
                  method: "POST", 
                  headers: { "Content-Type": "application/json" }, 
                  body: JSON.stringify({ all: true }) 
                })
                if (res.ok) {
                  fetch("/api/leaderboard").then(r => r.ok ? r.json() : { data: [] }).then(j => setPlayers(j.data ?? [])).catch(() => {})
                  alert("Leaderboard and completions cleared successfully.")
                }
              }
            }}
            className="admin-btn admin-btn-danger text-xs px-4 py-2 font-black uppercase tracking-widest"
          >
            🗑️ Reset All
          </button>
        </div>
      </div>
    </div>
  )
}

export function ReferralsAdmin() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const r = await fetch("/api/admin/referrals/stats", { credentials: "include" })
        const ct = r.headers.get("content-type") ?? ""
        if (!r.ok || !ct.includes("application/json")) {
          if (!cancelled) setStats(null)
          return
        }
        const j = await r.json()
        if (!cancelled) setStats(j.data ?? null)
      } catch {
        if (!cancelled) setStats(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])
  return (
    <div className="admin-card p-6">
      <div className="font-semibold">Referral & Affiliate System</div>
      {stats && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded bg-navy-700 p-3 text-center"><div className="text-2xl font-bold">{stats.totalReferrals}</div><div className="text-[10px] text-navy-400">Total Referrals</div></div>
          <div className="rounded bg-navy-700 p-3 text-center"><div className="text-2xl font-bold">₹{stats.totalEarnings}</div><div className="text-[10px] text-navy-400">Total Payouts</div></div>
        </div>
      )}
    </div>
  )
}

export function CertificateManagement() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    fetch("/api/admin/certificates", { cache: "no-store", credentials: "include" })
      .then(r => r.ok ? r.json() : { data: [] }).then(j => setItems(Array.isArray(j?.data) ? j.data : [])).catch(() => {})
  }, [])
  return (
    <div className="admin-card p-6">
      <div className="font-semibold text-lg">📜 Certificate Management</div>
      <p className="text-sm text-navy-400 mt-1">Manage and view certificates issued to quiz winners.</p>
      <div className="mt-4 space-y-3">
        {items.map((x: any) => (
          <div key={x.id} className="flex items-center justify-between rounded-xl bg-navy-700/80 p-4 border border-navy-600">
            <div>
              <div className="font-bold text-white">{x.username}</div>
              <div className="text-xs text-navy-300">Prize: {x.prizeTitle} · Issued: {new Date(x.createdAt).toLocaleDateString()}</div>
            </div>
            <a href={`/certificate/${x.id}`} target="_blank" className="admin-btn admin-btn-ghost text-xs">View</a>
          </div>
        ))}
      </div>
    </div>
  )
}

export function QuizSchedulerPanel() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [title, setTitle] = useState("")
  const [releaseAt, setReleaseAt] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState("")
  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch("/api/admin/quiz-schedule", { cache: "no-store", credentials: "include" })
    const j = await r.json().catch(() => ({ data: [] }))
    setItems(Array.isArray(j?.data) ? j.data : [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !releaseAt) { setError("Title, file and date are required"); return }
    setUploading(true)
    const fd = new FormData()
    fd.append("pdf", file)
    fd.append("title", title || "Quiz Material")
    fd.append("releaseAt", releaseAt)
    const r = await fetch("/api/admin/quiz-schedule", { method: "POST", credentials: "include", body: fd })
    if (r.ok) { setTitle(""); setReleaseAt(""); setFile(null); load() }
    else setError("Failed to schedule")
    setUploading(false)
  }
  return (
    <div className="space-y-6">
      <div className="admin-card p-6">
        <div className="font-semibold text-lg">📅 Quiz Scheduler</div>
        <form onSubmit={onSubmit} className="mt-6 space-y-4 max-w-xl">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full px-3 py-2 rounded-lg bg-navy-800 border border-navy-600 text-white" />
          <input type="datetime-local" value={releaseAt} onChange={(e) => setReleaseAt(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-navy-800 border border-navy-600 text-white" />
          <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm" />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={uploading} className="admin-btn admin-btn-primary">{uploading ? "Uploading…" : "Schedule"}</button>
        </form>
      </div>
      <div className="admin-card p-6">
        <div className="font-semibold">Scheduled Items</div>
        <ul className="mt-4 space-y-2">
          {items.map((x: any) => (
            <li key={x.id} className="flex items-center justify-between rounded-lg bg-navy-700/80 p-3 border border-navy-600">
              <span className="font-medium">{x.title || "Untitled"}</span>
              <button onClick={async () => { await fetch(`/api/admin/quiz-schedule?id=${x.id}`, { method: "DELETE" }); load() }} className="admin-btn admin-btn-danger text-xs">Delete</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
