"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import dynamic from "next/dynamic"

const AdminSystem = dynamic(() => import("../AdminSystem"), { ssr: false })

export function BackupPanel() {
  const [status, setStatus] = useState<string>("")
  const run = async () => {
    setStatus("Running…")
    const res = await fetch("/api/backup", { method: "POST" })
    if (res.ok) {
      const j = await res.json()
      setStatus(`Backup created: ${j.path}`)
    } else {
      setStatus("Backup failed")
    }
  }
  return (
    <div className="card p-6">
      <div className="font-semibold">Data Backup</div>
      <div className="mt-2 text-sm text-navy-300">Create a snapshot of all JSON data with rotation policy.</div>
      <div className="mt-3 flex items-center gap-3">
        <button className="admin-btn admin-btn-primary" onClick={run}>Backup Now</button>
        {status && <span className="text-xs text-success">{status}</span>}
      </div>
    </div>
  )
}

export function BroadcastNoticePanel() {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [url, setUrl] = useState("")
  const [status, setStatus] = useState<string>("")
  const [alsoPush, setAlsoPush] = useState(true)
  const send = async () => {
    if (!title.trim()) { setStatus("Enter a title"); return }
    setStatus("Sending…")
    try {
      const res = await fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: title.trim(), body: body.trim() || undefined, url: url.trim() || undefined })
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setStatus(`Failed: ${j.error ?? res.status}`); return }
      if (alsoPush) {
        const pushRes = await fetch("/api/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title: title.trim(), body: body.trim() || "Tap to view", url: url.trim() || "/home" })
        })
        const pushJ = await pushRes.json().catch(() => ({}))
        if (pushRes.ok && pushJ?.sent != null) setStatus(`Notice saved & push sent to ${pushJ.sent} users`)
        else setStatus(`Notice saved. Push: ${pushJ?.error ?? "not configured"}`)
      } else setStatus("Notice sent to all users (in-app banner)")
      setTitle(""); setBody(""); setUrl("")
      setTimeout(() => setStatus(""), 5000)
    } catch (e: any) { setStatus(`Error: ${e?.message ?? "Failed"}`) }
  }
  return (
    <div className="card p-6 border-accent/30">
      <div className="font-semibold">Broadcast Notice to All Users</div>
      <p className="mt-1 text-sm text-navy-300">Type your message and send. Users will see it as a banner when they visit.</p>
      <input className="mt-4 w-full admin-form-field" placeholder="Notice title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="mt-2 w-full admin-form-field" rows={3} placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} />
      <input className="mt-2 w-full admin-form-field" placeholder="Link URL" value={url} onChange={(e) => setUrl(e.target.value)} />
      <div className="mt-3 flex items-center gap-3">
        <label className="flex items-center gap-2"><input type="checkbox" checked={alsoPush} onChange={(e) => setAlsoPush(e.target.checked)} /><span>Also push notification</span></label>
        <button className="admin-btn admin-btn-primary" onClick={send}>Send to All</button>
      </div>
      {status && <p className="mt-2 text-sm text-navy-300">{status}</p>}
    </div>
  )
}

export function BroadcastEmailPanel() {
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [status, setStatus] = useState<string>("")
  const [sending, setSending] = useState(false)
  const send = async () => {
    if (!subject.trim() || !body.trim()) { setStatus("Enter subject and body"); return }
    setSending(true); setStatus("Sending…")
    try {
      const res = await fetch("/api/admin/email-broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subject: subject.trim(), body: body.trim() })
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.ok) setStatus(`Failed: ${j?.error ?? res.status}`)
      else { setStatus(`Email sent to ${j.sent ?? 0} users`); setSubject(""); setBody("") }
    } catch (e: any) { setStatus(`Error: ${e?.message ?? "Failed"}`) }
    finally { setSending(false); setTimeout(() => setStatus(""), 6000) }
  }
  return (
    <div className="card p-6 border-primary/30">
      <div className="font-semibold">Broadcast Email to All Users</div>
      <input className="mt-4 w-full admin-form-field" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <textarea className="mt-2 w-full admin-form-field" rows={4} placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} />
      <button className="admin-btn admin-btn-primary mt-3" onClick={send} disabled={sending}>{sending ? "Sending…" : "Send Email"}</button>
      {status && <span className="ml-3 text-xs text-navy-300">{status}</span>}
    </div>
  )
}

export function PushPanel() {
  const [status, setStatus] = useState<string>("")
  const send = async () => {
    setStatus("Sending…")
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updates Available", body: "Check the latest quizzes!", url: "/home" })
      })
      if (res.ok) { const j = await res.json(); setStatus(`Sent to ${j.sent ?? 0} devices`) }
      else setStatus("Failed")
    } catch { setStatus("Error") }
  }
  return (
    <div className="card p-6">
      <div className="font-semibold">Push Notifications</div>
      <button className="admin-btn admin-btn-primary mt-3" onClick={send}>Send Push Notification</button>
      {status && <span className="ml-3 text-xs text-success">{status}</span>}
    </div>
  )
}

export { AdminSystem }

export function SponsorsAdminCard() {
  const [sponsors, setSponsors] = useState<any[]>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: "", logo: "", url: "" })
  const load = useCallback(() => {
    fetch("/api/admin/sponsors", { credentials: "include" }).then(r => r.ok ? r.json() : { data: [] }).then(j => setSponsors(j.data ?? [])).catch(() => {})
  }, [])
  useEffect(load, [load])
  const save = async () => {
    if (!form.name || !form.logo) return
    await fetch("/api/admin/sponsors", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(form) })
    setForm({ name: "", logo: "", url: "" }); setAdding(false); load()
  }
  return (
    <div className="admin-card p-6">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Partners & Sponsors</div>
        <button onClick={() => setAdding(!adding)} className="admin-btn admin-btn-ghost text-xs tracking-widest">{adding ? "Cancel" : "+ Add Partner"}</button>
      </div>
      {adding && (
        <div className="mt-4 space-y-3 p-4 bg-navy-900/50 rounded-xl">
          <input className="input-glass w-full rounded px-3 py-2 text-sm" placeholder="Partner Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className="input-glass w-full rounded px-3 py-2 text-sm" placeholder="Logo URL" value={form.logo} onChange={e => setForm({ ...form, logo: e.target.value })} />
          <input className="input-glass w-full rounded px-3 py-2 text-sm" placeholder="Website URL" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
          <button onClick={save} className="admin-btn admin-btn-primary w-full">Save Partner</button>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-4">
        {sponsors.map((s, idx) => (
          <div key={idx} className="flex items-center gap-3 bg-navy-800/80 rounded-xl px-4 py-2 border border-navy-700 hover:border-primary/30 transition-all group">
            <img src={s.logo} alt={s.name} className="w-8 h-8 object-contain" />
            <span className="text-sm font-semibold text-white">{s.name}</span>
            <button onClick={async () => { await fetch(`/api/admin/sponsors?id=${s.id}`, { method: "DELETE", credentials: "include" }); load() }} className="opacity-0 group-hover:opacity-100 text-xs text-red-500 transition-opacity">✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}
