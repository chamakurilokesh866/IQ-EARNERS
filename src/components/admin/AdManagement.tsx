"use client"

import { useState, useEffect, useRef } from "react"

export function AdsManagement() {
  const [cfg, setCfg] = useState<any>({ enabled: false, adsenseClientId: "", adsenseSlotId: "", slots: [], popupHideOnPaths: ["/intro", "/maintenance", "/create-username", "/login", "/payment"], popupDelayMs: 5000, popupEnabled: true, globalFrequencyCap: 3 })
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newSlot, setNewSlot] = useState({ name: "", size: "728×90", page: "home" })
  const cfgRef = useRef(cfg)
  cfgRef.current = cfg

  useEffect(() => {
    fetch("/api/ads", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.data) setCfg((prev: any) => ({
          ...prev,
          ...j.data,
          popupHideOnPaths: j.data.popupHideOnPaths ?? prev.popupHideOnPaths,
          popupDelayMs: j.data.popupDelayMs ?? prev.popupDelayMs,
          popupEnabled: j.data.popupEnabled !== false,
          globalFrequencyCap: j.data.globalFrequencyCap ?? 3
        }))
      }).catch(() => { })
  }, [])

  const save = async (overrideCfg?: any) => {
    const toSave = overrideCfg ?? cfgRef.current
    setSaving(true)
    try {
      const res = await fetch("/api/ads", { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(toSave) })
      const j = await res.json().catch(() => ({}))
      if (res.ok && j.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        if (j.data) setCfg(j.data)
      } else {
        alert("Failed to save ads: " + (j.error || "Server error"))
      }
    } catch (e: any) {
      alert("Save error: " + e.message)
    }
    setSaving(false)
  }

  const updateSlot = (id: string, updates: any) => {
    setCfg((prev: any) => ({ ...prev, slots: (prev.slots ?? []).map((s: any) => s.id === id ? { ...s, ...updates } : s) }))
  }

  const updateSlotHtml = (id: string, html: string) => {
    setCfg((prev: any) => ({ ...prev, slots: (prev.slots ?? []).map((s: any) => s.id === id ? { ...s, html } : s) }))
  }

  const deleteSlot = (id: string) => {
    setCfg((prev: any) => ({ ...prev, slots: (prev.slots ?? []).filter((s: any) => s.id !== id) }))
  }

  const addSlot = () => {
    if (!newSlot.name) return
    const id = "custom_" + Date.now()
    setCfg((prev: any) => ({ ...prev, slots: [...(prev.slots ?? []), { id, name: newSlot.name, size: newSlot.size, page: newSlot.page, html: "", enabled: true }] }))
    setNewSlot({ name: "", size: "728×90", page: "home" })
    setAdding(false)
  }

  const activeCount = (cfg.slots ?? []).filter((s: any) => s.enabled && s.html?.trim()).length

  return (
    <div className="space-y-6">
      <div className="admin-card overflow-hidden bg-gradient-to-r from-navy-800 to-navy-900 border-l-4 border-primary">
        <div className="p-5 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-2xl shadow-lg">🚀</div>
            <div>
              <div className="text-sm font-bold text-white uppercase tracking-widest">Revenue Generation</div>
              <div className="text-xs text-navy-400 mt-0.5">Ad system is active with {activeCount} operational slots</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] text-navy-500 uppercase font-bold">Global Ads Toggle</div>
              <label className="relative inline-flex items-center cursor-pointer mt-1">
                <input type="checkbox" className="sr-only peer" checked={cfg.enabled} onChange={() => { const next = { ...cfg, enabled: !cfg.enabled }; setCfg(next); save(next) }} />
                <div className="w-12 h-6 bg-navy-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
              </label>
            </div>
            <button className="admin-btn admin-btn-primary px-6" onClick={() => save()} disabled={saving}>
              {saving ? "Saving..." : "Save Config"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="admin-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2"><span>📢</span> Ad Placements</h3>
              <button className="text-xs text-primary hover:underline font-bold uppercase tracking-widest" onClick={() => setAdding(!adding)}>+ New Slot</button>
            </div>
            {adding && (
              <div className="mb-6 p-4 rounded-xl bg-navy-900/50 border border-primary/20 animate-slide-down">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-[10px] text-navy-400 font-bold uppercase mb-1">Internal Name</label>
                    <input className="w-full rounded-lg bg-navy-800 border border-navy-700 px-3 py-2 text-sm" placeholder="e.g. Header Banner" value={newSlot.name} onChange={(e) => setNewSlot({ ...newSlot, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-navy-400 font-bold uppercase mb-1">Ad Size</label>
                    <select className="w-full rounded-lg bg-navy-800 border border-navy-700 px-3 py-2 text-sm" value={newSlot.size} onChange={(e) => setNewSlot({ ...newSlot, size: e.target.value })}>
                      <option>728×90</option><option>300×250</option><option>320×50</option><option>160×600</option><option>auto</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-navy-400 font-bold uppercase mb-1">Target Page</label>
                    <select className="w-full rounded-lg bg-navy-800 border border-navy-700 px-3 py-2 text-sm" value={newSlot.page} onChange={(e) => setNewSlot({ ...newSlot, page: e.target.value })}>
                      <option value="home">Home</option><option value="intro">Intro</option><option value="leaderboard">Leaderboard</option><option value="prizes">Prizes</option>
                      <option value="tournaments">Tournaments</option><option value="daily-quiz">Quiz</option><option value="user">Dashboard</option>
                      <option value="rail">Left/Right Rail</option><option value="popup">Popup</option><option value="footer">Footer</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button className="admin-btn admin-btn-ghost px-4 py-1.5 text-xs" onClick={() => setAdding(false)}>Cancel</button>
                  <button className="admin-btn admin-btn-primary px-6 py-1.5 text-xs font-bold" onClick={addSlot}>Create Slot</button>
                </div>
              </div>
            )}
            <div className="space-y-4">
              {(cfg.slots ?? []).map((slot: any) => (
                <div key={slot.id} className="group rounded-xl border border-navy-700/50 bg-navy-950/30 overflow-hidden hover:border-navy-600 transition-colors">
                  <div className="px-4 py-3 bg-navy-900/40 flex items-center justify-between border-b border-navy-800/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${slot.enabled && slot.html?.trim() ? "bg-emerald-500" : "bg-navy-700"}`} />
                      <div><span className="font-bold text-sm text-white">{slot.name}</span><span className="ml-2 text-[10px] text-navy-500-uppercase tracking-tighter">({slot.size} • {slot.page})</span></div>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer relative"><input type="checkbox" checked={slot.enabled} onChange={(e) => { updateSlot(slot.id, { enabled: e.target.checked }); setTimeout(() => save(), 100) }} className="sr-only peer" /><div className="w-8 h-4 bg-navy-800 rounded-full peer-checked:bg-emerald-600/50 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-navy-400 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4 peer-checked:after:bg-emerald-400"></div></label>
                      {slot.id.startsWith("custom_") && <button className="opacity-0 group-hover:opacity-100 text-red-500/50 hover:text-red-500 transition-opacity" onClick={() => { deleteSlot(slot.id); setTimeout(() => save(), 50) }}>🗑️</button>}
                    </div>
                  </div>
                  <div className="p-3">
                    <textarea className="w-full h-24 bg-black/40 border border-navy-800/50 rounded-lg p-3 text-xs font-mono text-emerald-500/80 outline-none" placeholder="Paste HTML/JS ad code here..." value={slot.html ?? ""} onChange={(e) => updateSlotHtml(slot.id, e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="admin-card p-6">
            <h3 className="font-bold text-sm mb-4 uppercase tracking-widest text-navy-300">Google AdSense</h3>
            <div className="space-y-4">
              <div><label className="block text-xs text-navy-500 mb-1">Client ID</label><input className="w-full rounded-lg bg-navy-800 border border-navy-700 px-3 py-2 text-sm text-white" placeholder="ca-pub-XX" value={cfg.adsenseClientId ?? ""} onChange={(e) => setCfg({ ...cfg, adsenseClientId: e.target.value })} /></div>
              <div><label className="block text-xs text-navy-500 mb-1">Default Slot ID</label><input className="w-full rounded-lg bg-navy-800 border border-navy-700 px-3 py-2 text-sm text-white" placeholder="1234" value={cfg.adsenseSlotId ?? ""} onChange={(e) => setCfg({ ...cfg, adsenseSlotId: e.target.value })} /></div>
            </div>
          </div>
          <div className="admin-card p-6">
            <h3 className="font-bold text-sm mb-4 uppercase tracking-widest text-navy-300">Preferences</h3>
            <div className="space-y-5">
              <div className="flex items-center justify-between"><div className="flex flex-col"><span className="text-xs font-bold text-navy-200">Global Popups</span><span className="text-[10px] text-navy-500">Show occasional high-CPM ads</span></div><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={cfg.popupEnabled !== false} onChange={(e) => setCfg({ ...cfg, popupEnabled: e.target.checked })} /><div className="w-10 h-5 bg-navy-800 rounded-full peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div></label></div>
              <div><label className="block text-xs font-bold text-navy-200 mb-2">Popup Hide Paths</label><input className="w-full rounded-lg bg-navy-800 border border-navy-700 px-3 py-2 text-xs text-white" placeholder="/intro, /payment" value={Array.isArray(cfg.popupHideOnPaths) ? cfg.popupHideOnPaths.join(", ") : ""} onChange={(e) => setCfg({ ...cfg, popupHideOnPaths: e.target.value.split(",").map((p: string) => p.trim()).filter(Boolean) })} /></div>
              <div className="flex gap-4">
                <div className="flex-1"><label className="block text-xs font-bold text-navy-200 mb-1">Delay (S)</label><input type="number" className="w-full rounded-lg bg-navy-800 border border-navy-700 px-3 py-2 text-xs" value={cfg.popupDelayMs / 1000 || 5} onChange={(e) => setCfg({ ...cfg, popupDelayMs: Math.max(1000, parseInt(e.target.value) * 1000) })} /></div>
                <div className="flex-1"><label className="block text-xs font-bold text-navy-200 mb-1">Freq Cap</label><input type="number" className="w-full rounded-lg bg-navy-800 border border-navy-700 px-3 py-2 text-xs" value={cfg.globalFrequencyCap || 3} onChange={(e) => setCfg({ ...cfg, globalFrequencyCap: parseInt(e.target.value) })} /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AdAnalyticsPanel() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { fetch("/api/ads/analytics", { credentials: "include" }).then((r) => r.json()).then((j) => setData(j.data ?? null)) }, [])
  if (!data) return <div className="card p-6"><div className="text-sm text-navy-300">Loading ad analytics…</div></div>
  return (
    <div className="card p-6">
      <div className="font-semibold">Ad Analytics</div>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded bg-navy-700 p-3 text-center"><div className="text-2xl font-bold">{data.totalImpressions}</div><div className="text-xs text-navy-300">Total Impressions</div></div>
        <div className="rounded bg-navy-700 p-3 text-center"><div className="text-2xl font-bold">{data.totalClicks}</div><div className="text-xs text-navy-300">Total Clicks</div></div>
        <div className="rounded bg-navy-700 p-3 text-center"><div className="text-2xl font-bold">{data.overallCtr}</div><div className="text-xs text-navy-300">CTR</div></div>
        <div className="rounded bg-navy-700 p-3 text-center"><div className="text-2xl font-bold">{data.clicksToday}</div><div className="text-xs text-navy-300">Clicks Today</div></div>
      </div>
    </div>
  )
}

export function AffiliateLinksAdmin() {
  const [links, setLinks] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [form, setForm] = useState({ title: "", description: "", url: "", imageUrl: "", category: "general", commission: "" })
  const [saving, setSaving] = useState(false)
  const load = () => {
    fetch("/api/affiliate-links", { credentials: "include" }).then((r) => r.json()).then((j) => setLinks(j.data ?? []))
    fetch("/api/affiliate-links/analytics", { credentials: "include" }).then((r) => r.json()).then((j) => setAnalytics(j.data ?? null))
  }
  useEffect(load, [])
  const add = async () => {
    if (!form.title || !form.url) return
    setSaving(true)
    await fetch("/api/affiliate-links", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(form) })
    setForm({ title: "", description: "", url: "", imageUrl: "", category: "general", commission: "" }); setSaving(false); load()
  }
  return (
    <div className="space-y-4">
      {analytics && (
        <div className="card p-6">
          <div className="font-semibold text-lg">Affiliate Performance</div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded bg-navy-700 p-3 text-center"><div className="text-2xl font-bold">{analytics.totalClicks}</div><div className="text-xs text-navy-300">Total Clicks</div></div>
            <div className="rounded bg-navy-700 p-3 text-center"><div className="text-2xl font-bold">{analytics.clicksToday}</div><div className="text-xs text-navy-300">Today</div></div>
          </div>
        </div>
      )}
      <div className="card p-6">
        <div className="font-semibold">Add Affiliate Link</div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="admin-form-field" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="admin-form-field" placeholder="URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
        </div>
        <button className="admin-btn admin-btn-primary mt-3" onClick={add} disabled={saving}>{saving ? "Adding…" : "Add Link"}</button>
      </div>
      <div className="card p-6">
        <div className="font-semibold">Active Links ({links.length})</div>
        <div className="mt-3 space-y-2">
          {links.map((l: any) => (
            <div key={l.id} className="flex items-center justify-between rounded bg-navy-700 p-3">
              <div className="flex-1 min-w-0"><div className="font-medium text-sm truncate">{l.title}</div><div className="text-xs text-navy-400 truncate">{l.url}</div></div>
              <button className="admin-btn admin-btn-danger text-xs ml-3" onClick={async () => { await fetch(`/api/affiliate-links?id=${l.id}`, { method: "DELETE", credentials: "include" }); load() }}>Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
