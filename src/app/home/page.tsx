"use client"

import Navbar from "../../components/Navbar"
import TransitionLink from "../../components/TransitionLink"
import Image from "next/image"
import { useEffect, useState, useRef } from "react"
import logoPng from "../prizes/icon.png"
import dynamic from "next/dynamic"
import PaidGate from "../../components/PaidGate"
import { useBootstrap } from "@/hooks/useBootstrap"
import { useToast } from "@/context/ToastContext"
import LiveMegaTournamentBanner from "../../components/LiveMegaTournamentBanner"
import TransparencySection from "../../components/TransparencySection"
import AdSlot from "../../components/AdSlot"

const UpiRequestModal = dynamic(() => import("../../components/UpiRequestModal"), { ssr: false })
const VipModal = dynamic(() => import("../../components/VipModal"), { ssr: false })
const AffiliateProducts = dynamic(() => import("../../components/AffiliateProducts"), { ssr: false })
const AIRecommendations = dynamic(() => import("../../components/AIRecommendations"), { ssr: false })
import ActivityFeed, { type HomePublicStats } from "../../components/ActivityFeed"
import { QuizLaunchProgressBar } from "../../components/ProgressBarSide"



// ── Stat counter animation ────────────────────────────────────────────────────
function AnimatedCount({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0)
  const ref = useRef(false)
  useEffect(() => {
    if (ref.current) return
    ref.current = true
    let start = 0
    const step = Math.max(1, Math.ceil(to / 40))
    const id = setInterval(() => {
      start += step
      if (start >= to) { setVal(to); clearInterval(id) }
      else setVal(start)
    }, 28)
    return () => clearInterval(id)
  }, [to])
  return <>{val.toLocaleString("en-IN")}{suffix}</>
}

// ── Subjects (decorative topic pills) ─────────────────────────────────────────
const SUBJECTS = [
  "General Knowledge", "Current Affairs", "Science", "History", "Polity",
  "Mathematics", "English", "Geography", "Economy", "Technology"
]

// ── Quick Actions ─────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  {
    label: "Daily Quiz",
    desc: "Answer today's questions & earn",
    href: "/daily-quiz",
    icon: "🎯",
    primary: true,
    badge: "LIVE"
  },
  {
    label: "Tournaments",
    desc: "Compete in timed events & win prizes",
    href: "/tournaments",
    icon: "🏆",
    primary: false,
    badge: null
  },
  {
    label: "Leaderboard",
    desc: "See where you rank globally",
    href: "/leaderboard",
    icon: "📊",
    primary: false,
    badge: null
  },
  {
    label: "My Profile",
    desc: "View stats & earned rewards",
    href: "/user",
    icon: "👤",
    primary: false,
    badge: null
  }
]

