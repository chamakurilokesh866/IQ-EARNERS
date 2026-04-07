"use client"

import type { ActivityItem, PaymentItem, ReferralItem } from "@/types/api"
import PaidGate from "../../components/PaidGate"
import Navbar from "../../components/Navbar"
import { useSearchParams, useRouter } from "next/navigation"
import TransitionLink from "../../components/TransitionLink"
import Link from "next/link"
import { countryToFlag } from "../../utils/countries"
import { useEffect, useMemo, useRef, useState } from "react"
import { generateQuizPdf } from "@/lib/generateQuizPdf"
import ShareCard from "../../components/ShareCard"
import { generateCertificate } from "../../utils/certificatePdf"
import ProgressRing from "../../components/ProgressRing"
import ReferralStatusBar from "../../components/ReferralStatusBar"
import DashboardTour from "../../components/DashboardTour"
import UserInsights from "../../components/UserInsights"
import SkillRadar from "../../components/SkillRadar"
import BragCard from "../../components/BragCard"
import { BADGES } from "../../lib/badges"
import { useDashboardTour } from "../../components/ProgressBarSide"
import { UserDashboardSkeleton } from "../../components/Skeleton"
import { performLogout } from "@/lib/logout"
import { PARENT_COMPANY_NAME } from "@/lib/seo"
import { useToast } from "@/context/ToastContext"
import { useNotificationsOptional } from "@/context/NotificationContext"
import AdSlot from "../../components/AdSlot"
import ContactForm from "../../components/ContactForm"
import { SpinAndWin, PENDING_SPIN_LS } from "@/components/SpinWheel"
import {
  MAX_WITHDRAWAL_PER_REQUEST_INR,
  REFERRAL_CREDIT_INR,
  WITHDRAWAL_THRESHOLD_INR,
} from "@/lib/referralWalletConstants"

