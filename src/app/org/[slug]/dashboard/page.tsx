"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

type OrgInfo = { name: string; slug: string; type: string; primaryColor: string; accentColor: string }
type Member = { id: string; username: string; displayName: string; email?: string; role: string; active: boolean; joinedAt: string; quizzesTaken: number; totalScore: number }
type Quiz = { id: string; title: string; category: string; difficulty: string; questionCount: number; published: boolean; createdAt: string }
type SessionInfo = { loggedIn: boolean; role: string; name: string }

export default function OrgDashboardPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [org, setOrg] = useState<OrgInfo | null>(null)
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [tab, setTab] = useState<"overview" | "members" | "quizzes" | "create-quiz" | "add-member">("overview")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/org/${slug}/info`).then((r) => r.json()),
      fetch(`/api/org/${slug}/auth`, { credentials: "include" }).then((r) => r.json()),
    ]).then(([info, auth]) => {
      if (info.ok) setOrg(info.data)
      if (auth.loggedIn && (auth.role === "owner" || auth.role === "admin")) setSession(auth)
      else router.replace(`/org/${slug}/login`)
    }).catch(() => router.replace(`/org/${slug}/login`))
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

  useEffect(() => { if (session) { loadMembers(); loadQuizzes() } }, [session, loadMembers, loadQuizzes])

  if (loading || !org || !session) {
    return <div className="min-h-screen app-page-surface flex items-center justify-center"><div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" /></div>
  }

  const pc = org.primaryColor || "#7c3aed"
  const totalStudents = members.filter((m) => m.role === "student").length
  const totalQuizzes = quizzes.length
  const publishedQuizzes = quizzes.filter((q) => q.published).length

  return (
    <div className="min-h-screen app-page-surface text-white">
      <header className="border-b border-white/5 bg-[#060a14]/90 backdrop-blur-md sticky top-0 z-50">
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
            <button onClick={async () => { await fetch(`/api/org/${slug}/auth`, { method: "DELETE", credentials: "include" }); router.replace(`/org/${slug}/login`) }} className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[10px] font-bold text-red-400">Sign out</button>
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
          {(["overview", "members", "quizzes", "create-quiz", "add-member"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-3 py-2 text-xs font-bold capitalize transition-all ${tab === t ? "text-white" : "text-white/40 hover:text-white/70"}`} style={tab === t ? { background: `${pc}20`, border: `1px solid ${pc}35` } : { background: "transparent", border: "1px solid rgba(255,255,255,0.1)" }}>
              {t.replace("-", " ")}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-black mb-4">Quick Overview</h2>
            <p className="text-sm text-white/50 mb-4">Organization URL: <span className="text-cyan-400 font-mono text-xs">/org/{slug}</span></p>
            <p className="text-sm text-white/50 mb-2">Share the login link with your members:</p>
            <div className="rounded-xl bg-black/40 border border-white/10 p-3 font-mono text-xs break-all select-all" style={{ color: pc }}>
              {typeof window !== "undefined" ? `${window.location.origin}/org/${slug}/login` : `/org/${slug}/login`}
            </div>
          </div>
        )}

        {tab === "members" && (
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
              <h2 className="font-black text-sm">Members ({members.length})</h2>
              <button onClick={() => setTab("add-member")} className="rounded-lg px-3 py-1.5 text-[10px] font-bold text-white" style={{ background: pc }}>+ Add Member</button>
            </div>
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-5 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                <div className="min-w-0">
                  <div className="font-bold text-sm text-white">{m.displayName} <span className="text-white/30 text-xs">@{m.username}</span></div>
                  {m.email && <div className="text-[10px] text-white/30">{m.email}</div>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-white/50 tabular-nums">{m.quizzesTaken} quizzes · {m.totalScore} pts</span>
                  <span className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase ${m.role === "owner" ? "bg-amber-500/15 text-amber-300" : m.role === "admin" ? "bg-cyan-500/15 text-cyan-300" : m.role === "teacher" ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-white/40"}`}>
                    {m.role}
                  </span>
                </div>
              </div>
            ))}
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
                  <div className="text-[10px] text-white/40">{q.category} · {q.difficulty} · {q.questionCount} Qs · {q.published ? "Published" : "Draft"}</div>
                </div>
                <span className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase ${q.published ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-white/30"}`}>
                  {q.published ? "Live" : "Draft"}
                </span>
              </div>
            ))}
          </div>
        )}

        {tab === "create-quiz" && <CreateQuizForm slug={slug} pc={pc} onDone={() => { loadQuizzes(); setTab("quizzes") }} />}
        {tab === "add-member" && <AddMemberForm slug={slug} pc={pc} onDone={() => { loadMembers(); setTab("members") }} />}
      </div>
    </div>
  )
}

function CreateQuizForm({ slug, pc, onDone }: { slug: string; pc: string; onDone: () => void }) {
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("General")
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium")
  const [questionsText, setQuestionsText] = useState("")
  const [published, setPublished] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    if (!title.trim()) { setError("Title required"); return }
    setSaving(true); setError("")
    let questions: { question: string; options: string[]; correct: number; explanation?: string }[] = []
    try {
      questions = JSON.parse(questionsText)
      if (!Array.isArray(questions)) throw new Error("Must be an array")
    } catch {
      setError("Questions must be valid JSON array. Format: [{ \"question\": \"...\", \"options\": [\"A\",\"B\",\"C\",\"D\"], \"correct\": 0 }]")
      setSaving(false); return
    }
    try {
      const res = await fetch(`/api/org/${slug}/quizzes`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, category, difficulty, questions, published })
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
      <div>
        <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Questions (JSON array)</label>
        <textarea value={questionsText} onChange={(e) => setQuestionsText(e.target.value)} rows={8} className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-xs text-white font-mono focus:outline-none focus:ring-2" style={{ "--tw-ring-color": `${pc}50` } as React.CSSProperties} placeholder={'[\n  { "question": "What is 2+2?", "options": ["3","4","5","6"], "correct": 1 }\n]'} />
      </div>
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

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) { setError("Username and password required"); return }
    if (password.length < 4) { setError("Password must be at least 4 characters"); return }
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/org/${slug}/members`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), displayName: displayName.trim() || username.trim(), email: email.trim() || undefined, password, role })
      })
      const j = await res.json()
      if (j.ok) onDone()
      else setError(j.error || "Failed")
    } catch { setError("Network error") }
    finally { setSaving(false) }
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
      {error && <p className="text-red-400 text-xs font-bold">{error}</p>}
      <div className="flex gap-3">
        <button onClick={handleSubmit} disabled={saving} className="rounded-xl px-6 py-3 text-sm font-black text-white" style={{ background: pc }}>{saving ? "Adding…" : "Add Member"}</button>
        <button onClick={onDone} className="rounded-xl border border-white/10 px-6 py-3 text-sm font-bold text-white/50 hover:text-white">Cancel</button>
      </div>
    </div>
  )
}
