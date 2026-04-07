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
import { PARENT_COMPANY_NAME } from "@/lib/seo"

const PaymentModal = dynamic(() => import("../../components/PaymentModal"), { ssr: false })
const LoginModal = dynamic(() => import("../../components/LoginModal"), { ssr: false })
const LegalModal = dynamic(() => import("../../components/LegalModal"), { ssr: false })
const ContactModal = dynamic(() => import("../../components/ContactModal"), { ssr: false })
const ChallengeAcceptModal = dynamic(() => import("../../components/ChallengeAcceptModal"), { ssr: false })
const AIIntroContent = dynamic(() => import("../../components/AIIntroContent"), { ssr: false })
const CreatorBanner = dynamic(() => import("../../components/CreatorBanner"), { ssr: false })
const UserManualBook = dynamic(() => import("../../components/UserManualBook"), { ssr: false })
import { triggerHapticImpact } from "@/lib/haptics"
import StickyIntroCTA from "../../components/StickyIntroCTA"
import CookieBanner from "../../components/CookieBanner"

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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-0">
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
              className={`relative flex-1 sm:flex-none sm:min-w-[148px] max-w-md mx-auto sm:mx-0 rounded-2xl border backdrop-blur-sm px-4 py-4 sm:py-5 text-center ${cardBase}`}
            >
              <span
                className="absolute top-2.5 left-2.5 text-[9px] font-black tabular-nums tracking-widest text-white/25"
                aria-hidden
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="text-3xl sm:text-[2rem] leading-none mb-2 select-none" aria-hidden>
                {step.emoji}
              </div>
              <h3 className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.18em] text-primary leading-snug">
                {step.title}
              </h3>
              <p className={`text-[10px] mt-1.5 font-semibold leading-tight ${subColor}`}>{step.subtitle}</p>
            </motion.article>

            {i < INTRO_JOURNEY_STEPS.length - 1 ? (
              <motion.div
                className="flex items-center justify-center shrink-0 py-1 sm:py-0 sm:px-1"
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
                    className="text-xl sm:text-2xl font-black leading-none block rotate-90 sm:rotate-0 origin-center"
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
  const [cookieBlur, setCookieBlur] = useState(false)
  const didAutoOpenLoginRef = useRef(false)
  const didAutoOpenChallengeRef = useRef(false)
  
  const msg = search.get("msg")
  const challengeParam = search.get("challenge")
  const fromParam = search.get("from")
  const loginParam = search.get("login")
  const usernameParam = search.get("username")
  const legalParam = search.get("legal") as "terms" | "privacy" | "rules" | "grievance" | "refund" | "disclaimer" | "cookie" | null

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
      <div className="intro-page-scroll relative w-full min-h-dvh flex flex-col items-center selection:bg-primary selection:text-white font-sans scroll-smooth bg-transparent text-white">
        {/* Local page-specific aurora enhancements — subtle overlays on top of global background */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[35%] rounded-full bg-accent/8 blur-[110px]" />
        </div>

        <div className={`w-full relative z-10 transition-all duration-700 ${cookieBlur ? "blur-xl scale-[0.98] pointer-events-none" : "opacity-100"}`}>

          {/* ── 1. HERO SECTION ─────────────────────────────────── */}
          <section className="w-full flex flex-col items-center pt-24 pb-16 px-6 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, rotate: -3 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="relative mb-10"
            >
              <div className="absolute -inset-8 rounded-[2rem] bg-gradient-to-tr from-primary/30 via-accent/20 to-primary/10 blur-3xl animate-pulse" />
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-[2rem] overflow-hidden border-2 border-primary/35 bg-black/50 backdrop-blur-xl shadow-[0_0_40px_rgba(124,58,237,0.25)] p-1">
                <Image src={logoPng} alt="IQ Earners" width={112} height={112} sizes="112px" className="w-full h-full object-cover rounded-[1.8rem]" priority />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-4xl"
            >
              <span className="inline-block px-5 py-2 rounded-full bg-gradient-to-r from-primary/20 to-accent/15 border border-primary/30 text-[10px] font-black tracking-[0.32em] text-accent uppercase mb-6 shadow-[0_0_24px_rgba(20,184,166,0.15)]">
                Premium Intellectual Arena
              </span>
              <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-[0.9] mb-6">
                LEVEL UP <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-primary to-accent">YOUR INTELLIGENCE</span>
              </h1>
              <p className="max-w-xl mx-auto text-base sm:text-lg text-white/50 leading-relaxed font-medium mb-4">
                Join India's most prestigious merit-based platform. Solve daily challenges, dominate national leaderboards, and earn recognition for your cognitive speed.
              </p>
              <p className="max-w-xl mx-auto text-[11px] sm:text-xs font-bold uppercase tracking-[0.28em] text-accent/90 mb-8">
                Daily GK · Live tournaments · Merit prizes
              </p>

              <IntroJourneyStrip />

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => { void triggerHapticImpact("heavy"); setShowPay(true); }}
                  className="group relative h-16 w-full sm:w-64 rounded-2xl font-black text-sm tracking-widest uppercase overflow-hidden transition-all hover:scale-[1.03] active:scale-[0.98] bg-gradient-to-r from-primary to-primary-focus text-white shadow-[0_12px_40px_rgba(124,58,237,0.35)] ring-2 ring-accent/40 ring-offset-2 ring-offset-[#06040f]"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative z-10 drop-shadow-sm">Enroll Now — ₹{fee}</span>
                </button>
                <button
                  onClick={() => { void triggerHapticImpact("light"); setShowLogin(true); }}
                  className="h-16 w-full sm:w-64 rounded-2xl bg-white/[0.04] border border-accent/25 text-white font-black text-sm tracking-widest uppercase hover:border-accent/50 hover:bg-accent/10 transition-all active:scale-95"
                >
                  Sign In
                </button>
              </div>
            </motion.div>
          </section>

          <div className="w-full max-w-4xl mx-auto px-6 mb-20">
            <CreatorBanner />
          </div>

          {/* ── 2. FEATURES GRID ────────────────────────────────── */}
          <section className="w-full max-w-6xl mx-auto px-6 py-20 border-t border-white/5">
            <div className="text-center mb-16">
              <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.35em] text-primary/90 mb-4">
                <span className="h-px w-8 bg-gradient-to-r from-transparent to-primary/60" aria-hidden />
                Why players stay
                <span className="h-px w-8 bg-gradient-to-l from-transparent to-primary/60" aria-hidden />
              </span>
              <h2 className="text-3xl font-black uppercase tracking-tighter sm:text-4xl">Platform Capabilities</h2>
              <p className="text-white/40 text-sm mt-2 uppercase tracking-[0.2em]">Scale your potential with IQ Earners</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {FEATURES.map((f: { title: string; desc: string; icon: string; badge: string }, i: number) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group relative p-8 rounded-[2.5rem] bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 overflow-hidden hover:border-primary/35 hover:shadow-[0_20px_50px_rgba(124,58,237,0.12)] transition-all duration-300"
                >
                  <div
                    className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-60 group-hover:opacity-100 transition-opacity"
                    aria-hidden
                  />
                  <div className="flex items-start justify-between gap-3 mb-5">
                    <div className="text-4xl leading-none select-none" aria-hidden>{f.icon}</div>
                    <span className="shrink-0 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/25">
                      {f.badge}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 tracking-tight">{f.title}</h3>
                  <p className="text-sm text-white/45 leading-relaxed font-medium">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* ── 3. AI CONTENT ── */}
          <div className="max-w-4xl mx-auto px-6 py-10">
            <AIIntroContent />
          </div>

          {/* ── 4. PARTNERSHIP HUB ────────────────── */}
          <section className="w-full max-w-5xl mx-auto px-6 py-24 border-y border-white/5 bg-white/[0.01]">
            <div className="text-center mb-16">
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-4 block">ECOSYSTEM HUB</span>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-none uppercase">Business <br/><span className="text-white/40">Inquiry Hub</span></h2>
            </div>

            <div className="flex justify-center">
              <motion.div
                whileHover={{ y: -10 }}
                className="w-full max-w-2xl p-10 rounded-[3rem] bg-navy-950/60 border border-white/10 hover:border-primary/50 transition-all cursor-pointer group flex flex-col items-center text-center shadow-[0_30px_60px_rgba(0,0,0,0.4)]"
                onClick={() => { setSponsorKind("sponsor"); setShowSponsorModal(true) }}
              >
                <div className="flex gap-4 mb-8">
                  <div className="text-5xl group-hover:scale-110 transition-transform">🏆</div>
                  <div className="text-5xl group-hover:scale-110 transition-transform delay-75">📢</div>
                  <div className="text-5xl group-hover:scale-110 transition-transform delay-150">🎓</div>
                </div>
                <h3 className="text-2xl font-black mb-4">PARTNERSHIP ENQUIRY</h3>
                <p className="text-sm text-white/40 leading-relaxed max-w-md">One portal for all partnerships. Submit your proposal for sponsorship, product promotion, or institutional collaboration and our AI-enhanced logistics team will review it within 24 hours.</p>
                
                <div className="mt-10 flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-primary-focus text-white font-black uppercase tracking-widest shadow-lg shadow-primary/30 hover:brightness-110 transition-all">
                  Open Hub →
                </div>
              </motion.div>
            </div>

            <div className="mt-12 text-center">
              <button 
                onClick={() => setShowStatusModal(true)}
                className="text-[10px] font-black text-white/30 uppercase tracking-widest hover:text-primary transition-colors flex items-center justify-center gap-2 mx-auto"
              >
                🔍 TRACK EXISTING INQUIRY
              </button>
            </div>
          </section>


          {/* ── 6. QUICK MANUAL & FAQ ─────────────────────────── */}
          <section className="w-full max-w-5xl mx-auto px-6 py-24 bg-white/[0.01]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
              <div className="space-y-8">
                <div>
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-4 block">OPERATIONAL PROTOCOL</span>
                  <h2 className="text-4xl font-black leading-[0.9]">USER <br /> <span className="text-primary">MANUAL.</span></h2>
                </div>
                <div className="space-y-4">
                  {[
                    "Standard 30-second response window.",
                    "Strict fullscreen deterrence active.",
                    "Single device per session (Anti-Proxy).",
                    "Rewards processed within 48h."
                  ].map((rule, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                      <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">{i+1}</div>
                      <span className="text-xs text-white/60 font-medium">{rule}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-4 flex flex-col items-center">
                  <div className="w-full max-w-xs">
                    <UserManualBook />
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-4 block">KNOWLEDGE BASE</span>
                  <h2 className="text-4xl font-black leading-[0.9]">COMMON <br /> <span className="text-primary">INQUIRIES.</span></h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {INTRO_FAQS.map((faq, i) => (
                    <motion.div
                      key={faq.q}
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-5 hover:border-accent/35 transition-all duration-300"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-primary/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" aria-hidden />
                      <h4 className="text-xs font-black mb-2 flex items-start gap-2 text-white/95">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-accent shrink-0" aria-hidden />
                        {faq.q}
                      </h4>
                      <p className="text-[11px] text-white/45 leading-relaxed font-medium pl-3">{faq.a}</p>
                    </motion.div>
                  ))}
                </div>
                <button
                  onClick={() => setShowContact(true)}
                  className="w-full py-5 rounded-2xl border border-white/10 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/[0.03] transition-all flex items-center justify-center gap-3"
                >
                  📡 Connect with Help Desk
                </button>
              </div>
            </div>
          </section>

          {/* ── 7. FOOTER ─────────────────────────────────────── */}
          <footer className="w-full py-32 px-6 border-t border-white/5 text-center">
            <div className="mb-10 opacity-20 filter grayscale">
              <Image src={logoPng} alt="IQ Earners" width={40} height={40} className="mx-auto" />
            </div>
            <p className="text-[10px] text-white/20 font-black tracking-[0.5em] uppercase mb-6">INTELLECTUAL ARENA • INDIA</p>
            <div className="flex flex-wrap justify-center gap-8 text-[10px] font-black tracking-widest text-white/30 uppercase">
              <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => setLegalDoc("terms")}>Terms</span>
              <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => setLegalDoc("privacy")}>Privacy</span>
              <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => setLegalDoc("rules")}>Rules</span>
            </div>
            <p className="mt-16 text-[9px] text-white/5 font-medium tracking-tight">© 2026 IQ EARNERS · PARENT COMPANY {PARENT_COMPANY_NAME.toUpperCase()}. ALL ASSETS SECURED & VERIFIED.</p>
          </footer>
        </div>

        {msg === "auth-required" && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] w-[90%] max-w-sm p-5 rounded-2xl bg-primary text-black text-[10px] font-black uppercase text-center shadow-2xl animate-slide-up tracking-widest">
            Identity Required: Please Sign In to Access Arena
          </div>
        )}
        {msg === "session-ended" && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] w-[90%] max-w-sm p-5 rounded-2xl bg-amber-500 text-black text-[10px] font-black uppercase text-center shadow-2xl animate-slide-up tracking-widest">
            Session ended: signed in elsewhere, timed out, or idle. Please sign in again.
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

      <CookieBanner onVisibleChange={setCookieBlur} />
      <StickyIntroCTA fee={fee} onParticipate={() => { void triggerHapticImpact("heavy"); setShowPay(true); }} />
    </>
  )
}
