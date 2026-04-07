"use client"

import { useState, useEffect, useCallback } from "react"

export default function PrizeManagement() {
  const [items, setItems] = useState<any[]>([])
  const [tournaments, setTournaments] = useState<any[]>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ title: "", description: "", image: "", value: "₹", tournamentId: "", category: "Mega" })
  const load = useCallback(() => {
    fetch("/api/prizes", { credentials: "include" }).then((r) => r.json()).then((j) => setItems(j.data ?? []))
    fetch("/api/tournaments", { credentials: "include" }).then((r) => r.json()).then((j) => setTournaments(j.data ?? []))
  }, [])
  useEffect(load, [load])
  const save = async () => {
    if (!form.title) return
    const res = await fetch("/api/prizes", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ item: form }) })
    if (res.ok) { setForm({ title: "", description: "", image: "", value: "₹", tournamentId: "", category: "Mega" }); setAdding(false); load() }
  }
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-lg">Prize Management</div>
        <button className="admin-btn admin-btn-primary" onClick={() => setAdding(!adding)}>{adding ? "Cancel" : "+ Add Prize"}</button>
      </div>
      {adding && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-navy-700/50 rounded-xl">
          <input className="input-glass rounded px-3 py-2 text-sm" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="input-glass rounded px-3 py-2 text-sm" placeholder="Value (e.g. ₹5,000)" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          <input className="input-glass rounded px-3 py-2 text-sm col-span-2" placeholder="Image URL" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
          <select className="input-glass rounded px-3 py-2 text-sm" value={form.tournamentId} onChange={(e) => setForm({ ...form, tournamentId: e.target.value })}>
            <option value="">— Link to Tournament —</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
          <button className="admin-btn admin-btn-primary col-span-2 mt-2" onClick={save}>Save Prize</button>
        </div>
      )}
      <div className="mt-6 space-y-3">
        {items.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-xl bg-navy-700/80 p-4 border border-navy-600">
            <div className="flex items-center gap-4">
              {p.image && <img src={p.image} className="w-12 h-12 rounded object-cover" />}
              <div><div className="font-bold">{p.title}</div><div className="text-xs text-navy-400">{p.value} · {p.category}</div></div>
            </div>
            <button className="admin-btn admin-btn-danger text-xs" onClick={async () => { await fetch(`/api/prizes/${p.id}`, { method: "DELETE", credentials: "include" }); load() }}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  )
}
