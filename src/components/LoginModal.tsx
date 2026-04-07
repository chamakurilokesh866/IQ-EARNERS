"use client"

import { useState, useEffect, useRef } from "react"
import { getBootstrapUrl } from "@/lib/bootstrapFetch"
import { useModalA11y } from "@/hooks/useModalA11y"
import { clearBlockedCookies } from "@/lib/clearUserData"
import { useToast } from "@/context/ToastContext"
import dynamic from "next/dynamic"
import TurnstileWidget, { type TurnstileWidgetRef } from "./TurnstileWidget"
const UnblockUploadForm = dynamic(() => import("./UnblockUploadForm"), { ssr: false })
const UnblockCongrats = dynamic(() => import("./UnblockCongrats"), { ssr: false })
import { LockIcon, KeyIcon, RocketIcon, ShieldAlertIcon, RefreshIcon, LightbulbIcon, XIcon } from "./AnimatedIcons"

type Step = "username" | "password" | "otp" | "blocked" | "forgot"
type ForgotStep = "username" | "otp" | "newpassword"
type RedirectTarget = "admin" | "user"

const REDIRECT_DELAY_MS = 400
const BOOTSTRAP_PREFETCH_MS = 600

/* ── Password strength helper ── */
function getStrength(pw: string): { label: string; cls: string; pct: number } {
  if (!pw) return { label: "", cls: "", pct: 0 }
  let score = 0
  if (pw.length >= 6) score++
  if (/[A-Z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[._\-@!?#$%&*]/.test(pw)) score++
  if (pw.length >= 10) score++
  if (score <= 1) return { label: "Weak", cls: "password-strength-weak", pct: 25 }
  if (score <= 2) return { label: "Fair", cls: "password-strength-fair", pct: 50 }
  if (score <= 3) return { label: "Good", cls: "password-strength-good", pct: 75 }
  return { label: "Strong", cls: "password-strength-strong", pct: 100 }
}

export default function LoginModal({ onClose, initialUsername }: { onClose?: () => void; initialUsername?: string }) {
  const handleClose = onClose ?? (() => { })
  const contentRef = useModalA11y(true, handleClose)
  const { showToast } = useToast()
  const [username, setUsername] = useState(initialUsername ?? "")
  const [password, setPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [step, setStep] = useState<Step>("username")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [redirectPhase, setRedirectPhase] = useState<"loading" | "redirect">("loading")
  const [redirectTarget, setRedirectTarget] = useState<RedirectTarget>("user")
  const [redirectTo, setRedirectTo] = useState<string>("/home")

  useEffect(() => {
    // Priority 1: URL param
    // Priority 2: Session Storage (from Create Username Success)
    const urlUsername = new URLSearchParams(window.location.search).get("username")
    const storedUsername = sessionStorage.getItem("login_username")

    if (urlUsername) {
      setUsername(urlUsername)
    } else if (storedUsername) {
      setUsername(storedUsername)
      // Only consume once if it was from a redirect
      if (sessionStorage.getItem("just_created_username")) {
        sessionStorage.removeItem("just_created_username")
        sessionStorage.removeItem("login_username")
      }
    }
  }, [])
  const [blockedReason, setBlockedReason] = useState("")
  const [blockedUsername, setBlockedUsername] = useState("")
  const [blockedPayStep, setBlockedPayStep] = useState<"main" | "scanner" | "upload" | "awaiting" | "unblocking" | "congrats">("main")
  const [unblockPaymentId, setUnblockPaymentId] = useState<string | null>(null)
  const [unblockAmount, setUnblockAmount] = useState(50)
  const [unblockQrUrl, setUnblockQrUrl] = useState("")
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [forgotStep, setForgotStep] = useState<ForgotStep>("username")
  const [forgotUseEmail, setForgotUseEmail] = useState(true)
  const [forgotUsername, setForgotUsername] = useState("")
  const [forgotUsernameHint, setForgotUsernameHint] = useState("")
  const [forgotOtpInput, setForgotOtpInput] = useState("")
  const [resetToken, setResetToken] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [forgotSuccess, setForgotSuccess] = useState(false)
  const turnstileRef = useRef<TurnstileWidgetRef>(null)
  const forgotTurnstileRef = useRef<TurnstileWidgetRef>(null)
  useEffect(() => {
    if (initialUsername) setUsername(initialUsername)
  }, [initialUsername])

  useEffect(() => {
    if (step === "blocked" || blockedPayStep !== "main") {
      fetch("/api/settings", { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => {
          const d = j?.data ?? {}
          setUnblockAmount(Math.max(1, Number(d.blockedAmount ?? 50)))
          setUnblockQrUrl(d.blockedQrUrl ?? "")
        })
        .catch(() => showToast("Could not load unblock settings"))
    }
  }, [step, blockedPayStep, showToast])

  useEffect(() => {
    if (step !== "blocked" || blockedPayStep !== "awaiting" || !unblockPaymentId) return
    const poll = async () => {
      const r = await fetch(`/api/payments/status?id=${unblockPaymentId}`, { cache: "no-store" })
      const j = await r.json().catch(() => ({}))
      if (j?.status === "success") setBlockedPayStep("unblocking")
    }
    const t = setInterval(poll, 1500)
    poll()
    return () => clearInterval(t)
  }, [step, blockedPayStep, unblockPaymentId])

  useEffect(() => {
    if (step !== "blocked" || blockedPayStep !== "unblocking" || !blockedUsername) return
    const pollBlocked = async () => {
      const r = await fetch(`/api/auth/blocked-status?username=${encodeURIComponent(blockedUsername)}`, { cache: "no-store" })
      const j = await r.json().catch(() => ({}))
      if (j?.ok && !j?.blocked) setBlockedPayStep("congrats")
    }
    const t = setInterval(pollBlocked, 400)
    pollBlocked()
    return () => clearInterval(t)
  }, [step, blockedPayStep, blockedUsername])

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return
    const turnstileToken = turnstileRef.current?.getToken() ?? null
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Please complete the verification below.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password: password.trim(), turnstileToken: turnstileToken ?? undefined }),
        credentials: "include"
      })
      const json = await res.json().catch(() => ({}))
      if (res.status === 403 || json.blocked === true || json.blockKey === "B") {
        setError(null)
        setLoading(false)
        setStep("blocked")
        setBlockedReason(json.reason || "Your account has been blocked.")
        setBlockedUsername(json.username || username.trim())
        try { window.dispatchEvent(new CustomEvent("blocked-cookie-set")) } catch { }
        return
      }
      if (!json.ok) throw new Error(json?.error ?? "Login failed")
      if (json.needsPassword) {
        setStep("password")
        setPassword("")
        return
      }
      if (json.step === "otp") {
        setStep("otp")
        setOtp("")
        setLoading(false)
        return
      }
      if (json.redirectTo) {
        setRedirectTarget(json.redirectTo.includes("/a/") ? "admin" : "user")
        setRedirectTo(json.redirectTo)
        setRedirectPhase("loading")
        setRedirecting(true)
        setError(null)
        return
      }
      if (json.data) {
        // Sync 'paid' status to localStorage for immediate PaidGate recognition
        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem("paid", "1")
            // Also ensure the session-ready cookie is present
            document.cookie = "hs=1; path=/; max-age=31536000"
          }
        } catch { }

        // Fire event to refresh BootstrapContext so PaidGate sees the new 'paid' status
        try { window.dispatchEvent(new CustomEvent("bootstrap-invalidate")) } catch { }

        setRedirectTarget("user")
        setRedirectTo("/home")
        setRedirectPhase("loading")
        setRedirecting(true)
        setError(null)
      } else {
        throw new Error("Login failed")
      }
    } catch (e: any) {
      setError(e.message ?? "Login failed")
      turnstileRef.current?.reset()
    } finally {
      setLoading(false)
    }
  }

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return
    const turnstileToken = turnstileRef.current?.getToken() ?? null
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Please complete the verification below.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password: password.trim(), turnstileToken: turnstileToken ?? undefined }),
        credentials: "include"
      })
      const text = await res.text()
      const json = text ? (() => { try { return JSON.parse(text) } catch { return {} } })() : {}
      if (!res.ok && !json?.error) throw new Error("Server error. Please try again.")
      if (!json.ok) throw new Error(json?.error ?? "Invalid password")
      if (json.step === "otp") {
        setStep("otp")
        setOtp("")
      }
    } catch (e: any) {
      setError(e.message ?? "Invalid password")
      turnstileRef.current?.reset()
    } finally {
      setLoading(false)
    }
  }

  const submitOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = otp.replace(/\D/g, "").slice(0, 4)
    if (code.length !== 4) {
      setError("Enter 4 digits")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        credentials: "include"
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json?.error ?? "Invalid code")
      if (json.redirectTo) {
        // Fire event to refresh BootstrapContext
        try { window.dispatchEvent(new CustomEvent("bootstrap-invalidate")) } catch { }

        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem("paid", "1")
            document.cookie = `paid=1; path=/`
          }
        } catch { }
        setRedirectTarget("admin")
        setRedirectTo(json.redirectTo)
        setRedirectPhase("loading")
        setRedirecting(true)
        setError(null)
      }
    } catch (e: any) {
      setError(e.message ?? "Invalid code")
    } finally {
      setLoading(false)
    }
  }

  const goBack = () => {
    if (step === "forgot") {
      if (forgotStep === "otp") {
        setForgotStep("username")
        setForgotOtpInput("")
        setForgotUsernameHint("")
      } else if (forgotStep === "newpassword") {
        setForgotStep("otp")
        setResetToken(null)
        setNewPassword("")
        setConfirmNewPassword("")
      } else {
        setStep("username")
        setForgotStep("username")
        setForgotUsername("")
        setForgotUsernameHint("")
        setForgotOtpInput("")
        setResetToken(null)
        setForgotSuccess(false)
      }
      setError(null)
    } else if (step === "password") {
      setStep("username")
      setPassword("")
      setError(null)
    } else if (step === "otp") {
      setStep("password")
      setOtp("")
      setError(null)
    } else if (step === "blocked") {
      if (blockedPayStep === "upload") {
        setBlockedPayStep("scanner")
        setUploadError(null)
      } else if (blockedPayStep === "scanner" || blockedPayStep === "awaiting" || blockedPayStep === "unblocking" || blockedPayStep === "congrats") {
        setBlockedPayStep("main")
        if (blockedPayStep === "congrats") setUnblockPaymentId(null)
      } else {
        setStep("username")
        setBlockedReason("")
        setBlockedUsername("")
      }
    }
  }


  const submitForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotUsername.trim()) return
    const turnstileToken = forgotTurnstileRef.current?.getToken() ?? null
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Please complete the verification below.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const body = forgotUseEmail
        ? { email: forgotUsername.trim(), turnstileToken: turnstileToken ?? undefined }
        : { username: forgotUsername.trim(), turnstileToken: turnstileToken ?? undefined }
      const res = await fetch("/api/forgot-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include"
      })
      const j = await res.json().catch(() => ({}))
      if (!j?.ok) throw new Error(j?.error ?? "Failed to send code")
      setForgotUsernameHint(j.usernameHint ?? "")
      setForgotOtpInput("")
      setForgotStep("otp")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed")
      forgotTurnstileRef.current?.reset()
    } finally {
      setLoading(false)
    }
  }

  const submitForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotOtpInput.trim()) return
    setLoading(true)
    setError(null)
    try {
      const body = forgotUseEmail ? { email: forgotUsername.trim(), otp: forgotOtpInput.trim() } : { username: forgotUsername.trim(), otp: forgotOtpInput.trim() }
      const res = await fetch("/api/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include"
      })
      const j = await res.json().catch(() => ({}))
      if (!j?.ok) throw new Error(j?.error ?? "Invalid or expired code")
      setResetToken(j.resetToken ?? null)
      setForgotStep("newpassword")
      setNewPassword("")
      setConfirmNewPassword("")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Invalid or expired code")
    } finally {
      setLoading(false)
    }
  }

  const submitNewPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetToken || !newPassword || newPassword !== confirmNewPassword) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resetToken,
          newPassword,
          confirmPassword: confirmNewPassword
        }),
        credentials: "include"
      })
      const j = await res.json().catch(() => ({}))
      if (!j?.ok) throw new Error(j?.error ?? "Failed to reset password")
      setForgotSuccess(true)
      setResetToken(null)
      setNewPassword("")
      setConfirmNewPassword("")
      setTimeout(() => {
        setStep("username")
        setForgotStep("username")
        setForgotUsername("")
        setForgotUsernameHint("")
        setForgotSuccess(false)
        setError(null)
      }, 2500)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to reset password")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!redirecting) return
    let settled = false
    let redirectTimer: ReturnType<typeof setTimeout> | null = null
    const controller = new AbortController()
    const finish = () => {
      if (settled) return
      settled = true
      setRedirectPhase("redirect")
      redirectTimer = setTimeout(() => window.location.replace(redirectTo), REDIRECT_DELAY_MS)
    }
    fetch(getBootstrapUrl(), { cache: "no-store", credentials: "include", signal: controller.signal })
      .then(() => finish())
      .catch(() => finish())
    const timeout = setTimeout(() => {
      controller.abort()
      finish()
    }, BOOTSTRAP_PREFETCH_MS)
    return () => {
      settled = true
      controller.abort()
      clearTimeout(timeout)
      if (redirectTimer) clearTimeout(redirectTimer)
    }
  }, [redirecting, redirectTo])

  /* ══════════════════════ RENDER HELPERS ══════════════════════ */
  const ErrorMsg = ({ msg }: { msg: string | null }) => {
    if (!msg) return null
    return (
      <div className={`modal-error ${step === "otp" ? "text-red-700 bg-red-100 border-red-200" : ""}`}>
        <span className="modal-error-icon">!</span>
        <span>{msg}</span>
      </div>
    )
  }

  const stepLabels: Record<string, string> = {
    username: "Enter your credentials to access your account",
    password: "Enter your admin password",
    otp: "Enter 4-digit OTP to access admin dashboard",
    blocked: "Account blocked",
    forgot: "Reset your password"
  }

  const stepIcons: Record<string, React.ReactNode> = {
    username: <LockIcon size={20} />,
    password: <KeyIcon size={20} />,
    otp: <RefreshIcon size={20} />,
    blocked: <ShieldAlertIcon size={20} className="text-red-400" />,
    forgot: <RefreshIcon size={20} className="text-purple-400" />
  }

  const loadingLabel = step === "username" ? "Verifying" : step === "password" ? "Verifying password" : step === "otp" ? "Verifying code" : step === "forgot" ? "Please wait…" : "Logging in"
  const isAdminTarget = redirectTarget === "admin"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center blur-overlay overflow-y-auto p-3 sm:p-4" onClick={handleClose} role="dialog" aria-modal="true" aria-labelledby="login-modal-title">
      <div className="modal-particle-bg" />

      <div ref={contentRef} className="w-full max-w-sm min-w-0 relative z-10" onClick={(e) => e.stopPropagation()}>
        <div className={`relative transition-all duration-500 overflow-hidden rounded-2xl border border-white/10 bg-navy-950/95 backdrop-blur-2xl shadow-2xl p-6 sm:p-8 ${step === "forgot" ? "bg-indigo-950/40" : ""}`}>

          {/* Main Content Area */}
          <div className={`transition-all duration-300 ${(loading || redirecting) ? "opacity-0 scale-95 blur-sm pointer-events-none" : "opacity-100 scale-100 blur-0"}`}>
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="flex items-center gap-4">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 ${step === "forgot" ? "bg-indigo-500/10 text-indigo-400" : "bg-primary/10 text-primary"}`}>
                  {stepIcons[step] ?? "🔐"}
                </span>
                <div>
                  <div id="login-modal-title" className="text-xl font-bold text-white tracking-tight">
                    {step === "blocked" ? "Account Hold" : step === "forgot" ? "Account Recovery" : "Sign In"}
                  </div>
                  <div className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5 font-bold">Identity Verification</div>
                </div>
              </div>
              <button className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors" onClick={handleClose} title="Close">
                <XIcon size={18} />
              </button>
            </div>

            <div className="relative z-10">
              {step === "username" && (
                <form onSubmit={submitLogin} className="space-y-5">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="login-modal-username" className="form-ui-label-dark">Username or enrollment email</label>
                      <input id="login-modal-username" className="modal-input-enhanced text-white bg-white/5 border-white/10 focus:border-primary/50" placeholder="e.g. player_name or you@school.edu" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus />
                    </div>
                    <div>
                      <label htmlFor="login-modal-password" className="form-ui-label-dark">Password</label>
                      <input id="login-modal-password" type="password" className="modal-input-enhanced text-white bg-white/5 border-white/10 focus:border-primary/50" placeholder="Your account password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
                    </div>
                  </div>
                  <div className="min-h-[65px] flex items-center justify-center overflow-hidden border border-white/8 rounded-xl bg-white/[0.03] ring-1 ring-white/[0.04]"><TurnstileWidget ref={turnstileRef} theme="dark" size="normal" /></div>
                  <ErrorMsg msg={error} />
                  <button type="submit" className="w-full py-4 rounded-xl bg-primary hover:bg-primary/90 text-black font-bold text-sm tracking-tight shadow-lg shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-40 disabled:shadow-none" disabled={loading || !username.trim() || !password.trim()}>{loading || redirecting ? "Establishing Session..." : "Access Dashboard"}</button>
                  <button type="button" onClick={() => { setStep("forgot"); setForgotStep("username"); setForgotUsername(""); setError(null) }} className="text-xs text-white/30 hover:text-white w-full text-center py-1 transition-colors">Forgot your access credentials?</button>
                </form>
              )}

              {step === "password" && (
                <form onSubmit={submitPassword} className="space-y-4 login-cyber-step">
                  <div>
                    <label htmlFor="login-modal-admin-pw" className="form-ui-label-dark">Admin password</label>
                    <input id="login-modal-admin-pw" type="password" className="modal-input-enhanced text-white" placeholder="Enter admin password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" autoFocus />
                  </div>
                  <div className="min-h-[80px] flex items-center justify-center border border-white/8 rounded-xl bg-white/[0.03] ring-1 ring-white/[0.04]"><TurnstileWidget ref={turnstileRef} theme="dark" size="normal" /></div>
                  <ErrorMsg msg={error} />
                  <div className="flex gap-2">
                    <button type="button" onClick={goBack} className="modal-btn-secondary px-4">←</button>
                    <button type="submit" className="modal-btn-primary flex-1" disabled={loading || !password.trim()}>Continue</button>
                  </div>
                </form>
              )}

              {step === "blocked" && (
                <div key="blocked" className="space-y-4 login-cyber-step">
                  {blockedPayStep === "congrats" ? (
                    <UnblockCongrats username={blockedUsername} onContinue={() => { clearBlockedCookies(); setStep("username"); setBlockedPayStep("main") }} />
                  ) : blockedPayStep === "unblocking" ? (
                    <div className="p-6 text-center animate-pulse"><div className="text-emerald-400 font-bold">Resyncing Identity...</div></div>
                  ) : blockedPayStep === "awaiting" ? (
                    <div className="p-6 text-center"><div className="animate-spin text-2xl mb-2">⌛</div><div className="text-sm text-white/70">Awaiting Admin...</div><button type="button" className="mt-4 text-xs text-white/40" onClick={goBack}>Cancel Polling</button></div>
                  ) : blockedPayStep === "upload" ? (
                    <UnblockUploadForm username={blockedUsername} amount={unblockAmount} qrUrl={unblockQrUrl || undefined} onSuccess={(id) => { setUnblockPaymentId(id); setBlockedPayStep("awaiting") }} onError={(m) => setUploadError(m)} />
                  ) : blockedPayStep === "scanner" ? (
                    <div className="space-y-4">
                      <div className="relative mx-auto w-40 h-40 rounded-lg overflow-hidden border border-white/20">{unblockQrUrl ? <img src={unblockQrUrl} className="w-full h-full p-2" alt="QR" /> : <div className="p-8 text-xs opacity-30">QR Offline</div>}</div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setBlockedPayStep("upload")} className="flex-1 modal-btn-primary py-2 text-sm">Paid</button>
                        <button type="button" onClick={goBack} className="flex-1 modal-btn-secondary py-2 text-sm">Back</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs leading-relaxed text-red-200">{blockedReason}</div>
                      <button type="button" onClick={() => setBlockedPayStep("scanner")} className="modal-btn-primary">Pay ₹{unblockAmount} to Unblock</button>
                      <button type="button" className="text-xs text-white/30 w-full text-center" onClick={goBack}>Return to Home</button>
                    </div>
                  )}
                </div>
              )}

              {step === "forgot" && (
                <div className="forgot-neural-step space-y-4">
                  {forgotSuccess ? (
                    <div className="p-8 text-center animate-pop"><div className="text-3xl mb-2">✨</div><div className="text-emerald-400 font-bold">Access Restored</div></div>
                  ) : forgotStep === "username" ? (
                    <form onSubmit={submitForgotRequest} className="space-y-4">
                      <div>
                        <label htmlFor="login-forgot-identity" className="form-ui-label-dark text-indigo-200/70">{forgotUseEmail ? "Account email" : "Username"}</label>
                        <input id="login-forgot-identity" type={forgotUseEmail ? "email" : "text"} className="modal-input-enhanced modal-input-neural" placeholder={forgotUseEmail ? "you@example.com" : "Your username"} value={forgotUsername} onChange={(e) => setForgotUsername(e.target.value)} autoComplete={forgotUseEmail ? "email" : "username"} autoFocus />
                      </div>
                      <div className="flex justify-center border border-white/8 rounded-xl bg-white/[0.03] py-2 ring-1 ring-white/[0.04]"><TurnstileWidget ref={forgotTurnstileRef} theme="dark" size="normal" /></div>
                      <ErrorMsg msg={error} />
                      <div className="flex gap-2">
                        <button type="button" onClick={goBack} className="modal-btn-secondary px-4">←</button>
                        <button type="submit" disabled={loading} className="modal-btn-neural flex-1">Recover</button>
                      </div>
                    </form>
                  ) : forgotStep === "otp" ? (
                    <form onSubmit={submitForgotOtp} className="space-y-6">
                      <div className="paper-slip-lite bg-white/10 p-4 rounded-xl border border-white/10">
                        <p className="text-[10px] uppercase font-bold text-white/40 mb-3 text-center tracking-widest">Type your recovery code</p>
                        <input
                          type="text"
                          className="w-full text-center text-3xl font-mono font-bold bg-transparent border-b-2 border-white/20 focus:border-white outline-none py-3 transition-colors text-white"
                          placeholder="CODE"
                          value={forgotOtpInput}
                          onChange={(e) => setForgotOtpInput(e.target.value.toUpperCase())}
                          maxLength={11}
                          autoFocus
                        />
                      </div>
                      <ErrorMsg msg={error} />
                      <div className="flex gap-2">
                        <button type="button" onClick={goBack} className="modal-btn-secondary px-4">←</button>
                        <button type="submit" disabled={loading} className="modal-btn-neural flex-1">Verify Slip</button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={submitNewPassword} className="space-y-4">
                      <div>
                        <label htmlFor="login-new-pw" className="form-ui-label-dark text-indigo-200/70">New password</label>
                        <input id="login-new-pw" type="password" className="modal-input-enhanced modal-input-neural" placeholder="At least 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" autoFocus />
                      </div>
                      <div>
                        <label htmlFor="login-confirm-pw" className="form-ui-label-dark text-indigo-200/70">Confirm password</label>
                        <input id="login-confirm-pw" type="password" className="modal-input-enhanced modal-input-neural" placeholder="Re-enter new password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} autoComplete="new-password" />
                      </div>
                      <ErrorMsg msg={error} />
                      <div className="flex gap-2">
                        <button type="button" onClick={goBack} className="modal-btn-secondary px-4">←</button>
                        <button type="submit" disabled={loading || newPassword !== confirmNewPassword} className="modal-btn-neural flex-1">Reset</button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>

          {(loading || redirecting) && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
              <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
              <div className="text-center px-8">
                <div className="text-white font-bold text-lg mb-1">{redirecting ? "Verified" : "Syncing"}</div>
                <div className="text-[10px] text-primary uppercase tracking-[0.2em]">{loadingLabel}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* OTP SLIP MODAL (Separate) */}
      {step === "otp" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="paper-slip w-full max-w-sm animate-pop text-black" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setStep("password")}
              className="absolute top-6 right-6 text-black/20 hover:text-black transition-colors"
            >
              <XIcon size={20} />
            </button>

            <div className="text-center mb-8">
              <h4 className="text-2xl font-black tracking-tighter mb-1 uppercase">Identity Check</h4>
              <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-black/30">Auth Verification Slip</p>
            </div>

            <form onSubmit={submitOtp} className="space-y-8">
              <div className="relative">
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  className="w-full text-center text-5xl tracking-[0.4em] font-mono font-bold bg-transparent border-b-4 border-black/10 focus:border-black outline-none py-4 transition-colors"
                  placeholder="0000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  autoFocus
                />
              </div>

              <ErrorMsg msg={error} />

              <div className="pt-6 border-t border-black/5 text-center">
                <p className="text-[10px] uppercase font-bold text-black/40 mb-6 leading-relaxed tracking-wider">A synchronization code is required for elevated access.</p>
                <button
                  type="submit"
                  className="w-full py-4 rounded-lg bg-black text-white font-bold uppercase tracking-widest text-xs hover:bg-black/90 transition-all active:scale-[0.98]"
                  disabled={loading || otp.length !== 4}
                >
                  {loading ? "Verifying..." : "Validate Presence"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
