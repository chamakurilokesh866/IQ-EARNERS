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
import NeonParticles from "../../components/NeonParticles"
import { SparklesIcon, UserIcon, GiftIcon, RocketIcon } from "../../components/AnimatedIcons"

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
    icon: "daily",
    primary: true,
    badge: "LIVE"
  },
  {
    label: "Tournaments",
    desc: "Compete in timed events & win prizes",
    href: "/tournaments",
    icon: "tournament",
    primary: false,
    badge: null
  },
  {
    label: "Leaderboard",
    desc: "See where you rank globally",
    href: "/leaderboard",
    icon: "leaderboard",
    primary: false,
    badge: null
  },
  {
    label: "My Profile",
    desc: "View stats & earned rewards",
    href: "/user",
    icon: "profile",
    primary: false,
    badge: null
  }
]

const QUIZ_CATEGORIES = [
  { label: "Tech", icon: "💻", grad: "from-violet-500/35 to-cyan-500/25" },
  { label: "Sports", icon: "🏅", grad: "from-cyan-500/35 to-blue-500/25" },
  { label: "Movies", icon: "🎬", grad: "from-fuchsia-500/35 to-violet-500/25" },
  { label: "GK", icon: "🌍", grad: "from-blue-500/35 to-indigo-500/25" },
] as const