function Stat({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div className="bg-white dark:bg-slate-900/90 border border-[#e8eaf0] dark:border-white/10 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-[10px] font-black uppercase tracking-widest text-[#8892a4] dark:text-slate-400 truncate">{label}</div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="text-2xl font-black text-[#1a2340] dark:text-slate-100 tabular-nums truncate">{value}</div>
        {trend ? (
          <div className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider shrink-0">
            {trend}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function Chart({ points }: { points: number[] }) {
  const pts = useMemo(() => points ?? [], [points])
  const width = 640
  const height = 220
  const step = pts.length > 1 ? width / (pts.length - 1) : width
  const path = pts.length > 1 ? pts.map((p, i) => `${i * step},${height - Math.min(100, p) / 100 * height}`).join(" ") : ""
  return (
    <div className="bg-white dark:bg-slate-900/90 border border-[#e8eaf0] dark:border-white/10 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="text-xs font-black uppercase tracking-widest text-[#1a2340] dark:text-slate-100">Performance Trend</div>
        <div className="px-3 py-1 rounded-full bg-[#f8fafc] dark:bg-slate-800/80 border border-[#e8eaf0] dark:border-white/10 text-[10px] font-black uppercase tracking-wider text-[#64748b] dark:text-slate-400">Last 30 Days</div>
      </div>
      {path ? (
        <div className="relative">
          <svg className="w-full h-[180px]" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path 
              d={`M ${path} L ${width},${height} L 0,${height} Z`} 
              fill="url(#chartGradient)" 
            />
            <polyline fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={path} />
          </svg>
        </div>
      ) : (
        <div className="py-12 text-center text-sm font-bold text-[#8892a4] dark:text-slate-500">No performance data yet</div>
      )}
    </div>
  )
}

function LogoutButton() {
  const [loggingOut, setLoggingOut] = useState(false)
  const handleLogout = async () => {
    setLoggingOut(true)
    await performLogout()
  }
  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loggingOut}
      className="px-4 py-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-100 dark:hover:bg-red-950/60 transition-colors disabled:opacity-50"
    >
      {loggingOut ? "Logging out…" : "Log out"}
    </button>
  )
}

function QuickActions() {
  const items = [
    { label: "Daily Quiz", href: "/daily-quiz" },
    { label: "Tournaments", href: "/tournaments" },
    { label: "Leaderboard", href: "/leaderboard" },
    { label: "Prizes", href: "/prizes" }
  ]
  return (
    <div className="bg-white dark:bg-slate-900/90 border border-[#e8eaf0] dark:border-white/10 rounded-2xl p-6 shadow-sm">
      <div className="text-[10px] font-black uppercase tracking-widest text-[#1a2340] dark:text-slate-100 mb-5 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed]" />
        Quick Actions
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.map((i) => (
          <TransitionLink key={i.label} href={i.href} className="flex flex-col items-center justify-center gap-2 rounded-xl bg-[#f8fafc] dark:bg-slate-800/60 border border-[#e8eaf0] dark:border-white/10 p-4 text-[10px] font-black uppercase tracking-widest text-[#1a2340] dark:text-slate-100 hover:border-[#7c3aed]/40 hover:bg-[#eef3fe] dark:hover:bg-slate-800 transition-all text-center">
            {i.label}
          </TransitionLink>
        ))}
      </div>
    </div>
  )
}

function Activity({ rows }: { rows: Array<{ title: string; meta?: string; when?: string; points?: string }> }) {
  return (
    <div className="bg-white dark:bg-slate-900/90 border border-[#e8eaf0] dark:border-white/10 rounded-2xl p-6 shadow-sm">
      <div className="text-[10px] font-black uppercase tracking-widest text-[#1a2340] dark:text-slate-100 mb-5 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed]" />
        Recent Activity
      </div>
      {rows.length ? (
        <ul className="space-y-3">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center justify-between rounded-xl bg-[#f8fafc] dark:bg-slate-800/50 border border-[#e8eaf0] dark:border-white/10 p-4 min-w-0">
              <div className="min-w-0 pr-2">
                <div className="text-sm font-black text-[#1a2340] dark:text-slate-100 uppercase tracking-tight truncate">{r.title}</div>
                <div className="text-[10px] font-bold text-[#8892a4] dark:text-slate-500 mt-1 break-words">{r.meta} • {r.when}</div>
              </div>
              <div className="text-sm font-black text-[#7c3aed] dark:text-blue-400 tabular-nums shrink-0">{r.points}</div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="py-12 text-center text-sm font-bold text-[#8892a4] dark:text-slate-500">No recent activity</div>
      )}
    </div>
  )
}

function RankAndNext({ username }: { username: string | null }) {
  const [rankLabel, setRankLabel] = useState<string>("…")
  useEffect(() => {
    if (!username?.trim()) {
      setRankLabel("Add a username in your profile to see rank")
      return
    }
    let cancelled = false
    setRankLabel("…")
    fetch("/api/leaderboard", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return
        const data = Array.isArray(j?.data) ? j.data : []
        const key = username.trim().toLowerCase()
        const row = data.find((e: { name?: string }) => String(e?.name ?? "").toLowerCase() === key)
        if (row && typeof row.rank === "number") {
          setRankLabel(`#${row.rank} of ${data.length.toLocaleString()}`)
        } else {
          setRankLabel("Not on leaderboard yet — finish a scored quiz")
        }
      })
      .catch(() => {
        if (!cancelled) setRankLabel("Could not load rank")
      })
    return () => {
      cancelled = true
    }
  }, [username])
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white dark:bg-slate-900/90 border border-[#e8eaf0] dark:border-white/10 rounded-2xl p-6 shadow-sm">
        <div className="text-[10px] font-black uppercase tracking-widest text-[#1a2340] dark:text-slate-100 mb-4 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f5b301]" />
          Current Global Rank
        </div>
        <div className="text-xl sm:text-2xl font-black text-[#1a2340] dark:text-slate-100 leading-tight">{rankLabel}</div>
      </div>
      <div className="bg-white dark:bg-slate-900/90 border border-[#e8eaf0] dark:border-white/10 rounded-2xl p-6 shadow-sm">
        <div className="text-[10px] font-black uppercase tracking-widest text-[#1a2340] dark:text-slate-100 mb-4 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Next Tournament
        </div>
        <NextTournamentInfo />
      </div>
    </div>
  )
}

function NextTournamentInfo() {
  const [text, setText] = useState("No upcoming tournaments")
  useEffect(() => {
    fetch("/api/tournaments", { cache: "no-store" }).then((r) => r.json()).then((j) => {
      const arr = Array.isArray(j?.data) ? j.data : []
      const upcoming = arr.filter((t: any) => t?.endTime && new Date(t.endTime).getTime() > Date.now()).sort((a: any, b: any) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime())
      setText(upcoming.length ? upcoming[0].title : "No upcoming tournaments")
    }).catch(() => setText("No upcoming tournaments"))
  }, [])
  return <div className="text-sm font-black text-[#7c3aed] dark:text-blue-400 uppercase tracking-tight animate-fade">{text}</div>
}


export default function Page() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { showToast } = useToast()
  const [tab, setTab] = useState<"Overview" | "Achievements" | "Certificates" | "Payments" | "Referrals" | "CompletedQuizzes" | "Insights" | "ContactUs">("Overview")
  const [payments, setPayments] = useState<any[]>([])
  const [stats, setStats] = useState<{ quizzesCount: number; averageScore: number; mockExamEnabled?: boolean } | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [uid, setUid] = useState<string | null>(null)
  const [activityRows, setActivityRows] = useState<Array<{ title: string; meta?: string; when?: string; points?: string }>>([])
  const [trendPoints, setTrendPoints] = useState<number[]>([])
  const [streakDays, setStreakDays] = useState<number>(0)
  const [earnings, setEarnings] = useState<number>(0)
  const [nextTournament, setNextTournament] = useState<string>("No upcoming tournaments")
  const [referrals, setReferrals] = useState<any[]>([])
  const [wallet, setWallet] = useState<number>(0)
  const [withdrawUpi, setWithdrawUpi] = useState("")
  const [referralCode, setReferralCode] = useState<string>("")
  const [shareUrl, setShareUrl] = useState("")
  const [country, setCountry] = useState<string | null>(null)
  const [achievements, setAchievements] = useState<string[]>([])
  const [badgeDefs, setBadgeDefs] = useState<Record<string, { icon: string; label: string; desc: string }>>({})
  const [quizHistory, setQuizHistory] = useState<Array<{ date: string; score: number; total: number }>>([])
  const [completedPapers, setCompletedPapers] = useState<Array<{ quizId: string; score: number; total: number; totalTimeSeconds: number }>>(
    []
  )
  const [certificates, setCertificates] = useState<Array<{ tournamentId: string; tournamentTitle: string; score: number; total?: number; type?: string }>>([])
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const { showTour, skip } = useDashboardTour()
  const addNotification = useNotificationsOptional()?.addNotification
  const notifiedCertRef = useRef(false)
  const notifiedReferralRef = useRef(false)
  const spinSectionRef = useRef<HTMLDivElement>(null)
  const [pendingSpinQuizId, setPendingSpinQuizId] = useState<string | null>(null)

  useEffect(() => {
    if (!addNotification) return
    if (certificates.length > 0 && !notifiedCertRef.current) {
      notifiedCertRef.current = true
      addNotification("Certificate(s) available for download.", "certificate")
    }
    const credited = referrals.filter((r: any) => r.referrerUid === uid && (r.status === "credited" || r.status === "success"))
    if (credited.length > 0 && !notifiedReferralRef.current) {
      notifiedReferralRef.current = true
      addNotification("Referral earned! Check your wallet.", "referral")
    }
  }, [addNotification, certificates.length, referrals, uid])

  useEffect(() => {
    try {
      const q = localStorage.getItem(PENDING_SPIN_LS)?.trim()
      setPendingSpinQuizId(q && q.length > 0 ? q : null)
    } catch {
      setPendingSpinQuizId(null)
    }
  }, [])

  useEffect(() => {
    if (searchParams?.get("highlight") !== "spin") return
    setTab("Overview")
    const scrollT = window.setTimeout(() => {
      spinSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 200)
    router.replace("/user", { scroll: false })
    return () => clearTimeout(scrollT)
  }, [searchParams, router])

  useEffect(() => {
    const t = searchParams?.get("tab")
    if (t === "Referrals") setTab("Referrals")
    else if (t === "Payments") setTab("Payments")
    else if (t === "Achievements") setTab("Achievements")
    else if (t === "Certificates") setTab("Certificates")
    else if (t === "CompletedQuizzes") setTab("CompletedQuizzes")
    else if (t === "Insights") setTab("Insights")
    else if (t === "ContactUs") setTab("ContactUs")
  }, [searchParams])

  useEffect(() => {
    fetch("/api/stats/public", { cache: "no-store" }).then((r) => r.json()).then((j) => setStats({ quizzesCount: j.data?.quizzesCount ?? 0, averageScore: j.data?.averageScore ?? 0, mockExamEnabled: j.data?.mockExamEnabled ?? false })).catch(() => setStats(null))
    Promise.all([
      fetch("/api/participants", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/user/payments", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/user/activity", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/leaderboard", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/tournaments", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/referrals", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/user/profile", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ data: null })),
      fetch("/api/user/stats", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ data: {} })),
      fetch("/api/user/certificates", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ data: [] }))
    ]).then(([part, pay, activityRes, lead, tourn, refs, prof, statsRes, certRes]) => {
      const uname = prof?.data?.username ?? username
      const ctry = prof?.data?.country
      const myUid = prof?.data?.uid ?? null
      if (uname && uname !== username) setUsername(uname)
      if (myUid) setUid(myUid)
      if (ctry !== undefined && ctry !== country) setCountry(ctry ?? null)
      const plist = Array.isArray(part?.data) ? part.data : []
      const myEnrolls = plist.filter((p: any) => uname ? (p.name === uname) : false)
      const rows: Array<{ title: string; meta?: string; when?: string; points?: string }> = myEnrolls.slice(-5).reverse().map((p: any) => ({
        title: "Enrolled in Tournament",
        meta: p.badge ?? "Participant",
        when: p.joinedAt ? new Date(p.joinedAt).toLocaleString() : "",
        points: "+1"
      }))
      const paylist = Array.isArray(pay?.data) ? pay.data : []
      const myPays = paylist
      setPayments(myPays)
      const totalEarn = myPays.filter((p: any) => p.status === "success").reduce((acc: number, p: any) => acc + Number(p.amount ?? 0), 0)
      setEarnings(totalEarn)
      const activityData = Array.isArray(activityRes?.data) ? activityRes.data : []
      const activityRowsFormatted = activityData.slice(0, 20).map((a: any) => ({
        title: a.title ?? (a.type === "payment" ? "Payment" : a.type === "quiz" ? "Quiz completed" : a.type ?? "Activity"),
        meta: a.meta ?? "",
        when: a.when ?? "",
        points: a.points ?? (a.status === "success" ? "✓" : "—")
      }))
      setActivityRows(activityRowsFormatted.length ? activityRowsFormatted : rows)
      const daysSet = new Set<string>()
      for (const e of myEnrolls) {
        if (e.joinedAt) daysSet.add(new Date(Number(e.joinedAt)).toISOString().slice(0, 10))
      }
      let streak = 0
      const today = new Date()
      for (let i = 0; i < 365; i++) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        const key = d.toISOString().slice(0, 10)
        if (daysSet.has(key)) streak += 1
        else break
      }
      setStreakDays(streak)
      const ldata = Array.isArray(lead?.data) ? lead.data : []
      const myScores = ldata.filter((s: any) => uname ? (s.name === uname) : false).map((s: any) => Number(s.score ?? 0))
      setTrendPoints(myScores.length ? myScores : [])
      const tlist = Array.isArray(tourn?.data) ? tourn.data : []
      const upcoming = tlist.filter((t: any) => t?.endTime && new Date(t.endTime).getTime() > Date.now()).sort((a: any, b: any) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime())
      setNextTournament(upcoming.length ? `${upcoming[0].title} • Ends ${upcoming[0].endTime}` : "No upcoming tournaments")
      setReferrals(Array.isArray(refs?.data) ? refs.data : [])
      setWallet(Number(prof?.data?.wallet ?? 0))
      setReferralCode(String(prof?.data?.referralCode ?? ""))
      setAchievements(Array.isArray(statsRes?.data?.achievements) ? statsRes.data.achievements : [])
      const defs: Record<string, { icon: string; label: string; desc: string }> = {
        first_quiz: { icon: "1ST", label: "First Quiz", desc: "Complete your first quiz" },
        perfect_5: { icon: "5/5", label: "Perfect 5", desc: "Score 5/5 on a quiz" },
        streak_3: { icon: "3D", label: "3-Day Streak", desc: "Complete quizzes 3 days in a row" },
        streak_7: { icon: "7D", label: "7-Day Streak", desc: "Complete quizzes 7 days in a row" },
        top_3: { icon: "TOP", label: "Top 3", desc: "Reach top 3 on the leaderboard" },
        ten_correct: { icon: "10C", label: "10 Correct", desc: "Get 10 correct answers in one quiz" },
        speed_demon: { icon: "FAST", label: "Speed Demon", desc: "Complete a quiz with avg <10s per question" },
        perfect_10: { icon: "10/10", label: "Perfect 10", desc: "Get 10/10 correct in a quiz" },
        challenge_king: { icon: "KING", label: "Challenge King", desc: "Beat a friend's challenge score" }
      }
      setBadgeDefs(defs)
      const hist = statsRes?.data?.history ?? []
      setQuizHistory(Array.isArray(hist) ? hist.slice(0, 10).map((h: any) => ({ date: h.date ?? "", score: h.score ?? 0, total: h.total ?? 0 })) : [])
      const papers = Array.isArray(statsRes?.data?.completedPapers) ? statsRes.data.completedPapers : []
      setCompletedPapers(papers)
      setCertificates(Array.isArray(certRes?.data) ? certRes.data : [])
      const paidFromPayments = myPays.some((p: any) => p.status === "success")
      const hasProfile = !!prof?.data?.username
      const paidCookie = typeof window !== "undefined" && (document.cookie.includes("paid=1") || localStorage?.getItem("paid") === "1")
      const paid = paidFromPayments || hasProfile || paidCookie
      if (!paid && typeof window !== "undefined") {
        window.location.replace("/intro")
      }
    })
      .finally(() => setDashboardLoading(false))
  }, [])
  useEffect(() => {
    if (typeof window !== "undefined" && referralCode) {
      setShareUrl(`${window.location.origin}/?ref=${referralCode}`)
    }
  }, [referralCode])
  useEffect(() => {
    if (tab !== "Referrals") return
    const refresh = () => {
      fetch("/api/referrals", { cache: "no-store" }).then((r) => r.json()).then((j) => setReferrals(Array.isArray(j?.data) ? j.data : [])).catch(() => { })
      fetch("/api/user/profile", { cache: "no-store" }).then((r) => r.json()).then((j) => setWallet(Number(j?.data?.wallet ?? 0))).catch(() => { })
    }
    refresh()
    const id = setInterval(refresh, 30000)
    return () => clearInterval(id)
  }, [tab])
  return (
    <PaidGate>
    <main className="min-h-screen app-page-surface">
      {showTour && <DashboardTour onClose={skip} />}
      <Navbar />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-2 pb-6 sm:pt-3 sm:pb-12 lg:pt-2">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between border-b border-[#e8eaf0] dark:border-white/10 pb-8">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl sm:text-4xl font-black text-[#1a2340] dark:text-slate-100 uppercase tracking-tighter">Your Dashboard</h1>
              {country && (
                <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-slate-800 border border-[#e8eaf0] dark:border-white/10 text-xl shadow-sm shrink-0" title={country}>
                  {countryToFlag(country)}
                </span>
              )}
            </div>
            <div className="text-sm font-bold text-[#64748b] dark:text-slate-400 mt-2 uppercase tracking-widest">
              Performance Insights {username ? `• @${username}` : ""}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <TransitionLink href="/daily-quiz" className="px-6 py-3 rounded-xl bg-[#7c3aed] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all active:scale-95">
              Take Quiz
            </TransitionLink>
            <LogoutButton />
          </div>
        </div>
        {dashboardLoading ? (
          <div className="mt-8">
            <UserDashboardSkeleton />
          </div>
        ) : (
          <>
            <AdSlot slotId="dashboard_sidebar" />
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Stat label="Total Quizzes" value={String(stats?.quizzesCount ?? 0)} trend="" />
              <Stat label="Average Score" value={`${stats?.averageScore ?? 0}%`} trend="" />
              <Stat label="Current Streak" value={`${streakDays} days`} trend="" />
              <Stat label="Total Earnings" value={`₹${earnings}`} trend="" />
            </div>

            <div className="mt-10 scroll-tabs border-b border-[#e8eaf0] dark:border-white/10 pb-4 -mx-1 px-1">
              <div className="scroll-tabs-inner flex flex-wrap gap-2 sm:gap-0">
                {[
                  { id: "Overview", label: "Overview" },
                  { id: "Achievements", label: "Achievements" },
                  { id: "Certificates", label: "Certificates" },
                  { id: "Payments", label: "Payments" },
                  { id: "Referrals", label: "Referrals" },
                  { id: "CompletedQuizzes", label: "Quizzes" },
                  { id: "Insights", label: "Insights" },
                  { id: "ContactUs", label: "Support" }
                ].map((t) => (
                  <button 
                    key={t.id}
                    onClick={() => setTab(t.id as any)} 
                    className={`px-4 sm:px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
                      tab === t.id 
                        ? "bg-[#1a2340] dark:bg-slate-100 dark:text-[#0b1222] text-white shadow-lg shadow-gray-400/20" 
                        : "text-[#64748b] dark:text-slate-400 hover:text-[#1a2340] dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-800/80 border border-transparent hover:border-[#e8eaf0] dark:hover:border-white/10"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            {tab === "Overview" && (
              <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                  <div ref={spinSectionRef} className="scroll-mt-28">
                    {pendingSpinQuizId ? (
                      <div className="rounded-2xl border border-[#e8eaf0] dark:border-white/10 bg-[#0b1222] p-6 sm:p-8 shadow-lg overflow-hidden">
                        <div className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400" />
                          Pending reward
                        </div>
                        <SpinAndWin
                          quizId={pendingSpinQuizId}
                          embedded
                          scratchZIndex={200}
                          onFlowComplete={() => {
                            try {
                              localStorage.removeItem(PENDING_SPIN_LS)
                            } catch { }
                            setPendingSpinQuizId(null)
                          }}
                          onIneligible={() => {
                            try {
                              localStorage.removeItem(PENDING_SPIN_LS)
                            } catch { }
                            setPendingSpinQuizId(null)
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                  <Chart points={trendPoints} />
                  <Activity rows={activityRows} />
                  {quizHistory.length > 0 && (
                    <div className="bg-white dark:bg-slate-900/90 border border-[#e8eaf0] dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-5">
                      <div className="text-[10px] font-black uppercase tracking-widest text-[#1a2340] dark:text-slate-100 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed]" />
                        Recent Quiz Performance
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {quizHistory.map((h, i) => (
                          <div key={i} className="px-3 py-1.5 rounded-lg bg-[#f8fafc] dark:bg-slate-800/60 border border-[#e8eaf0] dark:border-white/10 text-[10px] font-bold text-[#1a2340] dark:text-slate-100 uppercase tracking-tight" title={`${h.date}: ${h.score}/${h.total}`}>
                            {h.date?.slice(5) ?? "—"} <span className="text-[#7c3aed] dark:text-blue-400 ml-1 font-black">{h.score}/{h.total}</span>
                          </div>
                        ))}
                      </div>
                      {completedPapers.length > 0 && (
                        <div className="mt-4 border-t border-[#e8eaf0] dark:border-white/10 pt-5">
                          <div className="text-[10px] font-black uppercase tracking-widest text-[#8892a4] dark:text-slate-500 mb-4">Completed Papers</div>
                          <div className="space-y-2">
                            {completedPapers.slice(0, 5).map((p) => (
                              <div key={p.quizId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#f8fafc] dark:bg-slate-800/50 border border-[#e8eaf0] dark:border-white/10 min-w-0">
                                <div className="text-[11px] font-bold text-[#1a2340] dark:text-slate-100 min-w-0 break-words">
                                  Quiz {p.quizId.slice(0, 6)}… <span className="text-[#7c3aed] dark:text-blue-400 ml-2 font-black">Score: {p.score}/{p.total}</span>
                                </div>
                                <button
                                  type="button"
                                  className="px-4 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-[#e8eaf0] dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-[#7c3aed] dark:text-blue-400 hover:bg-[#eef3fe] dark:hover:bg-slate-700 transition-all shrink-0 self-start sm:self-auto"
                                  onClick={async () => {
                                    const res = await fetch(`/api/quiz-completion/report?quizId=${encodeURIComponent(p.quizId)}`, {
                                      credentials: "include"
                                    })
                                    const j = await res.json().catch(() => ({}))
                                    if (res.ok && j?.ok && Array.isArray(j.rows)) {
                                      generateQuizPdf(j.rows, j.score ?? p.score, j.total ?? p.total, j.totalTimeSeconds ?? p.totalTimeSeconds, username || "User", "en", true)
                                    }
                                  }}
                                >
                                  Download paper
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-6">
                  <QuickActions />
                  <RankAndNext username={username} />
                </div>
              </div>
            )}
            {tab === "Achievements" && (
              <div className="mt-8">
                <div className="bg-white dark:bg-slate-900/90 border border-[#e8eaf0] dark:border-white/10 rounded-2xl p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#f1f5f9] dark:border-white/10 gap-4 flex-wrap">
                    <div>
                      <h3 className="text-xl font-black text-[#1a2340] dark:text-slate-100 uppercase tracking-tighter">Prestige & Badges</h3>
                      <p className="text-xs font-bold text-[#64748b] dark:text-slate-400 mt-1 uppercase tracking-widest">Elite Achievements</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-[#7c3aed] dark:text-blue-400">{achievements.length} / {Object.keys(BADGES).length}</div>
                      <div className="text-[10px] uppercase font-black text-[#8892a4] dark:text-slate-500 tracking-widest">Unlocked</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                    {Object.values(BADGES).map((badge) => {
                      const unlocked = achievements.includes(badge.id)
                      return (
                        <div
                          key={badge.id}
                          className={`group relative rounded-2xl p-6 text-center border transition-all duration-300 ${
                            unlocked 
                              ? "bg-white dark:bg-slate-800/80 border-[#e8eaf0] dark:border-white/10 shadow-sm hover:shadow-md hover:border-[#7c3aed]/30" 
                              : "bg-[#f8fafc] dark:bg-slate-900/50 border-transparent dark:border-white/5 opacity-40 grayscale"
                          }`}
                        >
                          <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-3xl shadow-sm transition-transform duration-300 group-hover:scale-110 ${
                            unlocked 
                              ? "bg-[#7c3aed]/5 dark:bg-blue-500/10 text-[#7c3aed] dark:text-blue-400 border border-[#7c3aed]/10 dark:border-blue-500/20" 
                              : "bg-white dark:bg-slate-800 text-gray-300 dark:text-slate-600 border border-[#e8eaf0] dark:border-white/10"
                          }`}>
                            {unlocked ? badge.icon : "🔒"}
                          </div>

                          <div className="font-black text-[#1a2340] dark:text-slate-100 text-xs uppercase tracking-tight mb-1">{badge.name}</div>
                          <div className="text-[10px] font-bold text-[#64748b] dark:text-slate-400 leading-tight line-clamp-2 uppercase tracking-tighter">{badge.description}</div>

                          {unlocked && (
                            <div className="mt-4 flex justify-center">
                              <span className="text-[8px] uppercase font-black tracking-[0.2em] py-1 px-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-[#7c3aed] dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 italic">Verified</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {!achievements.length && (
                    <p className="mt-12 text-center text-sm font-bold text-[#8892a4] dark:text-slate-500 uppercase tracking-widest">Complete quizzes to unlock badges</p>
                  )}
                </div>
              </div>
            )}
            {tab === "Certificates" && (
              <div className="mt-8">
                <div className="bg-white dark:bg-slate-900/90 border border-[#e8eaf0] dark:border-white/10 rounded-2xl p-6 shadow-sm">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[#1a2340] dark:text-slate-100 mb-5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed]" />
                    My Certificates
                  </div>
                  <p className="text-xs font-bold text-[#64748b] dark:text-slate-400 mb-6 uppercase tracking-widest">Verified credentials for tournament performance</p>
                  {!certificates.length ? (
                    <div className="py-12 text-center text-sm font-bold text-[#8892a4] dark:text-slate-500">No certificates available yet</div>
                  ) : (
                    <ul className="space-y-4">
                      {certificates.map((c, i) => {
                        const typeLabel = c.type === "runner_up" ? "Runner Up" : c.type === "participation" ? "Participation" : "1st Winner"
                        return (
                          <li key={(c.tournamentId || "") + i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-[#f8fafc] dark:bg-slate-800/50 border border-[#e8eaf0] dark:border-white/10 p-6 hover:border-[#7c3aed]/30 transition-all min-w-0">
                            <div className="min-w-0">
                              <div className="text-sm font-black text-[#7c3aed] dark:text-blue-400 uppercase tracking-wider">{typeLabel}</div>
                              <div className="text-lg font-black text-[#1a2340] dark:text-slate-100 mt-1 uppercase tracking-tight break-words">{c.tournamentTitle}</div>
                              {c.score > 0 && <div className="text-[10px] font-bold text-[#64748b] dark:text-slate-400 mt-1 uppercase tracking-widest">Performance Score: <span className="text-[#1a2340] dark:text-slate-100">{c.score}</span></div>}
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  fetch("/api/certificates/templates").then((r) => r.json()).then((tRes) => {
                                    const templates = tRes?.data ?? {}
                                    const key = c.type === "runner_up" ? "runnerUp" : c.type === "participation" ? "participation" : "first"
                                    generateCertificate({
                                      recipientName: username || "Participant",
                                      tournamentName: c.tournamentTitle,
                                      type: (c.type as "1st" | "runner_up" | "participation") ?? "1st",
                                      score: c.score,
                                      total: c.total,
                                      templateImageBase64: templates[key]
                                    })
                                  }).catch(() => {
                                    generateCertificate({
                                      recipientName: username || "Participant",
                                      tournamentName: c.tournamentTitle,
                                      type: (c.type as "1st" | "runner_up" | "participation") ?? "1st",
                                      score: c.score,
                                      total: c.total
                                    })
                                  })
                                }}
                                className="px-5 py-2 rounded-xl bg-[#7c3aed] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/10 hover:bg-blue-600 transition-all"
                              >
                                Download PDF
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const modalData = {
                                    name: username || "Winner",
                                    tournament: c.tournamentTitle,
                                    prize: c.type === "1st" ? "₹5,000" : c.type === "runner_up" ? "₹1,000" : "Certificate",
                                    rank: c.type === "1st" ? "1st Place" : c.type === "runner_up" ? "Runner Up" : "Participant"
                                  }
                                  window.dispatchEvent(new CustomEvent("open-brag-modal", { detail: modalData }))
                                }}
                                className="px-5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-[#e8eaf0] dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-[#1a2340] dark:text-slate-100 hover:bg-[#f8fafc] dark:hover:bg-slate-700 transition-all"
                              >
                                Share Victory
                              </button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}
            {tab === "Payments" && (
              <div className="mt-8">
                <div className="bg-white dark:bg-slate-900/90 border border-[#e8eaf0] dark:border-white/10 rounded-2xl p-6 shadow-sm">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[#1a2340] dark:text-slate-100 mb-5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f5b301]" />
                    Payment History
                  </div>
                  <p className="text-xs font-bold text-[#64748b] dark:text-slate-400 mb-6 uppercase tracking-widest">Transaction log and status updates</p>
                  {!payments.length ? (
                    <div className="py-12 text-center text-sm font-bold text-[#8892a4] dark:text-slate-500">No payment records found</div>
                  ) : (
                    <ul className="space-y-3">
                      {payments.map((p, i) => (
                        <li key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-[#f8fafc] dark:bg-slate-800/50 border border-[#e8eaf0] dark:border-white/10 p-5 min-w-0">
                          <div className="min-w-0">
                            <div className="text-lg font-black text-[#1a2340] dark:text-slate-100">₹{p.amount}</div>
                            <div className="text-[10px] font-bold text-[#64748b] dark:text-slate-400 mt-1 uppercase tracking-widest break-words">
                              {p.gateway ?? p?.meta?.method ?? "System Payment"} • {p.created_at ? new Date(p.created_at).toLocaleDateString() : "Date N/A"}
                            </div>
                          </div>
                          <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm shrink-0 self-start sm:self-auto ${
                            p.status === "success" 
                              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50" 
                              : p.status === "pending" || p.status === "pending_approval" 
                                ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/50" 
                                : "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-white/10"
                          }`}>
                            {p.status === "success" ? "Success" : p.status === "pending_approval" ? "Pending" : p.status ?? "Unknown"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
            {tab === "Referrals" && (
              <div className="mt-8 space-y-6 min-w-0">
                <ShareCard url={shareUrl} code={referralCode} />

                <div className="bg-white dark:bg-slate-900/90 border border-[#e8eaf0] dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-sm overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#7c3aed]/5 dark:bg-[#7c3aed]/10 blur-3xl pointer-events-none" />
                  
                  <div className="relative flex flex-col lg:flex-row items-stretch lg:items-center gap-8 min-w-0">
                    <div className="flex-1 space-y-4 min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8892a4] dark:text-slate-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#7c3aed] animate-pulse" />
                        Wallet Balance
                      </div>
                      <div className="text-4xl sm:text-5xl font-black text-[#1a2340] dark:text-slate-100 tabular-nums tracking-tighter break-all">
                        ₹{wallet}
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="text-[10px] font-bold text-[#64748b] dark:text-slate-400 uppercase tracking-widest">
                          Withdrawal threshold: ₹{WITHDRAWAL_THRESHOLD_INR} (max ₹{MAX_WITHDRAWAL_PER_REQUEST_INR} per request)
                        </div>
                        <div className="w-full h-1.5 bg-[#f1f5f9] dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#7c3aed] transition-all duration-1000" 
                            style={{ width: `${Math.min(100, (wallet / WITHDRAWAL_THRESHOLD_INR) * 100)}%` }}
                          />
                        </div>
                      </div>
                      {wallet >= WITHDRAWAL_THRESHOLD_INR && (
                        <input
                          type="text"
                          value={withdrawUpi}
                          onChange={(e) => setWithdrawUpi(e.target.value)}
                          placeholder="Enter your UPI ID (e.g. name@upi)"
                          autoComplete="off"
                          className="mt-4 w-full min-w-0 px-4 py-3 rounded-xl bg-[#f8fafc] dark:bg-slate-800/80 border border-[#e8eaf0] dark:border-white/10 text-sm text-[#1a2340] dark:text-slate-100 placeholder:text-[#8892a4] dark:placeholder:text-slate-500 focus:border-[#7c3aed] outline-none"
                        />
                      )}
                      <button
                        className={`mt-3 w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 ${
                          wallet >= WITHDRAWAL_THRESHOLD_INR
                            ? "bg-[#1a2340] dark:bg-slate-100 dark:text-[#0b1222] text-white shadow-xl shadow-gray-400/20 hover:scale-[1.02] active:scale-95" 
                            : "bg-[#f8fafc] dark:bg-slate-800/80 text-[#8892a4] dark:text-slate-500 border border-[#e8eaf0] dark:border-white/10 cursor-not-allowed"
                        }`}
                        disabled={wallet < WITHDRAWAL_THRESHOLD_INR}
                        onClick={async () => {
                          const upiId = withdrawUpi.trim()
                          if (!upiId) { showToast("Please enter your UPI ID"); return }
                          const amount = Math.min(wallet, MAX_WITHDRAWAL_PER_REQUEST_INR)
                          if (!confirm(`Withdraw ₹${amount} to ${upiId}?`)) return
                          const res = await fetch("/api/wallet/withdraw", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount, upiId }) })
                          if (res.ok) { setWallet((w) => w - amount); setWithdrawUpi(""); showToast("Withdrawal requested! Admin will process it shortly.") }
                          else {
                            const j = await res.json().catch(() => ({}))
                            showToast(j?.error ?? "Withdrawal failed")
                          }
                        }}
                      >
                        {wallet >= WITHDRAWAL_THRESHOLD_INR
                          ? `Request withdrawal ₹${Math.min(wallet, MAX_WITHDRAWAL_PER_REQUEST_INR)}`
                          : `Need ₹${WITHDRAWAL_THRESHOLD_INR - wallet} more to withdraw`}
                      </button>
                    </div>
                    <div className="shrink-0 flex justify-center lg:justify-end scale-100 sm:scale-110 rounded-3xl bg-gradient-to-br from-[#eef3fe] to-[#f1f5f9] dark:from-slate-800 dark:to-slate-900 border border-[#e2e8f0] dark:border-white/10 p-6 shadow-inner">
                      <ProgressRing value={wallet} max={WITHDRAWAL_THRESHOLD_INR} label="Revenue goal" variant="dark" size={112} strokeWidth={8} />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900/90 border border-[#e8eaf0] dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-sm">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[#1a2340] dark:text-slate-100 mb-8 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed]" />
                    Affiliate Network Rules
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { icon: "✨", text: "Share your unique link or code with friends" },
                      { icon: "💰", text: `Earn ₹${REFERRAL_CREDIT_INR} for every verified referral payment` },
                      { icon: "⚡", text: "Instant balance updates on successful transaction" },
                      { icon: "🎯", text: `Reach ₹${WITHDRAWAL_THRESHOLD_INR} in your wallet to unlock withdrawal` },
                      { icon: "🛡️", text: "Fraud prevention protocols strictly enforced" },
                      { icon: "🙌", text: "Unlimited referrals per elite account" }
                    ].map((rule, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-br from-[#f0f4fc] to-[#f8fafc] dark:from-slate-800/90 dark:to-slate-900/90 border border-[#dce3f0] dark:border-white/10 hover:border-[#7c3aed]/35 dark:hover:border-blue-500/40 hover:shadow-sm transition-all group"
                      >
                        <span className="text-xl group-hover:scale-125 transition-transform shrink-0 drop-shadow-sm" aria-hidden>{rule.icon}</span>
                        <span className="text-[11px] font-bold text-[#1a2340] dark:text-slate-100 leading-relaxed uppercase tracking-tight">{rule.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900/90 border border-[#e8eaf0] dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-sm min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#1a2340] dark:text-slate-100 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed]" />
                      Referral Roster
                    </div>
                    {referrals.filter((r: ReferralItem) => r.referrerUid === uid).length > 0 && (
                      <span className="px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50 text-[10px] font-black text-[#7c3aed] dark:text-blue-400 uppercase tracking-widest w-fit">
                        {referrals.filter((r: ReferralItem) => r.referrerUid === uid).length} Total Connections
                      </span>
                    )}
                  </div>

                  {!referrals.filter((r: ReferralItem) => r.referrerUid === uid).length ? (
                    <div className="py-16 text-center">
                      <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[#f8fafc] dark:bg-slate-800/80 border border-[#e8eaf0] dark:border-white/10 flex items-center justify-center text-2xl grayscale">🤝</div>
                      <p className="text-sm font-bold text-[#8892a4] dark:text-slate-500 uppercase tracking-widest">No active referrals recorded</p>
                      <p className="text-[10px] font-bold text-[#64748b] dark:text-slate-400 mt-2 uppercase tracking-[0.2em]">Start sharing to build your network</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {referrals.filter((r: ReferralItem) => r.referrerUid === uid).map((r: any, i: number) => (
                        <div
                          key={r.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#f8fafc] dark:bg-slate-800/50 border border-[#e8eaf0] dark:border-white/10 hover:bg-white dark:hover:bg-slate-800/80 hover:border-[#7c3aed]/30 transition-all shadow-sm min-w-0"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 border uppercase tracking-tighter ${
                              r.status === "credited" 
                                ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50" 
                                : "bg-white dark:bg-slate-800 text-[#8892a4] dark:text-slate-400 border-[#e8eaf0] dark:border-white/10"
                            }`}>
                              {r.status === "credited" ? "Paid" : "Pending"}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-black text-[#1a2340] dark:text-slate-100 truncate">
                                {r.referredUsername ? `@${r.referredUsername}` : `Partner ${String(r.referredUid).slice(0, 6)}`}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 mt-1">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${r.status === "credited" ? "text-emerald-600 dark:text-emerald-400" : "text-[#64748b] dark:text-slate-400"}`}>
                                  {r.status === "credited" ? "✓ Credited" : "⏳ Processing"}
                                </span>
                                <div className="h-1 w-1 rounded-full bg-[#e8eaf0] dark:bg-slate-600 hidden sm:block" />
                                <ReferralStatusBar status={r.status} isReferrer />
                              </div>
                            </div>
                          </div>
                          <div className={`text-xl font-black tabular-nums tracking-tighter shrink-0 ${r.status === "credited" ? "text-[#1a2340] dark:text-slate-100" : "text-[#8892a4] dark:text-slate-500"}`}>
                            ₹{r.amount}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {tab === "CompletedQuizzes" && (
              <div className="mt-8">
                <div className="bg-white dark:bg-slate-900/90 border border-[#e8eaf0] dark:border-white/10 rounded-2xl p-6 shadow-sm">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[#1a2340] dark:text-slate-100 mb-5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed]" />
                    Completed Quizzes
                  </div>
                  <p className="text-xs font-bold text-[#64748b] dark:text-slate-400 mb-6 uppercase tracking-widest">Download full question papers and answer keys</p>
                  {!completedPapers.length ? (
                    <div className="py-12 text-center text-sm font-bold text-[#8892a4] dark:text-slate-500">No completed quizzes recorded</div>
                  ) : (
                    <ul className="space-y-3">
                      {completedPapers.map((p) => (
                        <li key={p.quizId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-[#f8fafc] dark:bg-slate-800/50 border border-[#e8eaf0] dark:border-white/10 p-5 shadow-sm min-w-0">
                          <div className="min-w-0">
                            <div className="text-[11px] font-black text-[#1a2340] dark:text-slate-100 uppercase tracking-tight">Quiz Session</div>
                            <div className="text-[10px] font-bold text-[#64748b] dark:text-slate-400 mt-1 break-all">ID: {p.quizId.slice(0, 12)}… • <span className="text-[#7c3aed] dark:text-blue-400 font-black">Score: {p.score}/{p.total}</span></div>
                          </div>
                          <button
                            type="button"
                            className="px-5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-[#e8eaf0] dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-[#1a2340] dark:text-slate-100 hover:bg-[#eef3fe] dark:hover:bg-slate-700 transition-all shrink-0 self-start sm:self-auto"
                            onClick={async () => {
                              const res = await fetch(`/api/quiz-completion/report?quizId=${encodeURIComponent(p.quizId)}`, { credentials: "include" })
                              const j = await res.json().catch(() => ({}))
                              if (res.ok && j?.ok && Array.isArray(j.rows)) {
                                generateQuizPdf(j.rows, j.score ?? p.score, j.total ?? p.total, j.totalTimeSeconds ?? p.totalTimeSeconds, username || "User", "en", true)
                              }
                            }}
                          >
                            PDF Asset
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
            {tab === "Insights" && (
              <div className="mt-8">
                <UserInsights completedPapers={completedPapers} stats={stats} />
              </div>
            )}
            {tab === "ContactUs" && (
              <div className="mt-8">
                <ContactForm />
              </div>
            )}
            <AdSlot slotId="dashboard_bottom" />
          </>
        )}
      </section>
      <BragModal />
    </main>
    </PaidGate>
  )
}

function BragModal() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const handler = (e: any) => setData(e.detail)
    window.addEventListener("open-brag-modal", handler)
    return () => window.removeEventListener("open-brag-modal", handler)
  }, [])

  if (!data) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#1a2340]/60 backdrop-blur-xl animate-fade" onClick={() => setData(null)} />
      <div className="relative z-10 max-w-lg w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-[2.5rem] border border-[#e8eaf0] dark:border-white/10 p-10 shadow-2xl animate-pop">
        <button
          onClick={() => setData(null)}
          className="absolute top-8 right-8 w-12 h-12 rounded-2xl bg-[#f8fafc] dark:bg-slate-800 border border-[#e8eaf0] dark:border-white/10 flex items-center justify-center text-[#1a2340] dark:text-slate-100 hover:bg-[#f1f5f9] dark:hover:bg-slate-700 transition-all"
        >
          ✕
        </button>
        <div className="text-center mb-10">
          <h3 className="text-3xl font-black text-[#1a2340] dark:text-slate-100 uppercase tracking-tighter italic">Elite Standing</h3>
          <p className="text-[10px] font-black text-[#64748b] dark:text-slate-400 uppercase tracking-[0.3em] mt-2">Download Your Prestige Asset</p>
        </div>
        <BragCard {...data} />
      </div>
    </div>
  )
}
