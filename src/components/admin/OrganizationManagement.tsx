"use client"

import { useState, useEffect, useCallback } from "react"
import { adminFetch, adminGetJsonArray } from "@/lib/admin/client"

type Org = {
  id: string; slug: string; name: string
  type: "school" | "college" | "university" | "corporate" | "coaching" | "other"
  plan: "free" | "pro" | "enterprise"
  contactEmail: string; contactPhone?: string; logo?: string; domain?: string
  memberCount: number; quizCount: number; active: boolean; approved: boolean; suspended: boolean
  createdAt: string; expiresAt?: string; ownerName: string; ownerEmail: string
  primaryColor?: string; tagline?: string
}

type OrgMember = {
  id: string; username: string; displayName: string; email?: string
  role: "owner" | "admin" | "teacher" | "student"; active: boolean; joinedAt: string
  quizzesTaken: number; totalScore: number
}

type OrgDetail = Org & { members: OrgMember[]; attemptCount: number }

const ORG_TYPES = [
  { value: "school", label: "School (K-12)", icon: "🏫" },
  { value: "college", label: "College", icon: "🎓" },
  { value: "university", label: "University", icon: "🏛" },
  { value: "corporate", label: "Corporate", icon: "🏢" },
  { value: "coaching", label: "Coaching Institute", icon: "📚" },
  { value: "other", label: "Other", icon: "🏗" },
]

const PLAN_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  free: { bg: "bg-white/5 border-white/10", text: "text-white/60", label: "Free" },
  pro: { bg: "bg-primary/15 border-primary/30", text: "text-mint", label: "Pro" },
  enterprise: { bg: "bg-amber-500/15 border-amber-500/30", text: "text-amber-300", label: "Enterprise" },
}

function CreateOrgModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: "", type: "school", contactEmail: "", contactPhone: "", plan: "free", domain: "",
    ownerName: "", ownerEmail: "", ownerPassword: "", primaryColor: "#7c3aed", accentColor: "#f5b301", tagline: ""
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [created, setCreated] = useState<Org | null>(null)

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.ownerEmail.trim() || !form.ownerName.trim()) { setError("Name, owner name, and owner email are required"); return }
    if (form.ownerPassword.length < 6) { setError("Owner password must be at least 6 characters"); return }
    setSaving(true); setError("")
    try {
      const res = await adminFetch("/api/admin/organizations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, contactEmail: form.contactEmail || form.ownerEmail }),
      })
      const j = await res.json().catch(() => ({}))
      if (j?.ok) { setCreated(j.data); onCreated() }
      else setError(j?.error || "Failed to create")
    } catch { setError("Network error") }
    finally { setSaving(false) }
  }

  if (created) {
    const loginUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/org/${created.slug}/login`
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-lg rounded-2xl bg-[#0f1628] border border-emerald-500/20 p-6 shadow-2xl">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">✓</div>
            <h3 className="text-lg font-black text-emerald-300">Organization Created</h3>
            <p className="text-sm text-white/50 mt-1">{created.name} is live!</p>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1 block">Organization URL</label>
              <div className="rounded-xl bg-black/40 border border-white/10 p-3 font-mono text-xs text-accent break-all select-all">/org/{created.slug}</div>
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1 block">Login Link (share with org owner)</label>
              <div className="rounded-xl bg-black/40 border border-white/10 p-3 font-mono text-xs text-accent break-all select-all">{loginUrl}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1 block">Owner Login</label>
                <div className="text-xs text-white/80">{created.ownerEmail}</div>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1 block">Plan</label>
                <div className="text-xs text-white/80 uppercase">{created.plan}</div>
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="mt-6 w-full admin-btn admin-btn-primary text-xs py-2.5">Done</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl bg-[#0f1628] border border-white/10 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-black text-white">Register Organization</h3>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white text-xl">✕</button>
        </div>
        <div className="space-y-4">
          <div className="text-[9px] font-black uppercase tracking-widest text-accent/60 mb-1">Organization Info</div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Organization Name *</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:ring-2 focus:ring-primary/30 focus:outline-none" placeholder="e.g. Delhi Public School" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {ORG_TYPES.map((t) => (
                <button key={t.value} type="button" onClick={() => setForm((f) => ({ ...f, type: t.value }))} className={`rounded-lg border px-2.5 py-2 text-[10px] font-bold transition-all ${form.type === t.value ? "bg-primary/15 border-primary/30 text-mint" : "bg-white/[0.03] border-white/10 text-white/50 hover:text-white"}`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Tagline</label>
            <input value={form.tagline} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))} className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none" placeholder="Excellence in education since 1995" />
          </div>

          <div className="text-[9px] font-black uppercase tracking-widest text-accent/60 mt-4 mb-1">Owner Account</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Owner Name *</label>
              <input value={form.ownerName} onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))} className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none" placeholder="Rajesh Kumar" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Owner Email *</label>
              <input value={form.ownerEmail} onChange={(e) => setForm((f) => ({ ...f, ownerEmail: e.target.value }))} className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none" placeholder="owner@school.edu" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Owner Password * (6+ chars)</label>
              <input type="password" value={form.ownerPassword} onChange={(e) => setForm((f) => ({ ...f, ownerPassword: e.target.value }))} className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Contact Phone</label>
              <input value={form.contactPhone} onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))} className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none" placeholder="+91 98765 43210" />
            </div>
          </div>

          <div className="text-[9px] font-black uppercase tracking-widest text-accent/60 mt-4 mb-1">Plan & Branding</div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Plan</label>
            <div className="flex gap-2">
              {(["free", "pro", "enterprise"] as const).map((p) => (
                <button key={p} type="button" onClick={() => setForm((f) => ({ ...f, plan: p }))} className={`flex-1 rounded-lg border px-3 py-2.5 text-xs font-black uppercase tracking-wider transition-all ${form.plan === p ? PLAN_BADGE[p].bg + " " + PLAN_BADGE[p].text : "bg-white/[0.03] border-white/10 text-white/40"}`}>
                  {PLAN_BADGE[p].label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Primary Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.primaryColor} onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))} className="w-10 h-10 rounded-lg cursor-pointer border-0" />
                <input value={form.primaryColor} onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))} className="flex-1 rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-white font-mono focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Domain (optional)</label>
              <input value={form.domain} onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))} className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none" placeholder="quiz.myschool.edu" />
            </div>
          </div>

          {error && <p className="text-red-400 text-xs font-bold">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="admin-btn admin-btn-ghost-dark text-xs py-2 px-4">Cancel</button>
            <button type="button" onClick={handleSubmit} disabled={saving} className="admin-btn admin-btn-primary text-xs py-2 px-5">{saving ? "Creating…" : "Create Organization"}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function OrgDetailPanel({ org, onClose, onAction }: { org: OrgDetail; onClose: () => void; onAction: () => void }) {
  const [actionLoading, setActionLoading] = useState("")
  const loginUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/org/${org.slug}/login`

  const doAction = async (action: string, payload?: Record<string, string>) => {
    setActionLoading(action)
    try {
      await adminFetch(`/api/admin/organizations/${org.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload })
      })
      onAction()
    } catch { /* ignore */ }
    finally { setActionLoading("") }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-[#0f1628] border border-white/10 p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <span className="text-xl">{ORG_TYPES.find((t) => t.value === org.type)?.icon ?? "🏗"}</span>
              {org.name}
            </h3>
            <p className="text-[10px] text-white/40 mt-0.5">Slug: <span className="font-mono text-accent">{org.slug}</span> · Created {new Date(org.createdAt).toLocaleDateString()}</p>
          </div>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white text-xl">✕</button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="rounded-xl bg-white/[0.04] border border-white/5 p-3 text-center">
            <div className="text-xl font-black text-white">{org.memberCount}</div>
            <div className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Members</div>
          </div>
          <div className="rounded-xl bg-white/[0.04] border border-white/5 p-3 text-center">
            <div className="text-xl font-black text-white">{org.quizCount}</div>
            <div className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Quizzes</div>
          </div>
          <div className="rounded-xl bg-white/[0.04] border border-white/5 p-3 text-center">
            <div className="text-xl font-black text-white">{org.attemptCount}</div>
            <div className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Attempts</div>
          </div>
          <div className="rounded-xl bg-white/[0.04] border border-white/5 p-3 text-center">
            <div className={`text-xl font-black ${org.suspended ? "text-red-400" : org.active ? "text-emerald-400" : "text-amber-400"}`}>
              {org.suspended ? "Suspended" : org.active ? "Active" : "Inactive"}
            </div>
            <div className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Status</div>
          </div>
        </div>

        <div className="mb-5">
          <label className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1 block">Login URL</label>
          <div className="rounded-xl bg-black/40 border border-white/10 p-3 font-mono text-xs text-accent break-all select-all">{loginUrl}</div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5 text-xs">
          <div><span className="text-white/40">Owner:</span> <span className="text-white/90 font-bold">{org.ownerName}</span></div>
          <div><span className="text-white/40">Email:</span> <span className="text-white/90">{org.ownerEmail}</span></div>
          <div><span className="text-white/40">Plan:</span> <span className={`font-black uppercase ${PLAN_BADGE[org.plan]?.text}`}>{org.plan}</span></div>
          <div><span className="text-white/40">Contact:</span> <span className="text-white/90">{org.contactPhone || "—"}</span></div>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          {org.suspended ? (
            <button onClick={() => doAction("activate")} disabled={!!actionLoading} className="admin-btn admin-btn-primary text-xs py-1.5 px-3">{actionLoading === "activate" ? "…" : "Activate"}</button>
          ) : (
            <button onClick={() => doAction("suspend")} disabled={!!actionLoading} className="rounded-lg bg-red-500/15 border border-red-500/25 text-red-400 text-xs font-bold py-1.5 px-3 hover:bg-red-500/20">{actionLoading === "suspend" ? "…" : "Suspend"}</button>
          )}
          {(["free", "pro", "enterprise"] as const).filter((p) => p !== org.plan).map((p) => (
            <button key={p} onClick={() => doAction("update_plan", { plan: p })} disabled={!!actionLoading} className={`rounded-lg border text-xs font-bold py-1.5 px-3 ${PLAN_BADGE[p].bg} ${PLAN_BADGE[p].text}`}>
              Upgrade to {PLAN_BADGE[p].label}
            </button>
          ))}
        </div>

        <div>
          <div className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-2">Members ({org.members?.length || 0})</div>
          <div className="rounded-xl border border-white/5 overflow-hidden">
            {org.members?.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 last:border-0 text-xs">
                <div className="min-w-0">
                  <span className="font-bold text-white">{m.displayName}</span>
                  <span className="text-white/30 ml-1">@{m.username}</span>
                  {m.email && <span className="text-white/20 ml-1">({m.email})</span>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-white/40 tabular-nums">{m.quizzesTaken}q · {m.totalScore}pts</span>
                  <span className={`rounded text-[8px] font-black uppercase px-1.5 py-0.5 ${m.role === "owner" ? "bg-amber-500/15 text-amber-300" : m.role === "admin" ? "bg-primary/15 text-mint" : m.role === "teacher" ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-white/40"}`}>{m.role}</span>
                </div>
              </div>
            ))}
            {!org.members?.length && <div className="px-4 py-6 text-center text-white/30 text-xs">No members yet</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OrganizationManagement() {
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedDetail, setSelectedDetail] = useState<OrgDetail | null>(null)
  const [filter, setFilter] = useState<"all" | "school" | "college" | "university" | "corporate" | "coaching">("all")

  const loadOrgs = useCallback(async () => {
    setLoading(true)
    const data = await adminGetJsonArray<Org>("/api/admin/organizations")
    setOrgs(data)
    setLoading(false)
  }, [])

  useEffect(() => { loadOrgs() }, [loadOrgs])

  const openDetail = async (orgId: string) => {
    try {
      const res = await adminFetch(`/api/admin/organizations/${orgId}`)
      const j = await res.json()
      if (j.ok) setSelectedDetail(j.data)
    } catch { /* ignore */ }
  }

  const filtered = filter === "all" ? orgs : orgs.filter((o) => o.type === filter)
  const stats = {
    total: orgs.length,
    active: orgs.filter((o) => o.active && !o.suspended).length,
    suspended: orgs.filter((o) => o.suspended).length,
    pro: orgs.filter((o) => o.plan === "pro").length,
    enterprise: orgs.filter((o) => o.plan === "enterprise").length,
    totalMembers: orgs.reduce((s, o) => s + o.memberCount, 0),
    revenue: orgs.filter((o) => o.plan !== "free").length,
  }

  return (
    <div className="space-y-6">
      {showCreate && <CreateOrgModal onClose={() => setShowCreate(false)} onCreated={loadOrgs} />}
      {selectedDetail && <OrgDetailPanel org={selectedDetail} onClose={() => { setSelectedDetail(null); loadOrgs() }} onAction={() => { setSelectedDetail(null); loadOrgs() }} />}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { icon: "🏛", label: "Total", value: stats.total, color: "" },
          { icon: "✓", label: "Active", value: stats.active, color: "text-emerald-400" },
          { icon: "⚠", label: "Suspended", value: stats.suspended, color: "text-red-400" },
          { icon: "⚡", label: "Pro", value: stats.pro, color: "text-accent" },
          { icon: "👑", label: "Enterprise", value: stats.enterprise, color: "text-amber-400" },
          { icon: "👥", label: "Members", value: stats.totalMembers, color: "" },
        ].map((s) => (
          <div key={s.label} className="admin-card p-4 text-center">
            <div className="text-lg">{s.icon}</div>
            <div className={`text-xl font-black mt-1 ${s.color || "text-white"}`}>{s.value}</div>
            <div className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="admin-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-black text-white">Organizations</h2>
            <p className="text-xs text-white/40 mt-0.5">Manage org portals, members, plans, and access</p>
          </div>
          <button type="button" onClick={() => setShowCreate(true)} className="admin-btn admin-btn-primary text-xs py-2 px-4">+ New Organization</button>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-5">
          {[{ v: "all" as const, l: "All" }, ...ORG_TYPES.map((t) => ({ v: t.value as typeof filter, l: t.label }))].map((f) => (
            <button key={f.v} type="button" onClick={() => setFilter(f.v)} className={`rounded-lg border px-3 py-1.5 text-[10px] font-bold transition-all ${filter === f.v ? "bg-primary/15 border-primary/30 text-mint" : "bg-white/[0.03] border-white/10 text-white/50 hover:text-white"}`}>{f.l}</button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-white/30 text-sm">Loading organizations…</div>
        ) : !filtered.length ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🏛</div>
            <p className="text-white/40 text-sm mb-2">No organizations yet.</p>
            <p className="text-white/25 text-xs max-w-md mx-auto">Create an organization to give schools, colleges, and corporates their own isolated quiz portal with separate login, members, quizzes, and leaderboard.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((org) => {
              const badge = PLAN_BADGE[org.plan]
              return (
                <button key={org.id} type="button" onClick={() => openDetail(org.id)} className="w-full text-left rounded-xl border bg-white/[0.02] border-white/5 p-4 transition-all hover:border-white/20 hover:bg-white/[0.04]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg shrink-0">
                        {ORG_TYPES.find((t) => t.value === org.type)?.icon ?? "🏗"}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white text-sm truncate">{org.name}</div>
                        <div className="text-[10px] text-white/40">
                          <span className="font-mono text-accent/70">/org/{org.slug}</span>
                          <span className="mx-1.5 text-white/15">·</span>
                          {org.ownerEmail}
                          <span className="mx-1.5 text-white/15">·</span>
                          {org.memberCount} members
                          <span className="mx-1.5 text-white/15">·</span>
                          {org.quizCount} quizzes
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${badge.bg} ${badge.text}`}>{badge.label}</span>
                      {org.suspended ? (
                        <span className="rounded-md bg-red-500/15 border border-red-500/25 text-red-400 px-2 py-0.5 text-[9px] font-black uppercase">Suspended</span>
                      ) : (
                        <span className={`w-2 h-2 rounded-full ${org.active ? "bg-emerald-400" : "bg-red-400"}`} />
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
