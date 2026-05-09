"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import logoPng from "@/app/prizes/icon.png"
import TurnstileWidget from "../../components/TurnstileWidget"
import { supabase } from "@/lib/supabaseClient"

export default function CreatorJoinPage() {
    const router = useRouter()
    const [step, setStep] = useState<"gate" | "google" | "social" | "form" | "otp" | "status">("gate")
    const [verified, setVerified] = useState(false)
    const [email, setEmail] = useState("")
    const [name, setName] = useState("")
    const [platform, setPlatform] = useState<"instagram" | "youtube" | "moj" | "sharechat" | "facebook" | null>(null)
    const [handle, setHandle] = useState("")
    const [type, setType] = useState<"referral" | "partner">("referral")
    const [cvFile, setCvFile] = useState<File | null>(null)
    const [otp, setOtp] = useState("")
    const [loading, setLoading] = useState(false)
    const [statusEmail, setStatusEmail] = useState("")
    const [statusResult, setStatusResult] = useState<any>(null)
    const [error, setError] = useState("")
    const [receivedOtp, setReceivedOtp] = useState("")
    const [otpResendSecs, setOtpResendSecs] = useState(0)
    const [showTerms, setShowTerms] = useState(false)
    const [termsTab, setTermsTab] = useState<"terms" | "privacy">("terms")

    // Security: Block Back Redirection during process
    useEffect(() => {
        if (typeof window === "undefined" || step === "gate") return
        const handlePopState = (e: PopStateEvent) => {
            window.history.pushState(null, "", window.location.href)
            setError("Back navigation is disabled for security reasons.")
        }
        window.history.pushState(null, "", window.location.href)
        window.addEventListener("popstate", handlePopState)
        return () => window.removeEventListener("popstate", handlePopState)
    }, [step])

    useEffect(() => {
        if (otpResendSecs <= 0) return
        const t = setInterval(() => setOtpResendSecs((s) => (s <= 1 ? 0 : s - 1)), 1000)
        return () => clearInterval(t)
    }, [otpResendSecs])

    const handleProceedToSocial = () => {
        if (!email.includes("@") || !email.includes(".")) {
            setError("Please enter a valid email address")
            return
        }
        if (name.length < 3) {
            setError("Please enter your full name")
            return
        }
        setError("")
        setStep("social")
    }

    const handleSendOtp = async () => {
        if (!handle || handle.length < 3) {
            setError("Please enter a valid social handle")
            return
        }
        setLoading(true)
        setError("")
        const r = await fetch("/api/creator/send-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, name, platform, handle })
        })
        const j = await r.json()
        setLoading(false)
        if (j.ok) {
            setStep("otp")
            setOtp("")
            setOtpResendSecs(0)
            if (j.otp) setReceivedOtp(j.otp)
        }
        else setError(j.error || "Failed to verify handle or send OTP")
    }

    const handleResendCreatorOtp = async () => {
        if (!handle || handle.length < 3 || otpResendSecs > 0 || loading) return
        setLoading(true)
        setError("")
        const r = await fetch("/api/creator/send-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, name, platform, handle })
        })
        const j = await r.json()
        setLoading(false)
        if (j.ok) {
            setOtp("")
            setOtpResendSecs(45)
            if (j.otp) setReceivedOtp(j.otp)
        } else setError(j.error || "Could not resend code")
    }

    const handleApply = async () => {
        setLoading(true)
        setError("")
        const r = await fetch("/api/creator/apply", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email, name, otp, platform, handle, type,
                cvUrl: cvFile ? "uploaded_to_server_mock" : ""
            })
        })
        const j = await r.json()
        setLoading(false)
        if (j.ok) {
            setStep("status")
            handleCheckStatus(email)
        } else {
            setError(j.error || "Failed to apply")
        }
    }

    const handleCheckStatus = async (targetEmail?: string) => {
        setLoading(true)
        setError("")
        const r = await fetch("/api/creator/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: targetEmail || statusEmail })
        })
        const j = await r.json()
        setLoading(false)
        if (j.ok) setStatusResult(j)
        else setError(j.error || "No application found")
    }

    return (
        <main className="relative flex min-h-screen w-full max-w-[100vw] flex-col items-center justify-center overflow-hidden p-6 font-sans text-white app-page-surface">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full -z-10">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/5 blur-[100px] rounded-full animate-pulse delay-700" />
            </div>

            <div className="w-full max-w-lg animate-slide-up">
                <div className="flex flex-col items-center mb-8">
                    <Image src={logoPng} alt="IQ Earners" className="h-20 w-20 rounded-2xl border border-white/10 mb-4 shadow-xl" />
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent italic" style={{ fontFamily: "Pacifico, cursive" }}>IQ Creator Hub</h1>
                    <p className="text-navy-300 text-sm mt-2">Empowering content creators with real earning opportunities</p>
                </div>

                {error && (
                    <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm animate-shake text-center">{error}</div>
                )}

                <div className="glass-morphism p-8 rounded-3xl border border-white/10 shadow-2xl min-h-[400px] flex flex-col items-stretch justify-center relative overflow-hidden">
                    {step === "gate" && (
                        <div className="text-center space-y-6">
                            <div className="text-4xl mb-4">🚀</div>
                            <h2 className="text-xl font-bold">First, verify your access</h2>
                            <div className="flex justify-center">
                                <TurnstileWidget onVerify={() => setVerified(true)} />
                            </div>
                            <button
                                disabled={!verified}
                                onClick={() => setStep("google")}
                                className="w-full py-4 rounded-2xl bg-primary text-black font-bold disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/20"
                            >
                                Continue →
                            </button>
                            <button
                                onClick={() => setStep("status")}
                                className="text-navy-400 text-sm hover:text-white transition-colors"
                            >
                                Already applied? Check status
                            </button>
                        </div>
                    )}

                    {step === "google" && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="text-4xl mb-2">👤</div>
                                <h2 className="text-xl font-bold">Creator Identity</h2>
                                <p className="text-navy-400 text-xs">Tell us who you are to proceed</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-navy-400">Full Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary"
                                        placeholder="e.g. Rahul Sharma"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-navy-400">Email Address</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary"
                                        placeholder="your@email.com"
                                    />
                                </div>
                                <button
                                    onClick={handleProceedToSocial}
                                    className="w-full py-4 rounded-2xl bg-primary text-black font-bold hover:shadow-xl transition-all"
                                >
                                    Continue →
                                </button>
                            </div>
                        </div>
                    )}

                    {step === "social" && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-center">Choose your platform</h2>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { id: "instagram", icon: "📸", label: "Instagram" },
                                    { id: "youtube", icon: "🔴", label: "YouTube" },
                                    { id: "moj", icon: "🎭", label: "Moj" },
                                    { id: "sharechat", icon: "💬", label: "ShareChat" },
                                    { id: "facebook", icon: "💙", label: "Facebook" }
                                ].map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => {
                                            setPlatform(p.id as any)
                                            setStep("form")
                                        }}
                                        className="flex flex-col items-center justify-center p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50 transition-all group"
                                    >
                                        <span className="text-4xl mb-2 group-hover:scale-125 transition-transform">{p.icon}</span>
                                        <span className="text-xs font-semibold">{p.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === "form" && (
                        <div className="space-y-5">
                            <h2 className="text-xl font-bold flex items-center gap-2 capitalize">
                                {platform === "instagram" ? "📸" : platform === "youtube" ? "🔴" : "📱"}
                                {platform} Details
                            </h2>

                            <div className="space-y-1">
                                <label className="text-xs text-navy-400">Account Handle / Name</label>
                                <input
                                    type="text"
                                    value={handle}
                                    onChange={(e) => setHandle(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary"
                                    placeholder="@yourhandle"
                                />
                            </div>

                            <div className="space-y-1 bg-primary/5 p-4 rounded-xl border border-primary/20">
                                <label className="text-xs text-primary font-bold tracking-wider uppercase">AI Background Check</label>
                                <p className="text-[10px] text-navy-400">Our Admin AI will automatically scan your <b>@{handle || "handle"}</b> metrics across {platform}. Do not manually enter fake numbers.</p>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs text-navy-400">Engagement Type</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setType("referral")}
                                        className={`p-4 rounded-xl border text-xs font-bold transition-all ${type === "referral" ? "border-primary bg-primary/20 text-primary" : "border-white/10 bg-white/5"}`}
                                    >
                                        Referral Based
                                        <div className="text-[10px] font-normal mt-1 text-white/60">Earn per user joined</div>
                                    </button>
                                    <button
                                        onClick={() => setType("partner")}
                                        className={`p-4 rounded-xl border text-xs font-bold transition-all ${type === "partner" ? "border-accent bg-accent/20 text-accent" : "border-white/10 bg-white/5"}`}
                                    >
                                        Join Company
                                        <div className="text-[10px] font-normal mt-1 text-white/60">Salary + Commissions</div>
                                    </button>
                                </div>
                            </div>

                            {type === "partner" && (
                                <div className="space-y-2 animate-slide-up">
                                    <label className="text-xs text-navy-400">Upload CV (PDF/Word)</label>
                                    <input
                                        type="file"
                                        onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                                        className="w-full text-xs text-navy-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-black hover:file:bg-primary/80"
                                    />
                                    <p className="text-[10px] text-navy-500 italic">Our AI will review your CV to suggest a perfect role.</p>
                                </div>
                            )}

                            <button
                                disabled={!handle || loading}
                                onClick={handleSendOtp}
                                className="w-full py-4 mt-4 rounded-2xl bg-primary text-black font-bold disabled:opacity-50 transition-all hover:shadow-xl flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <span className="animate-spin text-xl">🤖</span>
                                        <span>AI scanning account metrics...</span>
                                    </div>
                                ) : "Verify & Scan Handle →"}
                            </button>
                        </div>
                    )}

                    {/* Security Protocol Indicator */}
                    <div className="absolute bottom-2 left-0 w-full flex justify-center pointer-events-none">
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5 backdrop-blur-sm">
                            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[8px] text-navy-500 font-bold uppercase tracking-[1px]">Secure Verification Protocol Active</span>
                        </div>
                    </div>
                    {step === "otp" && (
                        <div className="text-center space-y-6">
                            <div className="text-4xl mb-2">✉️</div>
                            <h2 className="text-xl font-bold">Check your email</h2>
                            <p className="text-navy-400 text-xs">We&apos;ve sent a 6-digit code to {email}</p>

                            {receivedOtp && (
                                <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl animate-pulse">
                                    <div className="text-[10px] text-primary font-bold uppercase mb-1">Dev Mode: Real OTP Display</div>
                                    <div className="text-2xl font-mono font-bold tracking-[4px] text-white">{receivedOtp}</div>
                                </div>
                            )}

                            <div className="flex justify-center">
                                <input
                                    type="text"
                                    maxLength={6}
                                    autoFocus
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                                    className="w-[200px] bg-black/40 border-2 border-primary/50 rounded-2xl px-6 py-4 text-center text-3xl font-mono tracking-[8px] outline-none"
                                    placeholder="000000"
                                />
                            </div>
                            <p className="text-[10px] text-navy-500 text-center leading-relaxed">
                                Didn&apos;t get the code? Check spam or resend — a new code invalidates the old one.
                            </p>
                            <div className="flex flex-col gap-2">
                                <button
                                    type="button"
                                    disabled={otp.length !== 6 || loading}
                                    onClick={handleApply}
                                    className="w-full py-4 rounded-2xl bg-primary text-black font-bold disabled:opacity-50 transition-all shadow-lg"
                                >
                                    {loading ? "Approving... 🤖" : "Submit Application"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleResendCreatorOtp()}
                                    disabled={loading || otpResendSecs > 0}
                                    className="text-[10px] font-semibold text-primary/90 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {otpResendSecs > 0 ? `Resend code in ${otpResendSecs}s` : "Resend verification email"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStep("form")}
                                    className="text-navy-400 text-xs"
                                >
                                    Back to form
                                </button>
                            </div>
                        </div>
                    )}

                    {step === "status" && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-center">Check Status</h2>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-navy-400">Your Email</label>
                                    <input
                                        type="email"
                                        value={statusEmail}
                                        onChange={(e) => setStatusEmail(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary"
                                        placeholder="creator@example.com"
                                    />
                                </div>
                                <button
                                    onClick={() => handleCheckStatus()}
                                    disabled={loading || !statusEmail}
                                    className="w-full py-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold transition-all border border-white/10"
                                >
                                    {loading ? "Checking..." : "Verify Status"}
                                </button>
                            </div>

                            {statusResult && (
                                <div className="mt-6 p-6 rounded-2xl border border-white/10 bg-navy-800/50 animate-pop">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-xs text-navy-400">Application Status</span>
                                        <span className={`pill text-[10px] uppercase font-bold ${statusResult.status === "approved" ? "bg-emerald-500/20 text-emerald-400" :
                                            statusResult.status === "rejected" ? "bg-red-500/20 text-red-500" :
                                                "bg-amber-500/20 text-amber-500"
                                            }`}>
                                            {statusResult.status}
                                        </span>
                                    </div>
                                    <div className="mb-4">
                                        <div className="text-xs text-navy-400 mb-1">Feedback from Admin AI</div>
                                        <p className="text-sm text-white/80 italic leading-relaxed">"{statusResult.feedback}"</p>
                                    </div>
                                    {statusResult.suggestedRole && (
                                        <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                                            <div className="text-[10px] font-bold text-primary uppercase mb-1">AI Assigned Role</div>
                                            <div className="text-sm font-bold">{statusResult.suggestedRole}</div>
                                        </div>
                                    )}
                                    {statusResult.status === "approved" && (
                                        <button
                                            onClick={async () => {
                                                const r = await fetch("/api/creator/session", {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ email: statusEmail || email })
                                                })
                                                const j = await r.json()
                                                if (j.ok) router.push("/creator/dashboard")
                                                else setError("Failed to start session")
                                            }}
                                            className="w-full py-4 rounded-2xl bg-emerald-500 text-black font-bold hover:scale-[1.01] active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                                        >
                                            Enter Dashboard →
                                        </button>
                                    )}
                                </div>
                            )}

                            <div className="text-center">
                                <button onClick={() => setStep("gate")} className="text-navy-400 text-xs">Back to Start</button>
                            </div>
                        </div>
                    )}
                </div>

                <p className="text-center mt-8 text-navy-600 text-[10px] leading-relaxed">
                    The IQ Creator program is exclusively for established content creators.<br />
                    By applying, you agree to our <button onClick={() => { setTermsTab("terms"); setShowTerms(true) }} className="underline hover:text-white">Partnership Terms</button> and <button onClick={() => { setTermsTab("privacy"); setShowTerms(true) }} className="underline hover:text-white">Privacy Policy</button>.
                </p>

                {showTerms && (
                    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
                        <div className="bg-navy-900 border border-white/10 rounded-[32px] w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden shadow-2xl relative">
                            <button
                                onClick={() => setShowTerms(false)}
                                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-xl z-20"
                            >✕</button>

                            <div className="flex p-2 bg-black/20 m-6 rounded-2xl">
                                <button
                                    onClick={() => setTermsTab("terms")}
                                    className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${termsTab === "terms" ? "bg-primary text-black" : "text-navy-400"}`}
                                >Terms of Partnership</button>
                                <button
                                    onClick={() => setTermsTab("privacy")}
                                    className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${termsTab === "privacy" ? "bg-primary text-black" : "text-navy-400"}`}
                                >Creator Privacy</button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-10 pb-10 space-y-6 text-sm text-navy-300 leading-relaxed custom-scrollbar">
                                {termsTab === "terms" ? (
                                    <>
                                        <h2 className="text-xl font-bold text-white">Partnership Agreement</h2>
                                        <p>1. <b>Commission Structure</b>: Creators earn based on active participation of users joined via their referral handle. Commission rates are subject to performance tiers.</p>
                                        <p>2. <b>Content Standards</b>: All promotion of IQ Earners must be ethical and not include misleading "overnight wealth" claims.</p>
                                        <p>3. <b>Payouts</b>: Minimum withdrawal is ₹2,500. Processing time is 2-7 business days via verified UPI ID.</p>
                                        <p>4. <b>Termination</b>: IQ Earners reserves the right to suspend accounts found engaging in bot referrals or fraudulent activity.</p>
                                    </>
                                ) : (
                                    <>
                                        <h2 className="text-xl font-bold text-white">Privacy for Creators</h2>
                                        <p>1. <b>Data Collection</b>: We collect your handle, follower count, and identity documents (if partner) solely for verification and tax compliance.</p>
                                        <p>2. <b>Publicity</b>: We may showcase your handle in our "Trending Partners" section to boost your visibility within the app.</p>
                                        <p>3. <b>Security</b>: Your CV and identity details are encrypted and only accessible by authorized IQ admin staff.</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
        .glass-morphism {
          background: rgba(17, 24, 39, 0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
        </main>
    )
}

