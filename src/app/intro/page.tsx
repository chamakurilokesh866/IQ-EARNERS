"use client"

import { Fragment, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import { useTransitionNavigate } from "@/hooks/useTransitionNavigate"
import Image from "next/image"
import { CheckIcon, XIcon } from "@/components/AnimatedIcons"
import logoPng from "../prizes/icon.png"

const SponsorForms = dynamic(() => import("../../components/SponsorForms"), { ssr: false })
const TurnstileWidget = dynamic(() => import("../../components/TurnstileWidget"), { ssr: false })
import { getBootstrapUrl } from "@/lib/bootstrapFetch"
const PaymentModal = dynamic(() => import("../../components/PaymentModal"), { ssr: false })
const LoginModal = dynamic(() => import("../../components/LoginModal"), { ssr: false })
const LegalModal = dynamic(() => import("../../components/LegalModal"), { ssr: false })
const ContactModal = dynamic(() => import("../../components/ContactModal"), { ssr: false })
const ChallengeAcceptModal = dynamic(() => import("../../components/ChallengeAcceptModal"), { ssr: false })
const AIIntroContent = dynamic(() => import("../../components/AIIntroContent"), { ssr: false })
const CreatorBanner = dynamic(() => import("../../components/CreatorBanner"), { ssr: false })
const UserManualBook = dynamic(() => import("../../components/UserManualBook"), { ssr: false })
const PracticeQuizWidget = dynamic(() => import("../../components/PracticeQuizWidget"), { ssr: false })
import { triggerHapticImpact } from "@/lib/haptics"
import StickyIntroCTA from "../../components/StickyIntroCTA"
import NeonParticles from "../../components/NeonParticles"

const FEATURES = [
  {
    title: "Daily Cognitive Quizzes",
    desc: "10 high-impact questions updated every 24 hours to keep your mind sharp and competitive.",
    icon: "🧠",
    badge: "DAILY"
  },
  {
    title: "Global Tournaments",
    desc: "Join high-stakes timed events with live leaderboards and national recognition.",
    icon: "🏆",
    badge: "EVENT"
  },
  {
    title: "Merit Rewards",
    desc: "Top performers earn exclusive prizes and merit-based recognition processed within 48h.",
    icon: "✨",
    badge: "REWARDS"
  },
  {
    title: "Secure Verification",
    desc: "Enterprise-grade UPI integration and anti-cheat protocols ensuring fair play for all.",
    icon: "🛡️",
    badge: "SECURE"
  },
]

const INTRO_JOURNEY_STEPS = [
  { emoji: "💸", title: "Pay", subtitle: "Enroll & get access" },
  { emoji: "🏆", title: "Top the leaderboard", subtitle: "Rise to #1" },
  { emoji: "🎁", title: "Win exciting prizes", subtitle: "Merit-based rewards" },
] as const

const T_J1 = 0.12
const T_A1 = 0.58
const T_J2 = 1.02
const T_A2 = 1.46
const T_J3 = 1.9

function IntroJourneyStrip() {
  const cardBase =
    "border-primary/25 bg-gradient-to-b from-primary/[0.12] via-white/[0.04] to-accent/[0.06] shadow-[0_16px_48px_rgba(124,58,237,0.15)]"
  const subColor = "text-white/45"

  return (
    <div
      className="mb-8 px-2 w-full max-w-4xl mx-auto"
      role="list"
      aria-label="How it works: pay, compete, win"
    >
      <div className="flex flex-row items-center justify-start sm:justify-center gap-3 sm:gap-0 overflow-x-auto sm:overflow-visible pb-6 scrollbar-hide snap-x">
        {INTRO_JOURNEY_STEPS.map((step, i) => (
          <Fragment key={step.title}>
            <motion.article
              role="listitem"
              initial={{ opacity: 0, y: 20, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                delay: i === 0 ? T_J1 : i === 1 ? T_J2 : T_J3,
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={`relative shrink-0 w-[158px] sm:w-auto sm:flex-none sm:min-w-[168px] max-w-md rounded-2xl border backdrop-blur-md px-4 py-5 sm:py-6 text-center snap-center ${cardBase}`}
            >
              <span
                className="absolute top-2 left-3 text-[8px] font-black tabular-nums tracking-widest text-white/25"
                aria-hidden
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="text-3xl sm:text-[2.25rem] leading-none mb-2.5 select-none" aria-hidden>
                {step.emoji}
              </div>
              <h3 className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-primary leading-snug">
                {step.title}
              </h3>
              <p className={`text-[10px] mt-1.5 font-semibold leading-tight ${subColor}`}>{step.subtitle}</p>
            </motion.article>

            {i < INTRO_JOURNEY_STEPS.length - 1 ? (
              <motion.div
                className="flex items-center justify-center shrink-0 px-1"
                initial={{ opacity: 0, scale: 0.2 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: i === 0 ? T_A1 : T_A2,
                  type: "spring",
                  stiffness: 380,
                  damping: 22,
                }}
                aria-hidden
              >
                <motion.div
                  className="relative flex items-center justify-center text-primary"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: (i === 0 ? T_A1 : T_A2) + 0.08, duration: 0.25 }}
                >
                  <motion.span
                    className="text-xl sm:text-2xl font-black leading-none block origin-center"
                    animate={{ x: [0, 9, 0] }}
                    transition={{
                      delay: (i === 0 ? T_A1 : T_A2) + 0.35,
                      duration: 1.15,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    →
                  </motion.span>
                  <motion.span
                    className="absolute inset-0 rounded-full bg-primary/20 blur-md -z-10"
                    animate={{ opacity: [0.35, 0.75, 0.35], scale: [0.85, 1.05, 0.85] }}
                    transition={{
                      delay: (i === 0 ? T_A1 : T_A2) + 0.35,
                      duration: 1.15,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </motion.div>
              </motion.div>
            ) : null}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

/** Single merged FAQ list (removed duplicate “Common Inquiries” section below). */
const INTRO_FAQS = [
  { q: "What is the Enrollment Fee?", a: "The entry fee provides complete platform access, profile creation, and your first complimentary entry into a major quiz to win from the prize pool. After the initial competition concludes, users can participate in subsequent tournaments and specialized quizzes by paying the respective entry fees." },
  { q: "How do I claim my prizes?", a: "Performance rewards are automatically credited to your platform wallet. You can withdraw via UPI from your Profile section." },
  { q: "Is the platform secure?", a: "Yes. We use industry-standard encryption, Turnstile bot protection, and manual verification for high-value transactions." },
  { q: "What are the quiz rules?", a: "Each question has a 30s limit. Fullscreen mode is mandatory. Any attempt to switch tabs will flag the session." },
  { q: "How do I participate in the Merit Program?", a: "Scroll to the top, enter your details, and complete the one-time secure entry fee to unlock the full ecosystem." },
  { q: "Is the payment process secure?", a: "We use industry-standard encryption and verify manual transactions through our administrative review layer." },
  { q: "What are the scholarship opportunities?", a: "Top performers on the leaderboard may be eligible for monthly sponsorships and educational grants from our partners." },
  { q: "Can institutions join the platform?", a: "Yes. Use the University form in the Partnership Hub to request institutional licensing and student management tools." },
  { q: "How do I track my sponsorship request?", a: "Click Track Status in the Partnership section and enter your unique Transmission ID (e.g. ABC-IQSPON-123)." },
  { q: "How can I verify my rank?", a: "The leaderboard updates in real time. Use your transmission code or registered name to find your latest standing." },
] as const

const ORG_API_CONTEXT = [
  {
    title: "For Organizations",
    points: [
      "Create a separate organization portal with owner/admin controls.",
      "Manage members, quizzes, analytics, notifications, and audit logs.",
      "Use your own branding and run internal quiz programs securely.",
    ],
  },
  {
    title: "For API Integrations",
    points: [
      "Generate organization-scoped API keys from org dashboard.",
      "Integrate LMS/ERP/portals with secure auth and permissioned access.",
      "Configure event-driven automation through webhook-ready architecture.",
    ],
  },
] as const

export default function IntroPage() {
  const { navigate } = useTransitionNavigate()
  const search = useSearchParams()
  const [fee, setFee] = useState(100)
  const [showPay, setShowPay] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [paid, setPaid] = useState(false)
  const [legalDoc, setLegalDoc] = useState<"terms" | "privacy" | "rules" | "grievance" | "refund" | "disclaimer" | "cookie" | null>(null)
  const [showChallengeModal, setShowChallengeModal] = useState(false)
  const [challengeAcceptLoading, setChallengeAcceptLoading] = useState(false)
  const [sponsorKind, setSponsorKind] = useState<"sponsor" | "promotion" | "collaboration" | "university">("sponsor")
  const [statusCode, setStatusCode] = useState("")
  const [statusResult, setStatusResult] = useState<{ found: boolean; status?: string; reply?: string; kind?: string } | null>(null)
  const [showSponsorModal, setShowSponsorModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [sponsorModalView, setSponsorModalView] = useState<"turnstile" | "form" | "success">("turnstile")
  const [sponsorFormError, setSponsorFormError] = useState<string | null>(null)
  const didAutoOpenLoginRef = useRef(false)
  const didAutoOpenChallengeRef = useRef(false)
  
  const msg = search.get("msg")
  const challengeParam = search.get("challenge")
  const fromParam = search.get("from")
  const loginParam = search.get("login")
  const usernameParam = search.get("username")
  const openPayParam = search.get("openPay")
  const legalParam = search.get("legal") as "terms" | "privacy" | "rules" | "grievance" | "refund" | "disclaimer" | "cookie" | null

  useEffect(() => {
    if (openPayParam === "1" && mounted) {
      setShowPay(true)
      try {
        const u = new URL(window.location.href)
        u.searchParams.delete("openPay")
        const q = u.searchParams.toString()
        window.history.replaceState(null, "", u.pathname + (q ? `?${q}` : ""))
      } catch {
        /* ignore */
      }
    }
  }, [openPayParam, mounted])

  useEffect(() => {
    if (msg === "contact" && mounted) {
      setShowContact(true)
    }
    if (legalParam && mounted) {
      setLegalDoc(legalParam)
    }
  }, [msg, legalParam, mounted])

  useEffect(() => {
    if (paid && challengeParam && fromParam && !didAutoOpenChallengeRef.current) {
      didAutoOpenChallengeRef.current = true
      setShowChallengeModal(true)
    }
  }, [paid, challengeParam, fromParam])

  useEffect(() => {
    if (loginParam !== "1" || !mounted || didAutoOpenLoginRef.current) return
    const stored =
      typeof window !== "undefined" ? window.sessionStorage.getItem("login_username") : null
    if (usernameParam || stored) {
      didAutoOpenLoginRef.current = true
      setShowLogin(true)
    }
  }, [loginParam, usernameParam, mounted])

  const fromLogout = search.get("from") === "logout"
  const didStripLogoutParamRef = useRef(false)

  /** Drop `from=logout` from the URL once — avoids stacking duplicate history entries on every load. */
  useEffect(() => {
    if (typeof window === "undefined" || !fromLogout || didStripLogoutParamRef.current) return
    didStripLogoutParamRef.current = true
    try {
      const u = new URL(window.location.href)
      u.searchParams.delete("from")
      const q = u.searchParams.toString()
      window.history.replaceState(null, "", u.pathname + (q ? `?${q}` : ""))
    } catch { }
  }, [fromLogout])

  const refParam = search.get("ref")
  useEffect(() => {
    setMounted(true)
    if (refParam && typeof window !== "undefined") {
      window.localStorage?.removeItem("paid")
        ;["uid", "paid", "username", "sid", "role"].forEach((c) => { document.cookie = `${c}=; path=/; max-age=0` })
    }
    fetch(getBootstrapUrl(), { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        const f = Number(j?.data?.entryFee ?? 100)
        if (Number.isFinite(f)) setFee(f)
        setPaid(Boolean(j?.data?.paid))
      })
      .catch(() => { })
    if (refParam) {
      const runRef = () =>
        fetch(`/api/referrals/track?ref=${encodeURIComponent(refParam)}`, { method: "POST", credentials: "include" }).catch(() => { })
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        window.requestIdleCallback(() => runRef(), { timeout: 2500 })
      } else {
        setTimeout(runRef, 1)
      }
    }
  }, [msg, refParam])


  // Preload QR only when user opens pay (saves settings + QR work on initial intro load)
  useEffect(() => {
    if (!showPay) return
    const amount = fee || 100
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const id = j?.data?.upiId ?? j?.data?.upi_id
        const upi = (id && typeof id === "string" ? id.trim() : "") || process.env.NEXT_PUBLIC_DEFAULT_UPI || ""
        const upiUrl = `upi://pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent("IQ Earners")}&am=${encodeURIComponent(String(amount))}&cu=INR&tn=${encodeURIComponent("IQ Earners - Entry")}`
        const qrSrc = `/api/qr?data=${encodeURIComponent(upiUrl)}&s=220`
        const img = new window.Image()
        img.src = qrSrc
      })
      .catch(() => {
        const upi = process.env.NEXT_PUBLIC_DEFAULT_UPI || ""
        const upiUrl = `upi://pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent("IQ Earners")}&am=${encodeURIComponent(String(amount))}&cu=INR&tn=${encodeURIComponent("IQ Earners - Entry")}`
        const img = new window.Image()
        img.src = `/api/qr?data=${encodeURIComponent(upiUrl)}&s=220`
      })
  }, [showPay, fee])

  const handlePaymentSuccess = () => {
    setShowPay(false)
    try {
      window.dispatchEvent(new CustomEvent("bootstrap-invalidate"))
    } catch { }
    if (challengeParam && fromParam) {
      setShowChallengeModal(true)
    } else {
      navigate("/home", { replace: true })
    }
  }

  const handleChallengeAccept = async () => {
    if (!challengeParam || !fromParam) return
    setChallengeAcceptLoading(true)
    try {
      const res = await fetch("/api/challenges/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: fromParam, challenge: challengeParam }),
        credentials: "include"
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Failed to accept challenge")
      const qs = `challenge=${challengeParam}&from=${encodeURIComponent(fromParam)}`
      navigate(`/daily-quiz?${qs}`)
    } catch {
      setChallengeAcceptLoading(false)
    }
  }

  const handleChallengeDecline = () => {
    window.location.href = "https://www.youtube.com/kids"
  }

  return (
    <>
      <div className="intro-page-scroll intro-premium-shell relative w-full min-h-dvh flex flex-col items-center overflow-x-hidden selection:bg-primary selection:text-white font-sans scroll-smooth bg-transparent text-white">
        {/* Local page-specific aurora enhancements — subtle overlays on top of global background */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <NeonParticles className="opacity-70" />
          <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[35%] rounded-full bg-accent/8 blur-[110px]" />
        </div>

        <div className="w-full max-w-[100vw] relative z-10 transition-all duration-700 opacity-100">

          {/* ── 1. HERO SECTION ─────────────────────────────────── */}
          <section className="w-full flex flex-col items-center pt-16 sm:pt-24 lg:pt-40 pb-14 sm:pb-20 px-4 sm:px-6 text-center relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] sm:w-[800px] sm:h-[800px] bg-primary/5 blur-[110px] sm:blur-[150px] pointer-events-none" />
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full max-w-5xl"
            >
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[8px] sm:text-[9px] font-black tracking-[0.3em] sm:tracking-[0.4em] text-cyan-400 uppercase mb-7 sm:mb-10 shadow-2xl backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Global Skill Arena
              </div>
              
              <h1 className="text-[2rem] sm:text-[4rem] lg:text-[7.5rem] font-black tracking-tight sm:tracking-tighter leading-[1.05] sm:leading-[1] mb-6 sm:mb-8 lg:mb-14 py-1 sm:py-2 drop-shadow-2xl">
                SHARPEN YOUR <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-primary background-animate">IQ SCORE.</span>
              </h1>

              <p className="max-w-2xl mx-auto text-sm sm:text-lg lg:text-[1.35rem] text-white/75 leading-relaxed font-semibold mb-9 sm:mb-16 px-1">
                Compete in timed intellectual challenges, climb the global rankings, and unlock merit rewards.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-10 sm:mb-14 w-full sm:w-auto">
                <button
                  onClick={() => { void triggerHapticImpact("heavy"); setShowPay(true); }}
                  className="group relative h-12 sm:h-14 w-full sm:w-72 rounded-xl sm:rounded-2xl font-black text-[10px] tracking-[0.16em] sm:tracking-[0.2em] uppercase overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] bg-primary text-white shadow-[0_15px_40px_rgba(139,92,246,0.3)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <span className="relative z-10">Start Challenge</span>
                </button>
                <button
                  onClick={() => { void triggerHapticImpact("light"); setShowLogin(true); }}
                  className="h-12 sm:h-14 w-full sm:w-72 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 text-white font-black text-[10px] tracking-[0.16em] sm:tracking-[0.2em] uppercase hover:bg-white/10 transition-all hover:border-white/20 active:scale-95 backdrop-blur-xl"
                >
                  Member Login
                </button>
              </div>

              <div className="w-full opacity-90">
                <IntroJourneyStrip />
              </div>
            </motion.div>
          </section>

          {/* ── 2. FEATURES GRID ────────────────────────────────── */}
          <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-24 lg:py-32 relative">
            <div className="text-center mb-10 sm:mb-16 lg:mb-24">
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-primary mb-6 block">Our Platform</span>
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight uppercase">Platform <span className="text-white/30 italic">Features</span></h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
              {FEATURES.map((f: { title: string; desc: string; icon: string; badge: string }, i: number) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="ui-premium-card p-5 sm:p-8 lg:p-12 group transition-all duration-500"
                >
                  <div className="flex items-start justify-between gap-3 mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-500 border border-white/10">{f.icon}</div>
                    <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
                      {f.badge}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-4 tracking-tight group-hover:text-primary transition-colors">{f.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed font-medium">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* ── PRACTICE QUIZ ──────────────────────────────── */}
          <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-24 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/5 blur-[120px] pointer-events-none" />
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="text-center mb-10">
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-primary mb-4 block">Free Trial</span>
                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight uppercase">Practice <span className="text-white/30 italic">Quiz</span></h2>
                <p className="text-sm text-white/40 mt-3 max-w-lg mx-auto">Try our AI-powered quiz engine. 5 quick questions to warm up your brain — no sign-up needed.</p>
              </div>
              <PracticeQuizWidget onPayClick={() => { void triggerHapticImpact("heavy"); setShowPay(true); }} />
            </motion.div>
          </section>

          {/* ── 3. AI CONTENT ── */}
          <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 sm:p-8 lg:p-10">
              <div className="text-center mb-8">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-3 block">Public Overview</span>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">
                  Organizations &amp; API <span className="text-white/40 italic">Context</span>
                </h2>
                <p className="text-sm text-white/55 mt-3 max-w-3xl mx-auto">
                  This section is publicly visible so institutions and partners can understand how organization portals and API integrations work before contacting us.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {ORG_API_CONTEXT.map((group) => (
                  <div key={group.title} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <h3 className="text-base font-black uppercase tracking-wide text-primary mb-3">{group.title}</h3>
                    <ul className="space-y-2">
                      {group.points.map((point) => (
                        <li key={point} className="text-sm text-white/70 leading-relaxed">• {point}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="mt-7 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <button
                  type="button"
                  onClick={() => { setSponsorKind("university"); setShowSponsorModal(true) }}
                  className="rounded-xl bg-primary text-white px-6 py-3 text-xs font-black uppercase tracking-[0.18em] hover:brightness-110 transition-all"
                >
                  Request Organization Access
                </button>
                <button
                  type="button"
                  onClick={() => { setSponsorKind("collaboration"); setShowSponsorModal(true) }}
                  className="rounded-xl border border-white/20 bg-white/5 text-white px-6 py-3 text-xs font-black uppercase tracking-[0.18em] hover:bg-white/10 transition-all"
                >
                  Contact for API Integration
                </button>
                <Link
                  href="/integration-guide"
                  className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300 px-6 py-3 text-xs font-black uppercase tracking-[0.18em] hover:bg-cyan-400/20 transition-all text-center"
                >
                  View Integration Guide
                </Link>
              </div>
            </div>
          </section>

          {/* ── 3. AI CONTENT ── */}
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
            <AIIntroContent />
          </div>

          {/* ── 4. PARTNERSHIP HUB ────────────────── */}
          <section className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-24 mb-12 sm:mb-20 ui-premium-card">
            <div className="text-center mb-12">
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-4 block">ECOSYSTEM HUB</span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-none uppercase">Business <span className="text-white/40 italic">Inquiry Hub</span></h2>
            </div>
            <div className="flex justify-center">
              <motion.div
                whileHover={{ y: -5 }}
                className="w-full max-w-xl p-5 sm:p-8 lg:p-14 rounded-3xl sm:rounded-[2.5rem] bg-white/[0.02] border border-white/10 hover:border-primary/50 transition-all cursor-pointer group flex flex-col items-center text-center shadow-2xl relative overflow-hidden"
                onClick={() => { setSponsorKind("sponsor"); setShowSponsorModal(true) }}
              >
                <div className="flex gap-4 mb-8">
                  <div className="text-4xl group-hover:scale-110 transition-transform">🏆</div>
                  <div className="text-4xl group-hover:scale-110 transition-transform delay-75">📢</div>
                </div>
                <h3 className="text-xl font-black mb-4 uppercase tracking-tight">Partner Gateway</h3>
                <p className="text-sm text-white/50 leading-relaxed max-w-md mb-8">Submit sponsorship or collaboration requests. Our team initiates contact within 24 hours.</p>
                <div className="px-8 py-4 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/30 group-hover:brightness-110 transition-all">
                  Open Hub →
                </div>
              </motion.div>
            </div>
          </section>

          {/* ── 6. QUICK MANUAL & FAQ ─────────────────────────── */}
          <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-24 lg:py-32 mb-12 sm:mb-20 border-t border-white/5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-14 lg:gap-20">
              <div className="space-y-8 sm:space-y-12">
                <div>
                  <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black leading-[0.9] sm:leading-[0.85] tracking-tighter uppercase mb-3">QUICK <br /> <span className="text-primary italic">RULES.</span></h2>
                  <p className="text-white/35 text-[10px] font-black uppercase tracking-[0.4em]">Protocol V2026.04</p>
                </div>
                <div className="space-y-4">
                  {[
                    "Standard 30-second response window.",
                    "Strict fullscreen deterrence active.",
                    "Single device per session (Anti-Proxy).",
                    "Rewards processed within 48h."
                  ].map((rule, i) => (
                    <div key={i} className="flex items-center gap-3 sm:gap-5 p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-[11px] font-black text-primary border border-primary/20">{i+1}</div>
                      <span className="text-xs sm:text-sm text-white/70 font-semibold">{rule}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-6">
                  <div className="max-w-xs mx-auto lg:mx-0">
                    <UserManualBook />
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">Knowledge Base</span>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {INTRO_FAQS.slice(0, 4).map((faq, i) => (
                    <div key={i} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary/30 transition-all group">
                      <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {faq.q}
                      </h4>
                      <p className="text-xs text-white/40 leading-relaxed pl-4.5">{faq.a}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowContact(true)}
                  className="w-full py-6 rounded-2xl border border-primary/20 bg-primary/5 text-[11px] font-black uppercase tracking-[0.4em] hover:bg-primary/10 transition-all text-primary"
                >
                  📡 Get Help
                </button>
              </div>
            </div>
          </section>

          {/* ── 7. FOOTER ─────────────────────────────────────── */}
          <footer className="w-full py-14 sm:py-24 lg:py-40 px-4 sm:px-6 border-t border-white/5 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/8 blur-[140px] -z-10" />
            <div className="mb-12 opacity-40">
              <Image src={logoPng} alt="IQ Earners" width={48} height={48} className="mx-auto grayscale hover:grayscale-0 transition-all duration-500" />
            </div>
            <p className="text-[11px] text-white/30 font-black tracking-[0.6em] uppercase mb-10">IQ Earners Team</p>
            <div className="flex flex-wrap justify-center gap-6 sm:gap-12 text-[10px] sm:text-[11px] font-black tracking-widest text-white/50 uppercase mb-12 sm:mb-20">
              <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => setLegalDoc("terms")}>Terms</span>
              <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => setLegalDoc("privacy")}>Privacy</span>
              <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => setLegalDoc("rules")}>Rules</span>
            </div>
            <p className="text-[10px] text-white/10 font-medium tracking-tight">© 2026 IQ EARNERS · SECURED & VERIFIED ECOSYSTEM.</p>
          </footer>
        </div>

        {msg === "session-ended" && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[150] w-[90%] max-w-sm p-6 rounded-2xl bg-amber-500 text-black text-[11px] font-black uppercase text-center shadow-3xl animate-slide-up tracking-widest border-2 border-black/10">
            Session Terminated: Access Expired
          </div>
        )}
      </div>

      {showPay && (
        <PaymentModal
          amount={fee}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPay(false)}
        />
      )}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} initialUsername={usernameParam ?? undefined} />}
      {showContact && <ContactModal onClose={() => setShowContact(false)} />}
      {legalDoc && <LegalModal type={legalDoc as any} onClose={() => setLegalDoc(null)} />}

      {/* ── SPONSOR MODAL ── */}
      <AnimatePresence>
        {showSponsorModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl" onClick={() => setShowSponsorModal(false)}>
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="w-full sm:max-w-lg max-h-[90vh] flex flex-col rounded-[2.5rem] relative overflow-hidden bg-[#0d1017] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)]"
              onClick={e => e.stopPropagation()}
            >
              <div className="shrink-0 flex items-center justify-between px-8 py-6 border-b border-white/5 bg-white/[0.02]">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight uppercase">Partner Gateway</h2>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">Scale with IQ Earners</p>
                </div>
                <button onClick={() => setShowSponsorModal(false)} className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                  <XIcon size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
                {sponsorModalView === "turnstile" ? (
                  <div className="flex flex-col items-center py-20 gap-8">
                     <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-4xl animate-pulse text-primary">🛡️</div>
                     <div className="text-center">
                       <p className="text-lg font-black text-white uppercase italic">Security Handshake</p>
                       <p className="text-xs text-white/30 mt-1 uppercase tracking-widest">Validating session...</p>
                     </div>
                     <TurnstileWidget onVerify={() => setSponsorModalView("form")} appearance="interaction-only" />
                  </div>
                ) : sponsorModalView === "success" ? (
                  <div className="text-center py-12 space-y-8">
                    <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center text-primary mx-auto shadow-[0_0_50px_rgba(124,58,237,0.3)] border-2 border-primary/40">
                      <CheckIcon size={48} />
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-white uppercase italic">Broadcast Sent</h3>
                      <p className="text-sm text-white/40 mt-3 font-medium">Our intelligence team will analyze your inquiry <br/>and initiate contact within 24 hours.</p>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/10 font-mono">
                      <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] mb-2 font-black">Transmission ID</p>
                      <span className="text-xl font-black text-primary tracking-tighter">{statusCode}</span>
                    </div>
                    <button onClick={() => setShowSponsorModal(false)} className="w-full py-5 rounded-2xl font-black bg-white text-black uppercase tracking-[0.2em] hover:scale-[1.02] transition-transform shadow-2xl">Terminate Session</button>
                  </div>
                ) : (
                  <SponsorForms 
                    onSubmit={async (p) => {
                      setSponsorFormError(null);
                      const res = await fetch("/api/sponsors", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(p)
                      });
                      const data = await res.json().catch(() => ({ ok: false }));
                      if (data.ok) {
                        setStatusCode(data.code);
                        setSponsorModalView("success");
                      } else {
                        setSponsorFormError(data.error || "Broadcast Failed");
                      }
                    }}
                    onCancel={() => setShowSponsorModal(false)}
                  />
                )}
                {sponsorFormError && <p className="text-center text-red-500 font-black text-[10px] uppercase font-sans animate-bounce">{sponsorFormError}</p>}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── STATUS CHECK MODAL ── */}
      <AnimatePresence>
        {showStatusModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-3xl" onClick={() => setShowStatusModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md p-10 rounded-[3rem] bg-[#0c1117] border border-white/5 shadow-[0_50px_100px_rgba(0,0,0,0.8)] relative font-sans"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center space-y-6">
                <div className="w-20 h-20 rounded-[2rem] bg-primary/10 flex items-center justify-center text-4xl mx-auto border border-primary/20 shadow-inner">🔍</div>
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Transmission Lookup</h2>
                  <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] mt-2">Enter Partner ID to retrieve logs</p>
                </div>

                <div className="mt-10 space-y-5">
                  <input
                    type="text"
                    value={statusCode}
                    onChange={e => setStatusCode(e.target.value.toUpperCase())}
                    placeholder="PARTNER-XXXXXXX"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-5 text-center font-mono text-xl font-bold text-primary tracking-tighter outline-none focus:border-primary/50 transition-all placeholder:opacity-20"
                  />

                  <button
                    onClick={async () => {
                      if (!statusCode || statusCode.length < 5) return;
                      const r = await fetch(`/api/sponsors?id=${statusCode}`);
                      const j = await r.json().catch(() => ({ data: null }));
                      setStatusResult(j.data || { found: false });
                    }}
                    className="w-full py-5 rounded-2xl bg-white text-black font-black uppercase tracking-[0.2em] hover:bg-primary transition-all active:scale-95 shadow-xl"
                  >
                    Sync Records →
                  </button>

                  <AnimatePresence mode="wait">
                    {statusResult && (
                      <motion.div 
                        key={statusResult.found ? "found" : "not-found"}
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: "auto" }} 
                        className="overflow-hidden"
                      >
                        {!statusResult.found ? (
                          <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-[10px] text-red-500 font-black uppercase tracking-widest text-center">No Data in Repository</div>
                        ) : (
                          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-left space-y-4">
                            <div className="flex justify-between items-center group">
                              <span className="text-[10px] uppercase font-black tracking-widest text-white/30">Inquiry Status</span>
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${statusResult.status === 'Approved' ? 'bg-emerald-500 text-black' : 'bg-primary text-black'}`}>
                                {statusResult.status || 'Processing'}
                              </span>
                            </div>
                            {statusResult.reply && (
                              <div className="pt-4 border-t border-white/5">
                                <p className="text-[10px] uppercase font-black text-white/20 mb-2 tracking-widest">HQ RESPONSE:</p>
                                <p className="text-xs text-white/70 italic leading-relaxed">&apos;{statusResult.reply}&apos;</p>
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="pt-8 flex flex-col gap-4">
                  <button onClick={() => setShowStatusModal(false)} className="text-[10px] font-black text-white/20 hover:text-white uppercase tracking-[0.3em] transition-colors">Close Operation</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showChallengeModal && challengeParam && fromParam && (
        <ChallengeAcceptModal
          challengerName={fromParam || ""}
          challenge={challengeParam || ""}
          onAccept={handleChallengeAccept}
          onDecline={handleChallengeDecline}
          loading={challengeAcceptLoading}
        />
      )}

      <StickyIntroCTA fee={fee} onParticipate={() => { void triggerHapticImpact("heavy"); setShowPay(true); }} />
    </>
  )
}
