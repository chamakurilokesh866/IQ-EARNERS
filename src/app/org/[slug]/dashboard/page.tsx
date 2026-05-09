"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { orgPortalLoginPath } from "@/lib/orgPortalPaths"
import { orgLoginRedirectPath, rememberOrgPortalCode } from "@/lib/orgPortalClient"

type OrgInfo = { name: string; slug: string; type: string; primaryColor: string; accentColor: string }
type Member = { id: string; username: string; displayName: string; email?: string; role: string; active: boolean; joinedAt: string; quizzesTaken: number; totalScore: number }
type Quiz = { id: string; title: string; category: string; quizType?: string; difficulty: string; questionCount: number; published: boolean; archived?: boolean; createdAt: string }
type SessionInfo = { loggedIn: boolean; role: string; name: string; portalCode?: string | null }
type IntegrityEvent = { id: string; memberName: string; username: string; quizId?: string; type: string; message: string; createdAt: string }
type AnalyticsData = { totalQuizzes: number; publishedQuizzes: number; totalAttempts: number; avgScorePct: number; avgTimeSeconds: number; quizStats: Array<{ quizId: string; title: string; published: boolean; completionCount: number; averageScorePct: number }> }
type OrgNotification = { id: string; type: string; title: string; message: string; createdAt: string }
type OrgAuditEvent = { id: string; actorName: string; action: string; targetType: string; detail?: string; createdAt: string }
type OrgApiKeyRow = {
  id: string
  name: string
  key: string
  permissions: string[]
  rateLimit: number
  requestsToday: number
  active: boolean
  createdAt: string
}

