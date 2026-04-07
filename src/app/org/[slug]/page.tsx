"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

type OrgInfo = { name: string; slug: string; type: string; logo?: string; tagline?: string; primaryColor: string; accentColor: string }
type Quiz = { id: string; title: string; category: string; difficulty: string; questionCount: number; published: boolean; createdAt: string }
type LBEntry = { memberId: string; memberName: string; totalScore: number; quizzesTaken: number; avgScore: number; rank: number }
type SessionInfo = { loggedIn: boolean; role: string; name: string; orgName: string }

export default function OrgPortalPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [org, setOrg] = useState<OrgInfo | null>(null)
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [leaderboard, setLeaderboard] = useState<LBEntry[]>([])
  const [view, setView] = useState<"quizzes" | "leaderboard" | "profile">("quizzes")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/org/${slug}/info`).then((r) => r.json()),
      fetch(`/api/org/${slug}/auth`, { credentials: "include" }).then((r) => r.json()),
    ]).then(([info, auth]) => {
      if (info.ok) setOrg(info.data)
      if (auth.loggedIn) setSession(auth)
      else router.replace(`/org/${slug}/login`)
    }).catch(() => router.replace(`/org/${slug}/login`))
      .finally(() => setLoading(false))
  }, [slug, router])

  const loadQuizzes = useCallback(() => {
    fetch(`/api/org/${slug}/quizzes`, { credentials: "include" }).then((r) => r.json()).then((j) => {
      if (j.ok) setQuizzes(j.data)
    }).catch(() => {})
  }, [slug])

  const loadLeaderboard = useCallback(() => {
    fetch(`/api/org/${slug}/leaderboard`, { credentials: "include" }).then((r) => r.json()).then((j) => {
      if (j.ok) setLeaderboard(j.data)
    }).catch(() => {})
  }, [slug])

  useEffect(() => {
    if (!session?.loggedIn) return
    loadQuizzes()
    loadLeaderboard()
  }, [session, loadQuizzes, loadLeaderboard])

  const handleLogout = async () => {
    await fetch(`/api/org/${slug}/auth`, { method: "DELETE", credentials: "include" })
    router.replace(`/org/${slug}/login`)
  }

  if (loading || !org || !session) {
    return (
      <div className="min-h-screen app-page-surface flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    )
  }

  const pc = org.primaryColor || "#7c3aed"

  return (
    <div className="min-h-screen app-page-surface text-white">
      <header className="border-b border-white/5 bg-[#060a14]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0" style={{ background: `${pc}30`, border: `1px solid ${pc}40` }}>
              {org.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h1 className="font-black text-sm text-white truncate">{org.name}</h1>
              <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Welcome, {session.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {(session.role === "owner" || session.role === "admin") && (
              <Link href={`/org/${slug}/dashboard`} className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[10px] font-bold text-white/70 hover:text-white hover:border-white/20 transition-all">
                Dashboard
              </Link>
            )}
            <button onClick={handleLogout} className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[10px] font-bold text-red-400 hover:bg-red-500/15 transition-all">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <nav className="border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-1 py-2">
          {(["quizzes", "leaderboard"] as const).map((t) => (
            <button key={t} onClick={() => setView(t)} className={`rounded-lg px-4 py-2 text-xs font-bold capitalize transition-all ${view === t ? "text-white" : "text-white/40 hover:text-white/70"}`} style={view === t ? { background: `${pc}20`, border: `1px solid ${pc}35` } : { background: "transparent", border: "1px solid transparent" }}>
              {t}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {view === "quizzes" && (
          <div className="space-y-4">
            <h2 className="text-lg font-black">Available Quizzes</h2>
            {!quizzes.length ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📝</div>
                <p className="text-white/40 text-sm">No quizzes available yet. Check back soon.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {quizzes.map((q) => (
                  <Link key={q.id} href={`/org/${slug}/quiz/${q.id}`} className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-white/20 hover:bg-white/[0.05] transition-all">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-bold text-sm text-white group-hover:text-cyan-200 transition-colors">{q.title}</h3>
                      <span className={`shrink-0 rounded-md px-2 py-0.5 text-[9px] font-black uppercase ${q.difficulty === "Hard" ? "bg-red-500/15 text-red-300" : q.difficulty === "Medium" ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                        {q.difficulty}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-white/40 font-bold uppercase tracking-wider">
                      <span>{q.category}</span>
                      <span>·</span>
                      <span>{q.questionCount} Qs</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {view === "leaderboard" && (
          <div className="space-y-4">
            <h2 className="text-lg font-black">Leaderboard</h2>
            {!leaderboard.length ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🏆</div>
                <p className="text-white/40 text-sm">No scores yet. Be the first to take a quiz!</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 overflow-hidden">
                <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-4 px-5 py-3 text-[9px] font-black uppercase tracking-widest text-white/30 border-b border-white/5">
                  <span>#</span><span>Name</span><span>Score</span><span>Quizzes</span><span>Avg</span>
                </div>
                {leaderboard.map((e) => (
                  <div key={e.memberId} className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-4 px-5 py-3 text-sm border-b border-white/5 last:border-0 items-center hover:bg-white/[0.02] transition-colors">
                    <span className="text-white/40 font-black text-xs w-8">{e.rank}</span>
                    <span className="font-bold text-white truncate">{e.memberName}</span>
                    <span className="font-black tabular-nums" style={{ color: pc }}>{e.totalScore}</span>
                    <span className="text-white/50 text-xs tabular-nums">{e.quizzesTaken}</span>
                    <span className="text-white/50 text-xs tabular-nums">{e.avgScore}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-white/5 py-6 text-center text-[10px] text-white/20 uppercase tracking-widest font-bold">
        Powered by IQ Earners
      </footer>
    </div>
  )
}
