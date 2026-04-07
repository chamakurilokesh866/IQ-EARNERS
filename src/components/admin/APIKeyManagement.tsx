"use client"

import { useState, useEffect, useCallback } from "react"
import { adminFetch, adminGetJsonArray } from "@/lib/admin/client"

type APIKey = {
  id: string
  name: string
  key: string
  orgId?: string
  orgName?: string
  permissions: string[]
  rateLimit: number
  requestsToday: number
  requestsMonth: number
  active: boolean
  createdAt: string
  lastUsedAt?: string
  expiresAt?: string
}

type WebhookEndpoint = {
  id: string
  url: string
  events: string[]
  active: boolean
  secret: string
  failureCount: number
  lastTriggeredAt?: string
}

const PERMISSIONS = [
  { key: "quiz:read", label: "Read Quizzes", desc: "Access quiz data & questions" },
  { key: "quiz:write", label: "Create Quizzes", desc: "Create and modify quizzes" },
  { key: "user:read", label: "Read Users", desc: "Access user profiles & scores" },
  { key: "user:write", label: "Manage Users", desc: "Create/update user accounts" },
  { key: "leaderboard:read", label: "Read Leaderboard", desc: "Access rankings data" },
  { key: "analytics:read", label: "Read Analytics", desc: "Access performance metrics" },
  { key: "certificate:read", label: "Read Certificates", desc: "Access certificate data" },
  { key: "certificate:write", label: "Issue Certificates", desc: "Generate certificates" },
  { key: "tournament:read", label: "Read Tournaments", desc: "Access tournament data" },
  { key: "tournament:write", label: "Manage Tournaments", desc: "Create/manage events" },
]

const WEBHOOK_EVENTS = [
  "quiz.completed", "quiz.created", "user.registered", "user.scored",
  "payment.received", "tournament.started", "tournament.ended",
  "certificate.issued", "leaderboard.updated",
]

function CreateKeyModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("")
  const [perms, setPerms] = useState<string[]>(["quiz:read", "user:read"])
  const [rateLimit, setRateLimit] = useState(100)
  const [saving, setSaving] = useState(false)
  const [createdKey, setCreatedKey] = useState("")

  const togglePerm = (p: string) => setPerms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])

  const create = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await adminFetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, permissions: perms, rateLimit }),
      })
      const j = await res.json().catch(() => ({}))
      if (j?.data?.key) { setCreatedKey(j.data.key); onCreated() }
    } catch { /* ignore */ }
    setSaving(false)
  }

  if (createdKey) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-md rounded-2xl bg-[#0f1628] border border-white/10 p-6 shadow-2xl">
          <div className="text-center">
            <div className="text-4xl mb-3">🔑</div>
            <h3 className="text-lg font-black text-white mb-2">API Key Created</h3>
            <p className="text-xs text-white/40 mb-4">Copy this key now. It won&apos;t be shown again.</p>
            <div className="rounded-lg bg-black/60 border border-primary/20 p-3 font-mono text-xs text-mint break-all select-all">{createdKey}</div>
            <button type="button" onClick={() => { navigator.clipboard.writeText(createdKey); onClose() }} className="mt-4 admin-btn admin-btn-primary text-xs py-2 px-6">Copy &amp; Close</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#0f1628] border border-white/10 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-black text-white">Create API Key</h3>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white text-xl">✕</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Key Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:ring-2 focus:ring-primary/30 focus:outline-none" placeholder="e.g. School LMS Integration" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2 block">Permissions</label>
            <div className="grid grid-cols-2 gap-2">
              {PERMISSIONS.map((p) => (
                <button key={p.key} type="button" onClick={() => togglePerm(p.key)} className={`text-left rounded-lg border px-3 py-2 transition-all ${perms.includes(p.key) ? "bg-primary/10 border-primary/30" : "bg-white/[0.02] border-white/5 hover:border-white/10"}`}>
                  <div className={`text-xs font-bold ${perms.includes(p.key) ? "text-mint" : "text-white/50"}`}>{p.label}</div>
                  <div className="text-[9px] text-white/30 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Rate Limit (requests/hour)</label>
            <input type="number" value={rateLimit} onChange={(e) => setRateLimit(Number(e.target.value))} className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-primary/30 focus:outline-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="admin-btn admin-btn-ghost-dark text-xs py-2 px-4">Cancel</button>
            <button type="button" onClick={create} disabled={saving || !name.trim()} className="admin-btn admin-btn-primary text-xs py-2 px-5">{saving ? "Creating…" : "Generate Key"}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function APIKeyManagement() {
  const [keys, setKeys] = useState<APIKey[]>([])
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [view, setView] = useState<"keys" | "webhooks" | "docs">("keys")
  const [newWebhookUrl, setNewWebhookUrl] = useState("")
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    const [k, w] = await Promise.all([
      adminGetJsonArray<APIKey>("/api/admin/api-keys"),
      adminGetJsonArray<WebhookEndpoint>("/api/admin/webhooks"),
    ])
    setKeys(k)
    setWebhooks(w)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const toggleKey = async (id: string, active: boolean) => {
    await adminFetch(`/api/admin/api-keys/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) })
    loadData()
  }

  const createWebhook = async () => {
    if (!newWebhookUrl.trim() || !newWebhookEvents.length) return
    await adminFetch("/api/admin/webhooks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: newWebhookUrl, events: newWebhookEvents }) })
    setNewWebhookUrl("")
    setNewWebhookEvents([])
    loadData()
  }

  return (
    <div className="space-y-6">
      {showCreate && <CreateKeyModal onClose={() => setShowCreate(false)} onCreated={loadData} />}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: "🔑", label: "API Keys", value: keys.length },
          { icon: "✓", label: "Active", value: keys.filter((k) => k.active).length },
          { icon: "📡", label: "Webhooks", value: webhooks.length },
          { icon: "📊", label: "Requests Today", value: keys.reduce((s, k) => s + k.requestsToday, 0).toLocaleString() },
        ].map((s) => (
          <div key={s.label} className="admin-card p-4 text-center">
            <div className="text-lg">{s.icon}</div>
            <div className="text-xl font-black text-white mt-1">{s.value}</div>
            <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {(["keys", "webhooks", "docs"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setView(t)} className={`rounded-lg border px-4 py-2 text-xs font-bold capitalize transition-all ${view === t ? "bg-primary/15 border-primary/30 text-mint" : "bg-white/[0.03] border-white/10 text-white/50 hover:text-white"}`}>{t === "docs" ? "API Docs" : t}</button>
          ))}
        </div>
        {view === "keys" && <button type="button" onClick={() => setShowCreate(true)} className="admin-btn admin-btn-primary text-xs py-2 px-4">+ New API Key</button>}
      </div>

      {view === "keys" && (
        <div className="admin-card p-6">
          <h3 className="text-lg font-black text-white mb-4">API Keys</h3>
          {loading ? <div className="text-center py-8 text-white/30 text-sm">Loading…</div> : !keys.length ? (
            <div className="text-center py-12"><div className="text-4xl mb-3">🔑</div><p className="text-white/40 text-sm">No API keys yet. Create one to enable integrations.</p></div>
          ) : (
            <div className="space-y-2">
              {keys.map((k) => (
                <div key={k.id} className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-white text-sm">{k.name} {k.orgName && <span className="text-white/30 font-normal">· {k.orgName}</span>}</div>
                      <div className="font-mono text-[10px] text-white/25 mt-0.5">{k.key.slice(0, 12)}••••••••</div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {k.permissions.map((p) => (<span key={p} className="rounded bg-white/5 px-1.5 py-0.5 text-[8px] font-bold text-white/40">{p}</span>))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-bold text-white/60">{k.requestsToday.toLocaleString()}</div>
                        <div className="text-[9px] text-white/30">today</div>
                      </div>
                      <button type="button" onClick={() => toggleKey(k.id, !k.active)} className={`w-10 h-5 rounded-full transition-colors ${k.active ? "bg-emerald-500/60" : "bg-white/10"}`}>
                        <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${k.active ? "translate-x-5" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === "webhooks" && (
        <div className="admin-card p-6">
          <h3 className="text-lg font-black text-white mb-4">Webhook Endpoints</h3>
          <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4 mb-4">
            <div className="flex gap-2 mb-3">
              <input value={newWebhookUrl} onChange={(e) => setNewWebhookUrl(e.target.value)} className="flex-1 rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="https://your-lms.edu/webhook" />
              <button type="button" onClick={createWebhook} disabled={!newWebhookUrl.trim() || !newWebhookEvents.length} className="admin-btn admin-btn-primary text-xs py-2 px-4">Add</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {WEBHOOK_EVENTS.map((e) => (
                <button key={e} type="button" onClick={() => setNewWebhookEvents((prev) => prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e])} className={`rounded-md border px-2 py-1 text-[9px] font-bold transition-all ${newWebhookEvents.includes(e) ? "bg-primary/15 border-primary/30 text-mint" : "bg-white/[0.02] border-white/5 text-white/40 hover:text-white"}`}>{e}</button>
              ))}
            </div>
          </div>
          {!webhooks.length ? (
            <div className="text-center py-8"><div className="text-3xl mb-2">📡</div><p className="text-white/40 text-xs">No webhook endpoints configured</p></div>
          ) : (
            <div className="space-y-2">
              {webhooks.map((w) => (
                <div key={w.id} className="rounded-xl bg-white/[0.02] border border-white/5 p-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-white/70 truncate">{w.url}</div>
                    <div className="flex gap-1 mt-1">{w.events.map((e) => <span key={e} className="rounded bg-white/5 px-1 py-0.5 text-[8px] text-white/30">{e}</span>)}</div>
                  </div>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${w.active ? "bg-emerald-400" : "bg-red-400"}`} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === "docs" && (
        <div className="admin-card p-6">
          <h3 className="text-lg font-black text-white mb-1">API Documentation</h3>
          <p className="text-xs text-white/40 mb-5">RESTful API for LMS integration, school portals &amp; third-party apps</p>
          <div className="space-y-3">
            {[
              { method: "GET", path: "/api/v1/quizzes", desc: "List all available quizzes with pagination" },
              { method: "GET", path: "/api/v1/quizzes/:id", desc: "Get quiz details with questions" },
              { method: "POST", path: "/api/v1/quizzes", desc: "Create a new quiz (quiz:write required)" },
              { method: "GET", path: "/api/v1/users", desc: "List organization users with stats" },
              { method: "POST", path: "/api/v1/users/bulk", desc: "Bulk create student accounts" },
              { method: "GET", path: "/api/v1/leaderboard", desc: "Get leaderboard rankings" },
              { method: "GET", path: "/api/v1/analytics/performance", desc: "Performance analytics for org" },
              { method: "POST", path: "/api/v1/certificates/issue", desc: "Issue certificate to user" },
              { method: "GET", path: "/api/v1/tournaments", desc: "List tournaments" },
              { method: "POST", path: "/api/v1/quiz-sessions/start", desc: "Start a proctored quiz session" },
            ].map((ep) => (
              <div key={ep.path + ep.method} className="flex items-start gap-3 rounded-lg bg-white/[0.02] border border-white/5 p-3">
                <span className={`rounded px-2 py-0.5 text-[9px] font-black shrink-0 ${ep.method === "GET" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>{ep.method}</span>
                <div className="min-w-0">
                  <code className="text-xs text-mint font-mono">{ep.path}</code>
                  <div className="text-[10px] text-white/40 mt-0.5">{ep.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-xl bg-primary/[0.06] border border-primary/20 p-4">
            <div className="text-xs font-bold text-mint mb-1">Authentication</div>
            <p className="text-[10px] text-white/50 leading-relaxed">
              Include your API key in the <code className="text-mint/80">Authorization</code> header:
              <br /><code className="text-mint/60">Authorization: Bearer iqe_sk_xxxxxxxxxxxxx</code>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