// ── QuizMaterials ─────────────────────────────────────────────────────────────
function QuizMaterialsSection() {
  const [materials, setMaterials] = useState<Array<{ id: string; title: string; url: string }>>([])
  useEffect(() => {
    fetch("/api/quiz-schedule/released", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setMaterials(Array.isArray(j?.data) ? j.data : []))
      .catch(() => { })
  }, [])
  if (!materials.length) return null
  return (
    <div className="qp-card">
      <div className="qp-section-header">
        <span className="qp-section-dot" />
        Study Materials
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        {materials.map((m) => (
          <a key={m.id} href={m.url} target="_self" rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#f8f9fc] border border-[#e8eaf0] hover:border-[#7c3aed]/40 hover:bg-[#eef3fe] transition-all group">
            <div className="flex items-center gap-3">
              <span className="text-xl">📄</span>
              <span className="text-sm font-semibold text-[#1a2340] group-hover:text-[#7c3aed] transition-colors">{m.title || "Material"}</span>
            </div>
            <span className="text-[#7c3aed] text-lg opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0">→</span>
          </a>
        ))}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [username, setUsername] = useState<string | null>(null)
  const [upiModalDismissed, setUpiModalDismissed] = useState(false)
  const [vipModalVisible, setVipModalVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [quickStats, setQuickStats] = useState<{ streak: number; rank: number | null; todayDone: boolean; myScore?: number }>({ streak: 0, rank: null, todayDone: false })
  const [liveMega, setLiveMega] = useState<{ prizePool: string; enrolled: number; capacity: number; liveQuizHour: number; liveQuizMinute: number; liveMegaTimeEnabled?: boolean } | null>(null)
  const [publicStats, setPublicStats] = useState<HomePublicStats | null>(null)
  const { data: bootstrap } = useBootstrap()
  const { showToast } = useToast()

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    let cancelled = false
    fetch("/api/stats/public", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setPublicStats(j?.data ?? {})
      })
      .catch(() => {
        if (!cancelled) setPublicStats({})
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const u = sessionStorage.getItem("login_username")
        if (u) { sessionStorage.removeItem("login_username"); setUsername(u) }
      } catch { }
    }
  }, [])

  useEffect(() => {
    if (bootstrap?.username) setUsername((prev) => prev || bootstrap.username)
    if (bootstrap?.vipModalEnabled && !sessionStorage.getItem("vip_modal_dismissed")) {
      setVipModalVisible(true)
    }
  }, [bootstrap])

  useEffect(() => {
    fetch("/api/live-mega", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (j?.ok && j?.data) setLiveMega(j.data) })
      .catch(() => { })
  }, [])

  useEffect(() => {
    if (!username) return
    Promise.all([
      fetch("/api/user/stats", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ data: {} })),
      fetch("/api/leaderboard", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ data: [] }))
    ]).then(([stats, lb]) => {
      const streak = stats?.data?.streak ?? 0
      const lbData = Array.isArray(lb?.data) ? lb.data : []
      const myIdx = lbData.findIndex((p: any) => String(p?.name).toLowerCase() === String(username).toLowerCase())
      const rank = myIdx >= 0 ? myIdx + 1 : null
      const myScore = myIdx >= 0 ? lbData[myIdx]?.score : undefined
      setQuickStats({ streak, rank, todayDone: false, myScore })
    }).catch(() => showToast("Failed to load dashboard", "error"))
  }, [username, showToast])

  return (
    <PaidGate>
      {/* ── Paper-style CSS (scoped via className prefix "qp-") ── */}
      <style>{`
        .qp-card {
          background: #ffffff;
          border: 1px solid #e8eaf0;
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 2px 12px rgba(30,40,80,0.06), 0 1px 3px rgba(30,40,80,0.04);
          transition: box-shadow 0.2s;
        }
        .qp-card:hover {
          box-shadow: 0 6px 24px rgba(30,40,80,0.1), 0 2px 6px rgba(30,40,80,0.06);
        }
        .qp-section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #8892a4;
        }
        .qp-section-dot {
          width: 6px;
          height: 18px;
          border-radius: 3px;
          background: #7c3aed;
          display: inline-block;
        }
        .qp-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          padding: 2px 8px;
          border-radius: 999px;
        }
        .qp-divider { height: 1px; background: linear-gradient(90deg, transparent, #e2e5f0, transparent); margin: 8px 0; }
        .qp-action-primary {
          background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
          color: white;
          border: none;
          box-shadow: 0 4px 18px rgba(124,58,237,0.35), inset 0 1px 0 rgba(255,255,255,0.15);
        }
        .qp-action-primary:hover {
          background: linear-gradient(135deg, #3d8bf7 0%, #2068e0 100%);
          box-shadow: 0 6px 24px rgba(124,58,237,0.45), inset 0 1px 0 rgba(255,255,255,0.15);
          transform: translateY(-1px);
        }
        .qp-action-card {
          background: white;
          border: 1px solid #e8eaf0;
          border-radius: 18px;
          padding: 22px 18px;
          cursor: pointer;
          transition: all 0.18s cubic-bezier(0.4,0,0.2,1);
          text-align: left;
          display: block;
          width: 100%;
          color: inherit;
          text-decoration: none;
          box-shadow: 0 1px 4px rgba(30,40,80,0.05);
        }
        .qp-action-card:hover {
          border-color: #7c3aed;
          box-shadow: 0 4px 16px rgba(124,58,237,0.12);
          transform: translateY(-2px);
        }
        .qp-action-card:active { transform: scale(0.98); }
        .qp-stat-pill {
          background: #f3f5fb;
          border: 1px solid #e2e5f0;
          border-radius: 12px;
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
        }
        @keyframes qp-fade-up {
          from { opacity:0; transform: translateY(14px); }
          to { opacity:1; transform: translateY(0); }
        }
        .qp-animate { animation: qp-fade-up 0.4s ease both; }
        .qp-animate-delay-1 { animation-delay: 0.06s; }
        .qp-animate-delay-2 { animation-delay: 0.12s; }
        .qp-animate-delay-3 { animation-delay: 0.18s; }
        .qp-hero-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.2);
          padding: 5px 14px; border-radius: 999px;
          font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #7c3aed;
        }
      `}</style>

      <main className="qp-page app-page-surface flex min-h-screen w-full flex-col min-h-0">
        <Navbar />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-2 pb-8 sm:pt-4 sm:pb-12 lg:pt-2 space-y-6">

          {/* ── Hero Banner ──────────────────────────────────────── */}
          <div className="qp-animate relative rounded-3xl overflow-hidden ring-1 ring-primary/25" style={{
            background: "linear-gradient(135deg, #1a0a2e 0%, #312e81 42%, #0f172a 100%)"
          }}>
            {/* Decorative patterns */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%)" }} />
              <div className="absolute -bottom-16 -left-16 w-60 h-60 rounded-full" style={{ background: "radial-gradient(circle, rgba(20,184,166,0.22) 0%, transparent 70%)" }} />
              {/* Grid lines */}
              <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            <div className="relative z-10 p-4 sm:p-8 md:p-12 flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8 min-w-0">
              <div className="flex-1 min-w-0">
                <div className="qp-hero-badge mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  India's #1 Quiz Platform
                </div>
                <h1 className="text-2xl sm:text-5xl font-black text-white leading-tight tracking-tight mb-3 break-words">
                  {username ? `Back to it, ${username}!` : "Challenge. Compete. Win."}
                </h1>
                <p className="text-white/60 text-base sm:text-lg font-medium max-w-lg leading-relaxed">
                  Sharpen your mind with daily quizzes, compete in live tournaments, and earn real rewards.
                </p>

                {/* Subject pills */}
                <div className="mt-5 flex flex-wrap gap-2">
                  {SUBJECTS.slice(0, 6).map((s) => (
                    <span key={s} className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                      style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Stats cluster — grid on mobile so wide ₹ / counts never clip (was flex-row + flex-1 overflow) */}
              {mounted && publicStats !== null && (
                <div className="grid w-full min-w-0 grid-cols-3 gap-2 sm:flex sm:w-auto sm:flex-col sm:gap-3 sm:shrink-0">
                  {[
                    {
                      label: "Community",
                      val: Math.max(publicStats.totalPlayers ?? 0, 1),
                      suffix: "+",
                    },
                    {
                      label: "Question bank",
                      val: Math.max(
                        publicStats.questionsInBank ?? 0,
                        (publicStats.quizzesCount ?? 0) * 5,
                        200
                      ),
                      suffix: "+",
                    },
                    {
                      label: "Rewards tracked",
                      val: Math.min(Math.max(Math.round(publicStats.totalEarnings ?? 0), 0), 9_999_999),
                      suffix: "₹",
                    },
                  ].map((s, i) => (
                    <div
                      key={i}
                      className="min-w-0 flex flex-col justify-center rounded-2xl px-2 py-2.5 text-center sm:flex-none sm:px-5 sm:py-3"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      <div className="text-base font-black tabular-nums leading-tight text-white sm:text-2xl">
                        {s.suffix === "₹" ? "₹" : ""}
                        <AnimatedCount to={s.val} />
                        {s.suffix !== "₹" ? s.suffix : ""}
                      </div>
                      <div className="mt-1 text-[8px] font-bold uppercase leading-tight tracking-wide text-white/40 sm:mt-0.5 sm:text-[10px] sm:tracking-widest">
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Quiz launch progress (real /api/progress) ─────────── */}
          {mounted && (
            <div className="qp-animate qp-animate-delay-1 max-w-2xl mx-auto w-full">
              <QuizLaunchProgressBar showWhenComplete />
            </div>
          )}

          {/* ── Quick Actions Grid ─────────────────────────────────── */}
          <div className="qp-animate qp-animate-delay-1 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {QUICK_ACTIONS.map((a) => (
              <TransitionLink
                key={a.href}
                href={a.href}
                className={`qp-action-card ${a.primary ? "qp-action-primary" : ""}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${a.primary ? "bg-white/15" : "bg-[#f0f4ff]"}`}>
                    {a.icon}
                  </div>
                  {a.badge && (
                    <span className={`qp-badge ${a.primary ? "bg-white/20 text-white" : "bg-[#e6effd] text-[#7c3aed]"}`}>
                      <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
                      {a.badge}
                    </span>
                  )}
                </div>
                <div className={`font-black text-base tracking-tight ${a.primary ? "text-white" : "text-[#1a2340]"}`}>{a.label}</div>
                <div className={`text-xs font-medium mt-1 leading-snug ${a.primary ? "text-white/70" : "text-[#6b7a99]"}`}>{a.desc}</div>
              </TransitionLink>
            ))}
          </div>

          {/* ── Main content + sidebar ─────────────────────────────── */}
          <div className="qp-animate qp-animate-delay-2 grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* ── Left column ─────────────────────────────────────── */}
            <div className="lg:col-span-8 space-y-6">

              {/* User stats card */}
              {username && (
                <div className="qp-card">
                  <div className="qp-section-header mb-5">
                    <span className="qp-section-dot" />
                    Your Performance
                  </div>
                  <div className="flex items-center gap-5 mb-6">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-[#7c3aed]/20 shrink-0 bg-[#f0f4ff] flex items-center justify-center">
                      <Image src={logoPng} alt="Avatar" width={32} height={32} className="h-8 w-8 object-contain" sizes="32px" />
                    </div>
                    <div>
                      <div className="text-xl font-black text-[#1a2340]">{username}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-semibold text-[#6b7a99]">Active today</span>
                      </div>
                    </div>
                    {quickStats.streak > 0 && (
                      <div className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-50 border border-orange-100">
                        <span className="text-xl">🔥</span>
                        <div>
                          <div className="text-lg font-black text-orange-600">{quickStats.streak}d</div>
                          <div className="text-[9px] font-bold uppercase text-orange-400 tracking-wider">Streak</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="qp-divider" />

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    {[
                      { label: "Global Rank", val: quickStats.rank ? `#${quickStats.rank}` : "—", icon: "🏆", color: "#f59e0b" },
                      { label: "Total Points", val: quickStats.myScore?.toLocaleString("en-IN") ?? "0", icon: "✨", color: "#7c3aed" },
                      { label: "Today's Status", val: quickStats.todayDone ? "Completed ✓" : "Pending", icon: "📅", color: quickStats.todayDone ? "#10b981" : "#ef4444" }
                    ].map((s, i) => (
                      <div key={i} className="qp-stat-pill text-center">
                        <div className="text-xl mb-1">{s.icon}</div>
                        <div className="text-lg font-black" style={{ color: s.color }}>{s.val}</div>
                        <div className="text-[9px] font-bold uppercase tracking-widest text-[#8892a4]">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Live tournament banner */}
              {liveMega?.liveMegaTimeEnabled && (
                <div>
                  <div className="qp-section-header mb-4 px-1">
                    <span className="relative flex">
                      <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                    </span>
                    Live Event
                  </div>
                  <div className="rounded-2xl overflow-hidden border border-[#e8eaf0]">
                    <LiveMegaTournamentBanner
                      prizePool={liveMega.prizePool}
                      enrolled={liveMega.enrolled}
                      capacity={liveMega.capacity}
                      liveQuizHour={liveMega.liveQuizHour ?? 20}
                      liveQuizMinute={liveMega.liveQuizMinute ?? 0}
                      liveMegaTimeEnabled={true}
                    />
                  </div>
                </div>
              )}

              {/* Why Choose Us */}
              <div className="qp-card">
                <div className="qp-section-header mb-5">
                  <span className="qp-section-dot" />
                  Why IQ Earners?
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { icon: "🧠", title: "AI-Powered Questions", desc: "Fresh, adaptive questions generated by AI daily" },
                    { icon: "🏆", title: "Live Tournaments", desc: "Compete in real-time with thousands of players" },
                    { icon: "💰", title: "Win Real Rewards", desc: "Cash prizes, vouchers & exclusive gifts" },
                    { icon: "📊", title: "Detailed Analytics", desc: "Track progress with in-depth performance stats" },
                    { icon: "🔒", title: "Fair & Secure", desc: "Anti-cheat system ensures every result is genuine" },
                    { icon: "🌐", title: "Multi-Language", desc: "Quiz in Hindi, Telugu, Tamil & 7 more languages" }
                  ].map((f, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-[#f8f9fc] border border-[#e8eaf0] hover:border-[#7c3aed]/30 hover:bg-[#eef3fe] transition-all">
                      <div className="text-2xl mb-2">{f.icon}</div>
                      <div className="text-sm font-black text-[#1a2340] leading-tight mb-1">{f.title}</div>
                      <div className="text-[11px] text-[#6b7a99] leading-snug">{f.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <QuizMaterialsSection />

              {/* Transparency section */}
              <div className="qp-card overflow-hidden">
                <TransparencySection />
              </div>


            </div>

            {/* ── Right column ────────────────────────────────────── */}
            <div className="lg:col-span-4 space-y-6">

              {/* Today's challenge CTA */}
              <div className="rounded-2xl overflow-hidden"
                style={{ background: "linear-gradient(135deg, #1e3a6e 0%, #0f2050 100%)" }}>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">🎯</div>
                    <div>
                      <div className="text-xs font-black uppercase tracking-widest text-white/40">Daily Challenge</div>
                      <div className="text-base font-black text-white">Today's Quiz</div>
                    </div>
                    <span className="ml-auto qp-badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active
                    </span>
                  </div>
                  <p className="text-sm text-white/60 mb-5 leading-relaxed">
                    Test your knowledge with today's curated questions. Beat the clock and climb the leaderboard!
                  </p>
                  <TransitionLink href="/daily-quiz"
                    className="block w-full text-center py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all active:scale-95"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #5b21b6)", color: "white", boxShadow: "0 4px 16px rgba(124,58,237,0.4)" }}>
                    Start Quiz Now →
                  </TransitionLink>
                </div>
              </div>

              {/* Activity Feed */}
              {mounted && (
                <div className="qp-card overflow-hidden p-0">
                  <div className="px-5 pt-5 pb-0 qp-section-header">
                    <span className="qp-section-dot" />
                    Live Activity
                  </div>
                  <ActivityFeed username={username} publicStats={publicStats} />
                </div>
              )}

              {/* AI Recommendations */}
              {username && (
                <div className="qp-card overflow-hidden p-0">
                  <div className="px-5 pt-5 pb-0 qp-section-header">
                    <span className="qp-section-dot" />
                    Recommended for You
                  </div>
                  <div className="p-5 pt-3">
                    <AIRecommendations username={username} />
                  </div>
                </div>
              )}

              {/* Ad */}
              <AdSlot slotId="home_sidebar_1" />

              {/* Quick links */}
              <div className="qp-card">
                <div className="qp-section-header mb-4">
                  <span className="qp-section-dot" />
                  Navigation
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "📋 Rules", href: "/more/rules" },
                    { label: "📜 Terms", href: "/more/terms" },
                    { label: "🔒 Privacy", href: "/more/privacy" },
                    { label: "💬 Support", href: "/more/faq" }
                  ].map((l) => (
                    <TransitionLink key={l.href} href={l.href}
                      className="text-center text-xs font-bold uppercase tracking-widest px-3 py-3 rounded-xl bg-[#f8f9fc] border border-[#e8eaf0] hover:border-[#7c3aed]/40 hover:bg-[#eef3fe] text-[#6b7a99] hover:text-[#7c3aed] transition-all">
                      {l.label}
                    </TransitionLink>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Affiliate Products ─────────────────────────────────── */}
          <div className="pb-10">
            <AffiliateProducts limit={3} />
          </div>
        </div>

        {/* Modals */}
        {username && !upiModalDismissed && (
          <UpiRequestModal username={username} onClose={() => setUpiModalDismissed(true)} />
        )}
        {vipModalVisible && (
          <VipModal
            title={(bootstrap?.vipModalTitle as string) || "VIP Membership"}
            image={bootstrap?.vipModalImage as string}
            link={(bootstrap?.vipModalLink as string) || "/tournaments"}
            buttonText={(bootstrap?.vipModalButtonText as string) || "Become VIP Now"}
            onClose={() => {
              setVipModalVisible(false)
              sessionStorage.setItem("vip_modal_dismissed", "true")
            }}
          />
        )}
      </main>
    </PaidGate>
  )
}