function QuickActionIcon({ kind }: { kind: "daily" | "tournament" | "leaderboard" | "profile" }) {
  const cls = "text-white"
  if (kind === "daily") return <RocketIcon size={20} className={cls} />
  if (kind === "tournament") return <GiftIcon size={20} className={cls} />
  if (kind === "leaderboard") return <SparklesIcon size={20} className={cls} />
  return <UserIcon size={20} className={cls} />
}

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
  const [miniLeaderboard, setMiniLeaderboard] = useState<Array<{ name: string; score: number }>>([])
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
      const top = lbData.slice(0, 5).map((p: any) => ({ name: String(p?.name ?? "Player"), score: Number(p?.score ?? 0) }))
      setMiniLeaderboard(top)
      setQuickStats({ streak, rank, todayDone: false, myScore })
    }).catch(() => showToast("Failed to load dashboard", "error"))
  }, [username, showToast])

  return (
    <PaidGate>
      {/* ── Paper-style CSS (scoped via className prefix "qp-") ── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <NeonParticles className="opacity-50" />
      </div>
      <style>{`
        .qp-card {
          background: var(--nebula-card-bg);
          border: 1px solid var(--nebula-card-border);
          border-radius: 24px;
          padding: 24px;
          box-shadow: var(--nebula-shadow-glow);
          backdrop-filter: blur(20px);
          position: relative;
          overflow: hidden;
        }
        .qp-card::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(139,92,246,0.05) 0%, transparent 100%);
          pointer-events: none;
        }
        .qp-card:hover {
          border-color: rgba(139,92,246,0.3);
          transform: translateY(-2px);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .qp-section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.4);
          margin-bottom: 24px;
        }
        .qp-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 8px;
          background: rgba(34, 211, 238, 0.1);
          color: #22d3ee;
          border: 1px solid rgba(34, 211, 238, 0.2);
        }
        .qp-action-primary {
          background: var(--nebula-primary);
          color: white;
          box-shadow: 0 0 30px rgba(139,92,246,0.3);
        }
        .qp-action-card {
           background: var(--nebula-card-bg);
           border: 1px solid var(--nebula-card-border);
           border-radius: 20px;
           padding: 24px;
           transition: all 0.4s var(--nebula-ease);
           position: relative;
           overflow: hidden;
        }
        .qp-action-card:hover {
          border-color: var(--nebula-primary);
          box-shadow: var(--nebula-shadow-glow);
          transform: translateY(-4px);
        }
        .qp-stat-pill {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 16px;
          padding: 16px;
          text-align: center;
        }
        @keyframes qp-fade-up {
          from { opacity:0; transform: translateY(20px); }
          to { opacity:1; transform: translateY(0); }
        }
        .qp-animate { animation: qp-fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .qp-animate-delay-1 { animation-delay: 0.1s; }
        .qp-animate-delay-2 { animation-delay: 0.2s; }
      `}</style>

      <main className="qp-page app-page-surface flex min-h-screen w-full flex-col min-h-0">
        <Navbar />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-2 pb-8 sm:pt-4 sm:pb-12 lg:pt-2 space-y-6">

          {/* ── Hero Banner ──────────────────────────────────────── */}
          <section className="qp-animate relative rounded-[2rem] overflow-hidden border border-white/5 bg-[#05050a] flex items-center">
            {/* Nebula Background Elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[80%] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
              <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[70%] rounded-full bg-cyan-400/5 blur-[100px]" />
              <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.03] mix-blend-overlay" />
              
              {/* Scanline Effect */}
              <div className="absolute inset-x-0 h-1/2 bg-gradient-to-b from-transparent via-primary/5 to-transparent animate-[nebula-scan_4s_linear_infinite]" />
            </div>

            <div className="relative z-10 w-full p-6 sm:p-10 flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
              <div className="flex-1 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[8px] font-black tracking-[0.3em] text-cyan-400 uppercase mb-4 sm:mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  Arena Status: Operational
                </div>
                
                <h1 className="flex flex-col lg:items-start items-center leading-none mb-6 relative group">
                  {username ? (
                    <>
                      <div className="flex flex-col mb-1 text-white/50">
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] leading-tight">Command</span>
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] leading-tight -mt-0.5">Centre:</span>
                      </div>
                      <span className="text-4xl sm:text-6xl font-black italic uppercase text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400 drop-shadow-[0_4px_12px_rgba(139,92,246,0.25)]" style={{ fontFamily: 'var(--font-display)' }}>
                        {username.toUpperCase()}
                      </span>
                    </>
                  ) : (
                    <span className="text-3xl sm:text-5xl font-black italic uppercase text-white leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
                      ELITE <span className="text-primary">COGNITIVE</span><br/>TERMINAL
                    </span>
                  )}
                </h1>
                
                <p className="max-w-md mx-auto lg:mx-0 text-white/40 text-[11px] sm:text-xs font-bold leading-relaxed mb-8 uppercase tracking-wider">
                  Welcome to the next generation of intellectual competition. Your cognitive metrics are being monitored.
                </p>

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                  {SUBJECTS.slice(0, 5).map((s) => (
                    <span key={s} className="text-[7px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white/30 whitespace-nowrap">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Stats Panel */}
              {mounted && publicStats !== null && (
                <div className="grid grid-cols-3 lg:grid-cols-1 gap-2.5 w-full lg:w-60">
                  {[
                    { label: "OPERATIVE", val: publicStats.totalPlayers ?? 0, suffix: "" },
                    { label: "NODES", val: publicStats.questionsInBank ?? 0, suffix: "+" },
                    { label: "CREDITS", val: publicStats.totalEarnings ?? 0, suffix: "₹" },
                  ].map((s, i) => (
                    <div key={i} className="p-3.5 sm:p-4 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-md relative group overflow-hidden flex flex-col items-center lg:items-start">
                      <div className="absolute inset-0 bg-primary/[0.03] opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="text-[7px] font-black uppercase tracking-[0.3em] text-white/25 mb-1">{s.label}</div>
                      <div className="text-xl sm:text-2xl font-black tracking-tighter text-white tabular-nums leading-none">
                        {s.suffix === "₹" ? "₹" : ""}
                        <AnimatedCount to={s.val} />
                        {s.suffix !== "₹" ? s.suffix : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

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
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${a.primary ? "bg-white/15" : "bg-[#334155]/35 text-cyan-200 border border-cyan-300/30"}`}>
                    <QuickActionIcon kind={a.icon as "daily" | "tournament" | "leaderboard" | "profile"} />
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

          {/* ── Category cards ─────────────────────────────────────── */}
          <section className="qp-animate qp-animate-delay-2">
            <div className="qp-section-header px-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(139,92,246,1)]" />
              Intelligence Domains
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
              {QUIZ_CATEGORIES.map((c) => (
                <TransitionLink
                  key={c.label}
                  href="/daily-quiz"
                  className={`group relative rounded-3xl border border-white/5 bg-white/[0.02] p-6 hover:border-primary/40 transition-all hover:-translate-y-1 overflow-hidden`}
                >
                   <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                   <div className="relative z-10">
                      <div className="text-3xl mb-4 group-hover:scale-125 transition-transform duration-500">{c.icon}</div>
                      <div className="text-sm font-black tracking-widest text-white uppercase">{c.label}</div>
                      <div className="text-[9px] font-bold text-white/30 mt-1 uppercase tracking-widest">Initialising...</div>
                   </div>
                </TransitionLink>
              ))}
            </div>
          </section>

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

              {/* Mini leaderboard preview */}
              <div className="qp-card">
                <div className="qp-section-header mb-4">
                  <span className="qp-section-dot" />
                  Mini Leaderboard
                </div>
                {!miniLeaderboard.length ? (
                  <div className="text-xs text-white/60">Leaderboard data will appear soon.</div>
                ) : (
                  <div className="space-y-2.5">
                    {miniLeaderboard.map((p, i) => (
                      <div key={`${p.name}-${i}`} className={`flex items-center justify-between rounded-xl border px-3 py-2 ${i < 3 ? "border-cyan-300/30 bg-cyan-500/10" : "border-white/10 bg-white/5"}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-black/25 border border-white/20 text-[10px] font-black flex items-center justify-center">#{i + 1}</span>
                          <span className="truncate text-sm font-bold text-white">{p.name}</span>
                        </div>
                        <span className="text-xs font-black text-cyan-200">{p.score}</span>
                      </div>
                    ))}
                    <TransitionLink href="/leaderboard" className="block text-center mt-1 text-[11px] font-black uppercase tracking-wider text-cyan-200 hover:text-white">
                      View Full Leaderboard
                    </TransitionLink>
                  </div>
                )}
              </div>

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