export default function OrgDashboardPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [org, setOrg] = useState<OrgInfo | null>(null)
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [integrityEvents, setIntegrityEvents] = useState<IntegrityEvent[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [notifications, setNotifications] = useState<OrgNotification[]>([])
  const [auditEvents, setAuditEvents] = useState<OrgAuditEvent[]>([])
  const [tab, setTab] = useState<
    | "overview"
    | "members"
    | "quizzes"
    | "create-quiz"
    | "add-member"
    | "integrity"
    | "analytics"
    | "reports"
    | "billing"
    | "notifications"
    | "audit"
    | "api-keys"
  >("overview")
  const [billingProfile, setBillingProfile] = useState<{
    legalName: string
    gstin: string
    billingAddressLine: string
    billingCity: string
    billingState: string
    billingPostalCode: string
    annualContractValueInr: number | null
    billingNotes: string
  } | null>(null)
  const [apiKeys, setApiKeys] = useState<OrgApiKeyRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/org/${slug}/info`).then((r) => r.json()),
      fetch(`/api/org/${slug}/auth`, { credentials: "include" }).then((r) => r.json()),
    ]).then(([info, auth]) => {
      if (info.ok) setOrg(info.data)
      if (auth.loggedIn && (auth.role === "owner" || auth.role === "admin")) {
        if (auth.requiresPasswordReset) {
          router.replace(`/org/${slug}/change-password`)
          return
        }
        if (auth.portalCode) rememberOrgPortalCode(String(slug), auth.portalCode)
        setSession(auth)
      }
      else router.replace(orgLoginRedirectPath(String(slug)))
    }).catch(() => router.replace(orgLoginRedirectPath(String(slug))))
      .finally(() => setLoading(false))
  }, [slug, router])

  const loadMembers = useCallback(() => {
    fetch(`/api/org/${slug}/members`, { credentials: "include" }).then((r) => r.json()).then((j) => {
      if (j.ok) setMembers(j.data)
    }).catch(() => {})
  }, [slug])

  const loadQuizzes = useCallback(() => {
    fetch(`/api/org/${slug}/quizzes`, { credentials: "include" }).then((r) => r.json()).then((j) => {
      if (j.ok) setQuizzes(j.data)
    }).catch(() => {})
  }, [slug])

  const loadIntegrity = useCallback(() => {
    fetch(`/api/org/${slug}/integrity`, { credentials: "include" }).then((r) => r.json()).then((j) => {
      if (j.ok && Array.isArray(j.data)) setIntegrityEvents(j.data)
    }).catch(() => {})
  }, [slug])

  const loadAnalytics = useCallback(() => {
    fetch(`/api/org/${slug}/analytics`, { credentials: "include" }).then((r) => r.json()).then((j) => {
      if (j.ok && j.data) setAnalytics(j.data)
    }).catch(() => {})
  }, [slug])

  const loadNotifications = useCallback(() => {
    fetch(`/api/org/${slug}/notifications`, { credentials: "include" }).then((r) => r.json()).then((j) => {
      if (j.ok && Array.isArray(j.data)) setNotifications(j.data)
    }).catch(() => {})
  }, [slug])

  const loadAudit = useCallback(() => {
    fetch(`/api/org/${slug}/audit`, { credentials: "include" }).then((r) => r.json()).then((j) => {
      if (j.ok && Array.isArray(j.data)) setAuditEvents(j.data)
    }).catch(() => {})
  }, [slug])

  const loadApiKeys = useCallback(() => {
    fetch(`/api/org/${slug}/api-keys`, { credentials: "include" }).then((r) => r.json()).then((j) => {
      if (j.ok && Array.isArray(j.data)) setApiKeys(j.data)
    }).catch(() => {})
  }, [slug])

  useEffect(() => { if (session) { loadMembers(); loadQuizzes(); loadIntegrity(); loadAnalytics(); loadNotifications(); loadAudit() } }, [session, loadMembers, loadQuizzes, loadIntegrity, loadAnalytics, loadNotifications, loadAudit])

  useEffect(() => {
    if (session && tab === "api-keys") loadApiKeys()
  }, [session, tab, loadApiKeys])

  const loadBilling = useCallback(() => {
    if (!session || (session.role !== "owner" && session.role !== "admin")) return
    fetch(`/api/org/${slug}/billing-profile`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok && j.data) setBillingProfile(j.data)
      })
      .catch(() => {})
  }, [slug, session])

  useEffect(() => {
    if (tab === "billing") loadBilling()
  }, [tab, loadBilling])

  const [memberSearch, setMemberSearch] = useState("")
  const [memberRoleFilter, setMemberRoleFilter] = useState<string>("all")
  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase()
    return members.filter((m) => {
      if (memberRoleFilter !== "all" && m.role !== memberRoleFilter) return false
      if (!q) return true
      return (
        m.username.toLowerCase().includes(q) ||
        m.displayName.toLowerCase().includes(q) ||
        (m.email?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [members, memberSearch, memberRoleFilter])

  if (loading || !org || !session) {
    return <div className="min-h-screen app-page-surface flex items-center justify-center"><div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" /></div>
  }

  const pc = org.primaryColor || "#7c3aed"
  const totalStudents = members.filter((m) => m.role === "student").length
  const totalQuizzes = quizzes.length
  const publishedQuizzes = quizzes.filter((q) => q.published).length
  const canOrgBilling = session.role === "owner" || session.role === "admin"

  const workspaceTabs = [
    "overview",
    "members",
    "quizzes",
    "create-quiz",
    "add-member",
    "integrity",
    "analytics",
    "reports",
    ...(canOrgBilling ? (["billing"] as const) : []),
    "notifications",
    "audit",
    "api-keys",
  ] as const

  return (
    <div className="min-h-screen app-page-surface text-white org-premium-shell">
      <header className="border-b border-white/5 bg-[#060a14]/90 backdrop-blur-md sticky top-0 z-50 org-premium-header">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0" style={{ background: `${pc}30` }}>
              {org.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h1 className="font-black text-sm text-white truncate">{org.name}</h1>
              <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: `${pc}99` }}>Owner Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href={`/org/${slug}`} className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[10px] font-bold text-white/70 hover:text-white transition-all">Portal</Link>
            <button onClick={async () => { await fetch(`/api/org/${slug}/auth`, { method: "DELETE", credentials: "include" }); router.replace(orgLoginRedirectPath(String(slug))) }} className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[10px] font-bold text-red-400">Sign out</button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Members", value: members.length, icon: "👥" },
            { label: "Students", value: totalStudents, icon: "🎓" },
            { label: "Quizzes", value: totalQuizzes, icon: "📝" },
            { label: "Published", value: publishedQuizzes, icon: "✓" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="text-2xl font-black">{s.value}</div>
              <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-6">
          {workspaceTabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-2 text-xs font-bold capitalize transition-all ${tab === t ? "text-white" : "text-white/40 hover:text-white/70"}`}
              style={tab === t ? { background: `${pc}20`, border: `1px solid ${pc}35` } : { background: "transparent", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {t === "api-keys" ? "API keys" : t.replace(/-/g, " ")}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-black mb-4">Quick Overview</h2>
            <p className="text-sm text-white/50 mb-4">Organization URL: <span className="text-cyan-400 font-mono text-xs">/org/{slug}</span></p>
            <p className="text-sm text-white/50 mb-2">Share the login link with your members:</p>
            <div className="rounded-xl bg-black/40 border border-white/10 p-3 font-mono text-xs break-all select-all" style={{ color: pc }}>
              {typeof window !== "undefined" && session?.portalCode
                ? `${window.location.origin}${orgPortalLoginPath(String(slug), session.portalCode)}`
                : session?.portalCode
                  ? orgPortalLoginPath(String(slug), session.portalCode)
                  : "Sign in once from your portal link to load the shareable URL here, or copy it from your welcome email."}
            </div>
          </div>
        )}

        {tab === "members" && (
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-black text-sm">Members ({members.length})</h2>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search name, username, email…"
                  className="rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-white min-w-[200px] flex-1 sm:flex-none"
                />
                <select
                  value={memberRoleFilter}
                  onChange={(e) => setMemberRoleFilter(e.target.value)}
                  className="rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-white"
                >
                  <option value="all">All roles</option>
                  <option value="student">Students</option>
                  <option value="teacher">Teachers</option>
                  <option value="admin">Admins</option>
                  <option value="owner">Owners</option>
                </select>
                <button onClick={() => setTab("add-member")} className="rounded-lg px-3 py-1.5 text-[10px] font-bold text-white shrink-0" style={{ background: pc }}>+ Add Member</button>
              </div>
            </div>
            {!filteredMembers.length ? (
              <div className="px-5 py-8 text-sm text-white/40">No members match your filters.</div>
            ) : (
              filteredMembers.map((m) => {
                const loginUrl =
                  typeof window !== "undefined" && session?.portalCode
                    ? `${window.location.origin}${orgPortalLoginPath(String(slug), session.portalCode)}`
                    : ""
                return (
                  <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-white">{m.displayName} <span className="text-white/30 text-xs">@{m.username}</span></div>
                      {m.email ? <div className="text-[10px] text-white/30">{m.email}</div> : <div className="text-[10px] text-white/20">No email on file</div>}
                      <div className="text-[10px] text-white/35 mt-1">Joined {new Date(m.joinedAt).toLocaleDateString()}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
                      <span className="text-xs text-white/50 tabular-nums">{m.quizzesTaken} quizzes · {m.totalScore} pts</span>
                      <span className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase ${m.role === "owner" ? "bg-amber-500/15 text-amber-300" : m.role === "admin" ? "bg-cyan-500/15 text-cyan-300" : m.role === "teacher" ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-white/40"}`}>
                        {m.role}
                      </span>
                      {loginUrl ? (
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard.writeText(loginUrl)
                          }}
                          className="rounded-md border border-white/15 px-2 py-1 text-[9px] font-bold text-white/70 hover:text-white"
                        >
                          Copy login URL
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {tab === "quizzes" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-sm">Quizzes ({quizzes.length})</h2>
              <button onClick={() => setTab("create-quiz")} className="rounded-lg px-3 py-1.5 text-[10px] font-bold text-white" style={{ background: pc }}>+ Create Quiz</button>
            </div>
            {quizzes.map((q) => (
              <div key={q.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm">{q.title}</div>
                  <div className="text-[10px] text-white/40">{q.quizType || "practice"} · {q.category} · {q.difficulty} · {q.questionCount} Qs · {q.archived ? "Archived" : q.published ? "Published" : "Draft"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase ${q.archived ? "bg-red-500/15 text-red-300" : q.published ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-white/30"}`}>
                    {q.archived ? "Archived" : q.published ? "Live" : "Draft"}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch(`/api/org/${slug}/quizzes/${q.id}`, {
                        method: "PATCH",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ published: !q.published })
                      })
                      loadQuizzes()
                      loadAnalytics()
                    }}
                    className="rounded-md border border-white/15 px-2 py-1 text-[9px] font-bold text-white/70 hover:text-white"
                  >
                    {q.published ? "Unpublish" : "Publish"}
                  </button>
                  {q.archived && (
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/org/${slug}/quizzes/${q.id}`, {
                          method: "PATCH",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ archived: false })
                        })
                        loadQuizzes()
                        loadAnalytics()
                      }}
                      className="rounded-md border border-emerald-500/30 px-2 py-1 text-[9px] font-bold text-emerald-300 hover:text-emerald-200"
                    >
                      Restore
                    </button>
                  )}
                  {!q.archived && (
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/org/${slug}/quizzes/${q.id}`, {
                          method: "PATCH",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ archived: true, published: false })
                        })
                        loadQuizzes()
                        loadAnalytics()
                      }}
                      className="rounded-md border border-red-500/30 px-2 py-1 text-[9px] font-bold text-red-300 hover:text-red-200"
                    >
                      Archive
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={loadAudit}
                    className="rounded-md border border-white/15 px-2 py-1 text-[9px] font-bold text-white/70 hover:text-white"
                  >
                    Audit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "create-quiz" && <CreateQuizForm slug={slug} pc={pc} onDone={() => { loadQuizzes(); setTab("quizzes") }} />}
        {tab === "add-member" && <AddMemberForm slug={slug} pc={pc} onDone={() => { loadMembers(); setTab("members") }} />}
        {tab === "integrity" && (
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
              <h2 className="font-black text-sm">Integrity Alerts ({integrityEvents.length})</h2>
              <button onClick={loadIntegrity} className="rounded-lg px-3 py-1.5 text-[10px] font-bold text-white" style={{ background: pc }}>Refresh</button>
            </div>
            {!integrityEvents.length ? (
              <div className="p-6 text-sm text-white/40">No tab-switch/focus alerts recorded yet.</div>
            ) : integrityEvents.map((e) => (
              <div key={e.id} className="px-5 py-3 border-b border-white/5 last:border-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white">{e.memberName} <span className="text-white/30 text-xs">@{e.username}</span></div>
                    <div className="text-[10px] text-white/45">{e.message} · {e.type} {e.quizId ? `· quiz ${e.quizId}` : ""}</div>
                  </div>
                  <div className="text-[10px] text-white/40 shrink-0">{new Date(e.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === "analytics" && (
          <div className="space-y-4">
            {!analytics ? (
              <div className="rounded-xl border border-white/10 p-5 text-sm text-white/40">Analytics loading...</div>
            ) : (
              <>
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-xs text-cyan-100/90">
                    <span className="font-black">Exports</span> — download all attempt rows for LMS / grade books (CSV) or open a printable table (save as PDF from the browser).
                  </p>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <a
                      href={`/api/org/${slug}/reports/attempts-export`}
                      className="rounded-lg px-3 py-2 text-[10px] font-black text-white"
                      style={{ background: pc }}
                    >
                      Download CSV
                    </a>
                    <a
                      href={`/api/org/${slug}/reports/attempts-export?format=html`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-white/20 px-3 py-2 text-[10px] font-black text-white/85 hover:text-white"
                    >
                      Print / PDF view
                    </a>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { label: "Attempts", value: analytics.totalAttempts },
                    { label: "Avg Score %", value: analytics.avgScorePct },
                    { label: "Avg Time (s)", value: analytics.avgTimeSeconds },
                    { label: "Quizzes", value: analytics.totalQuizzes },
                    { label: "Published", value: analytics.publishedQuizzes },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
                      <div className="text-xl font-black">{s.value}</div>
                      <div className="text-[9px] uppercase tracking-widest text-white/40">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-white/10 overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/5 text-xs font-black uppercase tracking-wider text-white/40">Quiz Performance</div>
                  {analytics.quizStats.map((q) => (
                    <div key={q.quizId} className="px-5 py-3 border-b border-white/5 last:border-0 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-white">{q.title}</div>
                        <div className="text-[10px] text-white/45">{q.published ? "Published" : "Draft"} · Attempts: {q.completionCount}</div>
                      </div>
                      <div className="text-xs font-black text-cyan-300">{q.averageScorePct}%</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        {tab === "reports" && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
            <h2 className="text-lg font-black">Reports & exports</h2>
            <p className="text-sm text-white/50 max-w-2xl">
              Per-candidate scores for every quiz attempt. Use CSV in Excel or Google Sheets; use the HTML view for printing or Save as PDF.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={`/api/org/${slug}/reports/attempts-export`}
                className="rounded-xl px-5 py-3 text-sm font-black text-white shadow-lg"
                style={{ background: pc }}
              >
                Download attempts (CSV)
              </a>
              <a
                href={`/api/org/${slug}/reports/attempts-export?format=html`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-white/15 px-5 py-3 text-sm font-black text-white/90 hover:text-white"
              >
                Open print / PDF view
              </a>
            </div>
          </div>
        )}
        {tab === "billing" && canOrgBilling && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
            <h2 className="text-lg font-black">Billing profile</h2>
            <p className="text-sm text-white/50">
              GST and address on file for your institution. Ask your IQ Earners account manager to update these fields if anything changes.
            </p>
            {!billingProfile ? (
              <div className="text-sm text-white/40">Loading…</div>
            ) : (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">Legal name</dt>
                  <dd className="text-white/90 mt-1">{billingProfile.legalName || "—"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">GSTIN</dt>
                  <dd className="text-white/90 mt-1 font-mono">{billingProfile.gstin || "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">Address</dt>
                  <dd className="text-white/90 mt-1">
                    {[billingProfile.billingAddressLine, billingProfile.billingCity, billingProfile.billingState, billingProfile.billingPostalCode]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">Annual contract (INR)</dt>
                  <dd className="text-white/90 mt-1">
                    {billingProfile.annualContractValueInr != null ? `₹${billingProfile.annualContractValueInr.toLocaleString()}` : "—"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">Notes</dt>
                  <dd className="text-white/70 mt-1 whitespace-pre-wrap">{billingProfile.billingNotes || "—"}</dd>
                </div>
              </dl>
            )}
          </div>
        )}
        {tab === "notifications" && (
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
              <h2 className="font-black text-sm">Notifications ({notifications.length})</h2>
              <button onClick={loadNotifications} className="rounded-lg px-3 py-1.5 text-[10px] font-bold text-white" style={{ background: pc }}>Refresh</button>
            </div>
            {!notifications.length ? (
              <div className="p-6 text-sm text-white/40">No notifications yet.</div>
            ) : notifications.map((n) => (
              <div key={n.id} className="px-5 py-3 border-b border-white/5 last:border-0">
                <div className="text-sm font-bold text-white">{n.title}</div>
                <div className="text-[10px] text-white/45">{n.message}</div>
                <div className="text-[10px] text-white/30 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
        {tab === "audit" && (
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
              <h2 className="font-black text-sm">Audit Trail ({auditEvents.length})</h2>
              <button onClick={loadAudit} className="rounded-lg px-3 py-1.5 text-[10px] font-bold text-white" style={{ background: pc }}>Refresh</button>
            </div>
            {!auditEvents.length ? (
              <div className="p-6 text-sm text-white/40">No audit events yet.</div>
            ) : auditEvents.map((e) => (
              <div key={e.id} className="px-5 py-3 border-b border-white/5 last:border-0">
                <div className="text-sm text-white"><span className="font-bold">{e.actorName}</span> · {e.action}</div>
                <div className="text-[10px] text-white/45">{e.targetType}{e.detail ? ` · ${e.detail}` : ""}</div>
                <div className="text-[10px] text-white/30 mt-1">{new Date(e.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
        {tab === "api-keys" && (
          <OrgApiKeysPanel slug={slug} pc={pc} keys={apiKeys} onRefresh={loadApiKeys} />
        )}
      </div>
    </div>
  )
}

const ORG_API_PERM_OPTIONS: { key: string; label: string }[] = [
  { key: "quiz:read", label: "Read quizzes" },
  { key: "quiz:write", label: "Create / edit quizzes" },
  { key: "user:read", label: "Read users" },
  { key: "user:write", label: "Manage users" },
  { key: "leaderboard:read", label: "Leaderboard" },
  { key: "analytics:read", label: "Analytics" },
  { key: "certificate:read", label: "Read certificates" },
  { key: "certificate:write", label: "Issue certificates" },
  { key: "tournament:read", label: "Read tournaments" },
  { key: "tournament:write", label: "Manage tournaments" },
]

function OrgApiKeysPanel({ slug, pc, keys, onRefresh }: { slug: string; pc: string; keys: OrgApiKeyRow[]; onRefresh: () => void }) {
  const [name, setName] = useState("")
  const [perms, setPerms] = useState<string[]>(["quiz:read", "analytics:read"])
  const [rateLimit, setRateLimit] = useState(100)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [createdKey, setCreatedKey] = useState("")

  const togglePerm = (p: string) => {
    setPerms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))
  }

  const createKey = async () => {
    if (!name.trim()) {
      setError("Name required")
      return
    }
    if (!perms.length) {
      setError("Select at least one permission")
      return
    }
    setSaving(true)
    setError("")
    try {
      const res = await fetch(`/api/org/${slug}/api-keys`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), permissions: perms, rateLimit }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(j.error || "Failed to create key")
        setSaving(false)
        return
      }
      if (j?.data?.key) {
        setCreatedKey(j.data.key)
        setName("")
        onRefresh()
      }
    } catch {
      setError("Network error")
    }
    setSaving(false)
  }

  if (createdKey) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
        <h2 className="text-lg font-black">API key created</h2>
        <p className="text-xs text-white/50">Copy this secret now. It will not be shown again.</p>
        <div className="rounded-xl bg-black/50 border border-white/10 p-3 font-mono text-xs text-cyan-300 break-all select-all">{createdKey}</div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { void navigator.clipboard.writeText(createdKey) }}
            className="rounded-lg px-4 py-2 text-xs font-bold text-white"
            style={{ background: pc }}
          >
            Copy
          </button>
          <button type="button" onClick={() => setCreatedKey("")} className="rounded-lg border border-white/15 px-4 py-2 text-xs font-bold text-white/70 hover:text-white">
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">API keys</h2>
            <p className="text-xs text-white/50 mt-1 max-w-xl">
              Create keys for your LMS, portal, or internal tools. Keys are scoped to <span className="text-white/70 font-mono">{slug}</span> only.
              Technical reference: <Link href="/more/api-guide" className="text-cyan-400 underline hover:text-cyan-300">Integration guide</Link>
            </p>
          </div>
          <button type="button" onClick={onRefresh} className="rounded-lg px-3 py-1.5 text-[10px] font-bold text-white shrink-0" style={{ background: pc }}>Refresh</button>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Integration name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white"
            placeholder="e.g. College LMS production"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2 block">Permissions</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ORG_API_PERM_OPTIONS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => togglePerm(p.key)}
                className={`text-left rounded-lg border px-3 py-2 text-xs transition-all ${perms.includes(p.key) ? "border-cyan-500/40 bg-cyan-500/10 text-white" : "border-white/10 bg-black/20 text-white/50 hover:text-white/80"}`}
              >
                <span className="font-bold">{p.label}</span>
                <span className="block text-[9px] text-white/35 font-mono mt-0.5">{p.key}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Rate limit (requests / hour)</label>
          <input
            type="number"
            min={1}
            max={5000}
            value={rateLimit}
            onChange={(e) => setRateLimit(Number(e.target.value))}
            className="w-full max-w-xs rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white"
          />
        </div>
        {error && <p className="text-red-400 text-xs font-bold">{error}</p>}
        <button type="button" onClick={() => void createKey()} disabled={saving} className="rounded-xl px-6 py-3 text-sm font-black text-white" style={{ background: pc }}>
          {saving ? "Creating…" : "Generate key"}
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5">
          <h3 className="font-black text-sm">Your keys ({keys.length})</h3>
        </div>
        {!keys.length ? (
          <div className="p-6 text-sm text-white/40">No API keys yet.</div>
        ) : (
          keys.map((k) => (
            <div key={k.id} className="px-5 py-3 border-b border-white/5 last:border-0 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-bold text-sm text-white">{k.name}</div>
                <div className="font-mono text-[10px] text-white/30 mt-0.5">{k.key}</div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {k.permissions.map((p) => (
                    <span key={p} className="rounded bg-white/5 px-1.5 py-0.5 text-[8px] font-bold text-white/40">{p}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="text-xs font-bold text-white/60">{k.requestsToday.toLocaleString()}</div>
                  <div className="text-[9px] text-white/30">today</div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await fetch(`/api/org/${slug}/api-keys/${k.id}`, {
                      method: "PATCH",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ active: !k.active }),
                    })
                    onRefresh()
                  }}
                  className={`w-10 h-5 rounded-full transition-colors ${k.active ? "bg-emerald-500/60" : "bg-white/10"}`}
                  aria-label={k.active ? "Disable key" : "Enable key"}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${k.active ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function CreateQuizForm({ slug, pc, onDone }: { slug: string; pc: string; onDone: () => void }) {
  const [title, setTitle] = useState("")
  const [quizType, setQuizType] = useState<"practice" | "exam" | "speed" | "revision" | "assignment" | "current_affairs">("practice")
  const [category, setCategory] = useState("General")
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium")
  const [mode, setMode] = useState<"builder" | "json" | "import">("builder")
  const [questionsText, setQuestionsText] = useState("")
  const [builderQuestions, setBuilderQuestions] = useState<Array<{ question: string; options: string[]; correct: number; explanation?: string }>>([
    { question: "", options: ["", "", "", ""], correct: 0, explanation: "" }
  ])
  const [importFile, setImportFile] = useState<File | null>(null)
  const [published, setPublished] = useState(false)
  const [aiCount, setAiCount] = useState(10)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const generateWithAi = async () => {
    setAiGenerating(true)
    setError("")
    try {
      const res = await fetch(`/api/org/${slug}/quizzes/generate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, quizType, category, difficulty, count: aiCount }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) {
        setError(j.error || "AI generation failed")
        return
      }
      setBuilderQuestions(j.data.questions)
      setMode("builder")
    } catch {
      setError("AI network error")
    } finally {
      setAiGenerating(false)
    }
  }

  const handleSubmit = async () => {
    if (!title.trim()) { setError("Title required"); return }
    setSaving(true); setError("")
    let questions: { question: string; options: string[]; correct: number; explanation?: string }[] = []
    if (mode === "builder") {
      questions = builderQuestions
        .map((q) => ({
          question: q.question.trim(),
          options: q.options.map((o) => o.trim()).filter(Boolean),
          correct: Number(q.correct),
          explanation: q.explanation?.trim() || undefined
        }))
        .filter((q) => q.question && q.options.length === 4 && q.correct >= 0 && q.correct <= 3)
      if (!questions.length) {
        setError("Please add at least one complete question in builder mode.")
        setSaving(false)
        return
      }
    } else if (mode === "json") {
      try {
        questions = JSON.parse(questionsText)
        if (!Array.isArray(questions)) throw new Error("Must be an array")
      } catch {
        setError("Questions must be valid JSON array. Format: [{ \"question\": \"...\", \"options\": [\"A\",\"B\",\"C\",\"D\"], \"correct\": 0 }]")
        setSaving(false); return
      }
    } else {
      if (!importFile) {
        setError("Please choose a .json or .pdf file to import.")
        setSaving(false)
        return
      }
      try {
        const fd = new FormData()
        fd.append("file", importFile)
        fd.append("title", title)
        fd.append("category", category)
        fd.append("difficulty", difficulty)
        fd.append("published", String(published))
        const res = await fetch(`/api/org/${slug}/quizzes/import`, { method: "POST", credentials: "include", body: fd })
        const j = await res.json()
        if (j.ok) onDone()
        else setError(j.error || "Import failed")
      } catch {
        setError("Network error")
      } finally {
        setSaving(false)
      }
      return
    }
    try {
      const res = await fetch(`/api/org/${slug}/quizzes`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, quizType, category, difficulty, questions, published })
      })
      const j = await res.json()
      if (j.ok) onDone()
      else setError(j.error || "Failed")
    } catch { setError("Network error") }
    finally { setSaving(false) }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
      <h2 className="text-lg font-black">Create Quiz</h2>
      <div>
        <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Quiz Type</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {([
            { key: "practice", label: "Practice" },
            { key: "exam", label: "Exam" },
            { key: "speed", label: "Speed" },
            { key: "revision", label: "Revision" },
            { key: "assignment", label: "Assignment" },
            { key: "current_affairs", label: "Current Affairs" },
          ] as const).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setQuizType(t.key)}
              className={`rounded-lg border px-3 py-2 text-xs font-bold transition-all ${quizType === t.key ? "text-white" : "text-white/40 border-white/10 bg-white/[0.03]"}`}
              style={quizType === t.key ? { background: `${pc}20`, borderColor: `${pc}40` } : {}}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {([
          { key: "builder", label: "Builder" },
          { key: "json", label: "JSON" },
          { key: "import", label: "Import" }
        ] as const).map((m) => (
          <button key={m.key} onClick={() => setMode(m.key)} className={`rounded-lg border px-3 py-2 text-xs font-bold transition-all ${mode === m.key ? "text-white" : "text-white/40 border-white/10 bg-white/[0.03]"}`} style={mode === m.key ? { background: `${pc}20`, borderColor: `${pc}40` } : {}}>
            {m.label}
          </button>
        ))}
      </div>
      <div>
        <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2" style={{ "--tw-ring-color": `${pc}50` } as React.CSSProperties} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Category</label>
          <input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Difficulty</label>
          <div className="flex gap-2">
            {(["Easy", "Medium", "Hard"] as const).map((d) => (
              <button key={d} onClick={() => setDifficulty(d)} className={`flex-1 rounded-lg border px-3 py-2.5 text-xs font-bold transition-all ${difficulty === d ? "text-white" : "text-white/40 border-white/10 bg-white/[0.03]"}`} style={difficulty === d ? { background: `${pc}20`, borderColor: `${pc}40` } : {}}>
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4 space-y-3">
        <div className="text-[10px] font-black uppercase tracking-widest text-cyan-200">AI quiz builder</div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            max={30}
            value={aiCount}
            onChange={(e) => setAiCount(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
            className="w-24 rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-white"
          />
          <button type="button" onClick={() => void generateWithAi()} disabled={aiGenerating} className="rounded-lg border border-cyan-400/40 px-4 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-500/20">
            {aiGenerating ? "Generating..." : "Generate Questions with AI"}
          </button>
        </div>
      </div>
      {mode === "json" && (
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Questions (JSON array)</label>
          <textarea value={questionsText} onChange={(e) => setQuestionsText(e.target.value)} rows={8} className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-xs text-white font-mono focus:outline-none focus:ring-2" style={{ "--tw-ring-color": `${pc}50` } as React.CSSProperties} placeholder={'[\n  { "question": "What is 2+2?", "options": ["3","4","5","6"], "correct": 1 }\n]'} />
        </div>
      )}
      {mode === "import" && (
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Import File (.json or .pdf)</label>
          <input type="file" accept=".json,.pdf,application/json,application/pdf" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-xs text-white" />
        </div>
      )}
      {mode === "builder" && (
        <div className="space-y-4">
          {builderQuestions.map((q, idx) => (
            <div key={idx} className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-black text-white/60 uppercase tracking-wider">Question {idx + 1}</div>
                {builderQuestions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setBuilderQuestions((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-[10px] font-bold text-red-300 hover:text-red-200"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                value={q.question}
                onChange={(e) => setBuilderQuestions((prev) => prev.map((item, i) => i === idx ? { ...item, question: e.target.value } : item))}
                className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white"
                placeholder="Enter question"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {q.options.map((opt, oi) => (
                  <input
                    key={oi}
                    value={opt}
                    onChange={(e) => setBuilderQuestions((prev) => prev.map((item, i) => i === idx ? { ...item, options: item.options.map((o, j) => j === oi ? e.target.value : o) } : item))}
                    className="rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-white"
                    placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={q.correct}
                  onChange={(e) => setBuilderQuestions((prev) => prev.map((item, i) => i === idx ? { ...item, correct: Number(e.target.value) } : item))}
                  className="rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-white"
                >
                  <option value={0}>Correct: A</option>
                  <option value={1}>Correct: B</option>
                  <option value={2}>Correct: C</option>
                  <option value={3}>Correct: D</option>
                </select>
                <input
                  value={q.explanation ?? ""}
                  onChange={(e) => setBuilderQuestions((prev) => prev.map((item, i) => i === idx ? { ...item, explanation: e.target.value } : item))}
                  className="rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-white"
                  placeholder="Explanation (optional)"
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setBuilderQuestions((prev) => [...prev, { question: "", options: ["", "", "", ""], correct: 0, explanation: "" }])}
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white/70 hover:text-white"
          >
            + Add Question
          </button>
        </div>
      )}
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="rounded" />
        <span className="text-xs text-white/70 font-bold">Publish immediately (visible to students)</span>
      </label>
      {error && <p className="text-red-400 text-xs font-bold">{error}</p>}
      <div className="flex gap-3">
        <button onClick={handleSubmit} disabled={saving} className="rounded-xl px-6 py-3 text-sm font-black text-white" style={{ background: pc }}>{saving ? "Creating…" : "Create Quiz"}</button>
        <button onClick={onDone} className="rounded-xl border border-white/10 px-6 py-3 text-sm font-bold text-white/50 hover:text-white">Cancel</button>
      </div>
    </div>
  )
}

function AddMemberForm({ slug, pc, onDone }: { slug: string; pc: string; onDone: () => void }) {
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"student" | "teacher" | "admin">("student")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [bulkCsv, setBulkCsv] = useState("")
  const [bulkSummary, setBulkSummary] = useState("")
  const [sendBulkInviteEmails, setSendBulkInviteEmails] = useState(true)
  const [sendSingleInviteEmail, setSendSingleInviteEmail] = useState(true)

  const parseCsv = (csvText: string) => {
    const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    if (lines.length < 2) return []
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())
    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim())
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = values[i] ?? "" })
      return row
    })
  }

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) { setError("Username and password required"); return }
    if (password.length < 4) { setError("Password must be at least 4 characters"); return }
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/org/${slug}/members`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          displayName: displayName.trim() || username.trim(),
          email: email.trim() || undefined,
          password,
          role,
          sendInviteEmail: sendSingleInviteEmail && Boolean(email.trim()),
        })
      })
      const j = await res.json()
      if (j.ok) onDone()
      else setError(j.error || "Failed")
    } catch { setError("Network error") }
    finally { setSaving(false) }
  }

  const handleBulkImport = async () => {
    setError("")
    setBulkSummary("")
    const rows = parseCsv(bulkCsv)
    if (!rows.length) {
      setError("CSV must include header + at least one row")
      return
    }
    setSaving(true)
    try {
      const normalized = rows.map((r) => ({
        username: r.username || r.user || "",
        displayName: r.displayname || r.display_name || r.name || "",
        email: r.email || "",
        password: r.password || "",
        role: (r.role || "student").toLowerCase(),
        phone: r.phone || "",
        department: r.department || "",
        grade: r.grade || "",
      }))
      const res = await fetch(`/api/org/${slug}/members/bulk`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: normalized, sendInviteEmails: sendBulkInviteEmails }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) {
        setError(j.error || "Bulk import failed")
        return
      }
      const emailPart = sendBulkInviteEmails
        ? ` Email sent: ${j.data.inviteEmailSent ?? 0}, failed: ${j.data.inviteEmailFailed ?? 0}.`
        : ""
      setBulkSummary(`Imported ${j.data.createdCount} members. Failed: ${j.data.failedCount}.${emailPart}`)
      onDone()
    } catch {
      setError("Network error")
    } finally {
      setSaving(false)
    }
  }

  const onCsvFilePicked = async (file: File | null) => {
    if (!file) return
    const text = await file.text()
    setBulkCsv(text)
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
      <h2 className="text-lg font-black">Add Member</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Username *</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2" style={{ "--tw-ring-color": `${pc}50` } as React.CSSProperties} placeholder="john.doe" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Display Name</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none" placeholder="John Doe" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none" placeholder="john@school.edu" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Password *</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none" />
        </div>
      </div>
      <div>
        <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Role</label>
        <div className="flex gap-2">
          {(["student", "teacher", "admin"] as const).map((r) => (
            <button key={r} onClick={() => setRole(r)} className={`flex-1 rounded-lg border px-3 py-2.5 text-xs font-bold capitalize transition-all ${role === r ? "text-white" : "text-white/40 border-white/10"}`} style={role === r ? { background: `${pc}20`, borderColor: `${pc}40` } : {}}>
              {r}
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-[11px] text-white/70">
        <input
          type="checkbox"
          checked={sendSingleInviteEmail}
          onChange={(e) => setSendSingleInviteEmail(e.target.checked)}
          className="rounded"
        />
        Send invite email with login link and temporary password (requires email)
      </label>
      <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-2">
        <div className="text-[10px] font-black uppercase tracking-widest text-white/50">Bulk CSV import</div>
        <p className="text-[11px] text-white/45">
          Header format: username,displayName,email,password,role,phone,department,grade
        </p>
        <textarea
          value={bulkCsv}
          onChange={(e) => setBulkCsv(e.target.value)}
          rows={6}
          className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-white font-mono"
          placeholder={"username,displayName,email,password,role,phone,department,grade\njohn,John Doe,john@school.edu,Temp#1234,student,9876543210,Science,10"}
        />
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => { void onCsvFilePicked(e.target.files?.[0] ?? null) }}
          className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-white"
        />
        <label className="flex items-center gap-2 text-[11px] text-white/70">
          <input
            type="checkbox"
            checked={sendBulkInviteEmails}
            onChange={(e) => setSendBulkInviteEmails(e.target.checked)}
            className="rounded"
          />
          Send invite emails with username and temporary password
        </label>
        <button onClick={handleBulkImport} disabled={saving} className="rounded-lg border border-cyan-500/30 px-4 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/10">
          {saving ? "Importing…" : "Import CSV Members"}
        </button>
        {bulkSummary && <p className="text-[11px] font-bold text-emerald-300">{bulkSummary}</p>}
      </div>
      {error && <p className="text-red-400 text-xs font-bold">{error}</p>}
      <div className="flex gap-3">
        <button onClick={handleSubmit} disabled={saving} className="rounded-xl px-6 py-3 text-sm font-black text-white" style={{ background: pc }}>{saving ? "Adding…" : "Add Member"}</button>
        <button onClick={onDone} className="rounded-xl border border-white/10 px-6 py-3 text-sm font-bold text-white/50 hover:text-white">Cancel</button>
      </div>
    </div>
  )
}
