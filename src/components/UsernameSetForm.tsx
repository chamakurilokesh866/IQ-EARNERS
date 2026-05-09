"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import CountryPicker from "./CountryPicker"
import { fetchWithCsrf } from "@/lib/fetchWithCsrf"
import { DEFAULT_COUNTRY } from "../utils/countries"
import { UserIcon, MailIcon, SparklesIcon, CheckIcon, XIcon, AlertIcon, LockIcon } from "./AnimatedIcons"
import { motion, AnimatePresence } from "framer-motion"
import ParentCompanyMark from "./ParentCompanyMark"

const USERNAME_RULES = [
  { key: "special", label: "1 special (. _ - @)", test: (s: string) => /[._\-@]/.test(s) },
  { key: "number", label: "1 number", test: (s: string) => /\d/.test(s) },
  { key: "capital", label: "1 capital letter", test: (s: string) => /[A-Z]/.test(s) },
  { key: "lowercase", label: "1 lowercase letter", test: (s: string) => /[a-z]/.test(s) },
  { key: "length", label: "6+ characters", test: (s: string) => s.length >= 6 }
]

const PASSWORD_RULES = [
  { key: "length", label: "6+ characters", test: (s: string) => s.length >= 6 },
  { key: "capital", label: "1 capital letter", test: (s: string) => /[A-Z]/.test(s) },
  { key: "number", label: "1 number", test: (s: string) => /\d/.test(s) },
  { key: "special", label: "1 special (. _ - @ ! ? # $ % & *)", test: (s: string) => /[._\-@!?#$%&*]/.test(s) }
]

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
function validEmail(s: string) {
  return typeof s === "string" && s.trim().length > 0 && EMAIL_REGEX.test(s.trim())
}

function maskEmail(e: string) {
  const t = e.trim()
  const at = t.indexOf("@")
  if (at < 1) return t
  const u = t.slice(0, at)
  const d = t.slice(at + 1)
  const head = u.slice(0, Math.min(2, u.length))
  return `${head}•••@${d}`
}

type WizardStep = "email" | "otp" | "username" | "password"

export default function UsernameSetForm({
  onSuccess,
  onSkip,
  createUsernameToken,
  tournamentId
}: {
  onSuccess?: (username: string) => void
  onSkip?: () => void
  /** Signed token from /api/payment/create-username-token (required). */
  createUsernameToken?: string
  tournamentId?: string
}) {
  const [step, setStep] = useState<WizardStep>("email")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  /** Email confirmed by OTP (payment-token flow only). */
  const [verifiedEmail, setVerifiedEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [country, setCountry] = useState(DEFAULT_COUNTRY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [otpValue, setOtpValue] = useState("")
  const [otpLength, setOtpLength] = useState(4)
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [otpRefreshSecs, setOtpRefreshSecs] = useState(0)
  const [otpSentToEmail, setOtpSentToEmail] = useState(false)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<"none" | "available" | "taken">("none")
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [emailStatus, setEmailStatus] = useState<"none" | "available" | "taken" | "invalid" | "temporary" | "invalid_domain">("none")
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const otpVerifyLock = useRef(false)

  const secureToken = createUsernameToken?.trim() ?? ""
  const validUsernameRules = USERNAME_RULES.every((r) => r.test(username))
  const validUsername = validUsernameRules && usernameStatus === "available"
  const emailOkForContinue = validEmail(email) && emailStatus === "available"
  const passwordRulesOk = PASSWORD_RULES.every((r) => r.test(password))
  const passwordsMatch = password.length > 0 && password === confirmPassword
  const validPassword = passwordRulesOk && passwordsMatch
  const submitEmail = verifiedEmail

  const stepSequence: WizardStep[] = ["email", "otp", "username", "password"]
  const stepIndex = Math.max(0, stepSequence.indexOf(step))

  const USERNAME_DEBOUNCE_MS = 70
  const EMAIL_DEBOUNCE_MS = 90

  useEffect(() => {
    const ac = new AbortController()
    const u = username.trim()
    if (u.length < 6) {
      setUsernameStatus("none")
      setCheckingUsername(false)
      return () => ac.abort()
    }

    const timer = setTimeout(async () => {
      setCheckingUsername(true)
      try {
        const res = await fetch("/api/user/check-username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: u }),
          signal: ac.signal
        })
        const j = (await res.json()) as {
          ok?: boolean
          pending?: boolean
          available?: boolean
          error?: string
          rulesPending?: boolean
        }
        if (ac.signal.aborted) return
        if (!j.ok) {
          setUsernameStatus("none")
          return
        }
        if (j.pending) {
          setUsernameStatus("none")
          return
        }
        if (j.available === false) {
          setUsernameStatus(j.error === "invalid_format" ? "none" : "taken")
          return
        }
        if (j.available === true) {
          setUsernameStatus(j.rulesPending ? "none" : "available")
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return
      } finally {
        if (!ac.signal.aborted) setCheckingUsername(false)
      }
    }, USERNAME_DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      ac.abort()
    }
  }, [username])

  useEffect(() => {
    const ac = new AbortController()
    if (!validEmail(email)) {
      setEmailStatus("none")
      setCheckingEmail(false)
      return () => ac.abort()
    }
    const raw = email.trim()

    const timer = setTimeout(async () => {
      setCheckingEmail(true)
      try {
        const res = await fetch("/api/user/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: raw }),
          signal: ac.signal
        })
        const j = (await res.json()) as {
          ok?: boolean
          available?: boolean
          error?: string
        }
        if (ac.signal.aborted) return
        if (!j.ok) {
          setEmailStatus("none")
          return
        }
        if (!j.available) {
          if (j.error === "invalid_format") setEmailStatus("invalid")
          else if (j.error === "temporary_email") setEmailStatus("temporary")
          else if (j.error === "invalid_domain") setEmailStatus("invalid_domain")
          else setEmailStatus("taken")
        } else {
          setEmailStatus("available")
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return
      } finally {
        if (!ac.signal.aborted) setCheckingEmail(false)
      }
    }, EMAIL_DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      ac.abort()
    }
  }, [email])

  const requestOtp = useCallback(async () => {
    if (!secureToken || !validEmail(email.trim())) return false
    setOtpLoading(true)
    setOtpError(null)
    setOtpValue("")
    setOtpVerified(false)
    setOtpRefreshSecs(0)
    try {
      const res = await fetch("/api/create-username/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ createUsernameToken: secureToken, email: email.trim() })
      })
      const j = await res.json().catch(() => ({}))
      if (!j?.ok) throw new Error(j?.error ?? "Failed to send OTP")
      setOtpLength(j.length ?? 4)
      setOtpSentToEmail(true)
      setOtpRefreshSecs(30)
      otpInputRefs.current = []
      return true
    } catch (e: unknown) {
      setOtpError(e instanceof Error ? e.message : "Could not send OTP")
      return false
    } finally {
      setOtpLoading(false)
    }
  }, [secureToken, email])

  useEffect(() => {
    if (!otpSentToEmail || otpVerified || otpLoading || otpRefreshSecs <= 0) return
    const t = setInterval(() => {
      setOtpRefreshSecs((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [otpSentToEmail, otpVerified, otpLoading, otpRefreshSecs])

  const verifyOtpRequest = useCallback(async () => {
    if (!secureToken || !otpValue.trim() || otpVerifyLock.current || otpVerified) return
    otpVerifyLock.current = true
    setOtpLoading(true)
    setOtpError(null)
    try {
      const res = await fetch("/api/create-username/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ createUsernameToken: secureToken, otp: otpValue })
      })
      const j = await res.json().catch(() => ({}))
      if (j?.ok) {
        setOtpVerified(true)
        setOtpError(null)
        setVerifiedEmail(email.trim())
        setTimeout(() => setStep("username"), 600)
      } else {
        setOtpVerified(false)
        setOtpError(j?.error ?? "Invalid OTP")
        setOtpValue("")
        setTimeout(() => otpInputRefs.current[0]?.focus(), 50)
      }
    } catch {
      setOtpVerified(false)
      setOtpError("Verification failed")
      setOtpValue("")
      setTimeout(() => otpInputRefs.current[0]?.focus(), 50)
    } finally {
      setOtpLoading(false)
      otpVerifyLock.current = false
    }
  }, [secureToken, otpValue, email, otpVerified])

  useEffect(() => {
    const digits = otpValue.replace(/\D/g, "")
    if (digits.length === otpLength && otpLength > 0 && !otpVerified && !otpLoading && step === "otp") {
      verifyOtpRequest()
    } else if (digits.length < otpLength) {
      if (otpVerified) setOtpVerified(false)
      setOtpError(null)
    }
  }, [otpValue, otpLength, otpVerified, otpLoading, verifyOtpRequest, step])

  const handleOtpInput = useCallback(
    (index: number, value: string) => {
      const digit = value.replace(/\D/g, "").slice(-1)
      setOtpValue((prev) => {
        const arr = prev.replace(/\D/g, "").split("")
        arr[index] = digit
        const next = arr.slice(0, otpLength).join("")
        if (digit && index < otpLength - 1) {
          setTimeout(() => otpInputRefs.current[index + 1]?.focus(), 50)
        }
        return next
      })
      setOtpError(null)
    },
    [otpLength]
  )

  const handleOtpKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !otpValue[index] && index > 0) {
        otpInputRefs.current[index - 1]?.focus()
      }
    },
    [otpValue]
  )

  const handleOtpPaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault()
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, otpLength)
      setOtpValue(pasted)
      const lastIdx = Math.min(pasted.length, otpLength) - 1
      if (lastIdx >= 0) otpInputRefs.current[lastIdx]?.focus()
    },
    [otpLength]
  )

  const goEmailFromOtp = useCallback(() => {
    setStep("email")
    setOtpValue("")
    setOtpSentToEmail(false)
    setOtpVerified(false)
    setOtpError(null)
    setVerifiedEmail("")
  }, [])

  const handleEmailContinue = useCallback(async () => {
    if (!emailOkForContinue || checkingEmail) return
    setError(null)
    const ok = await requestOtp()
    if (ok) setStep("otp")
  }, [emailOkForContinue, checkingEmail, requestOtp])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step !== "password") return
    if (!validUsername || !validPassword || !agreed || username.length > 20) return
    if (!otpVerified || !verifiedEmail) {
      setError("Please complete email verification first.")
      return
    }
    if (!submitEmail) {
      setError("Email is required.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetchWithCsrf("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: username.trim(),
          country,
          email: submitEmail,
          password,
          createUsernameToken: secureToken,
          ...(tournamentId ? { tournamentId } : {})
        })
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (j?.error === "username_taken") {
          setUsernameStatus("taken")
          throw new Error("Username already taken")
        }
        throw new Error(j?.error || "Failed to save")
      }
      if (typeof window !== "undefined") {
        document.cookie = `username=${encodeURIComponent(username.trim())}; path=/; max-age=31536000`
      }
      onSuccess?.(username.trim())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed")
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    "w-full rounded-2xl border bg-white/[0.04] px-4 py-3.5 sm:py-4 pl-12 text-base sm:text-lg text-white placeholder:text-white/35 outline-none transition-all focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-500/20"
  const inputBorder = (ok: boolean, bad: boolean) =>
    ok ? "border-emerald-500/40" : bad ? "border-red-500/45" : "border-white/12"

  if (!secureToken) {
    return (
      <div className="relative w-full max-w-xl mx-auto px-4 py-10 rounded-2xl border border-red-500/30 bg-red-500/10 text-center">
        <p className="text-red-200 font-semibold">Invalid or missing payment session</p>
        <p className="text-sm text-white/50 mt-2">Complete payment and use the link from the confirmation screen, or ask support if you already paid.</p>
      </div>
    )
  }

  return (
    <div className="relative w-full max-w-xl mx-auto px-1 sm:px-0">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-black/90 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset] overflow-hidden">
        <div className="px-5 sm:px-8 pt-6 sm:pt-8 pb-2">
          <div className="flex items-center gap-3 sm:gap-4 mb-6">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-primary/20 border border-cyan-500/25 flex items-center justify-center shrink-0">
              <UserIcon size={26} className="text-cyan-300" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">Create your account</h3>
              <p className="text-[10px] sm:text-xs font-bold text-cyan-400/70 flex flex-wrap items-center gap-x-1.5">
                <span className="uppercase tracking-[0.2em]">Secure enrollment · IQ Earners ·</span>
                <ParentCompanyMark className="text-[10px] sm:text-xs !normal-case" />
              </p>
            </div>
          </div>

          <div className="flex gap-1.5 sm:gap-2 mb-8">
            {stepSequence.map((s, i) => {
              const active = i === stepIndex
              const done = i < stepIndex
              return (
                <div key={s} className="flex-1 min-w-0">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      done ? "bg-cyan-400" : active ? "bg-cyan-400/90" : "bg-white/10"
                    }`}
                  />
                  <p className={`mt-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider truncate ${active ? "text-cyan-300" : "text-white/35"}`}>
                    {s === "email" && "Email"}
                    {s === "otp" && "OTP"}
                    {s === "username" && "Username"}
                    {s === "password" && "Password"}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-5 sm:px-8 pb-6 sm:pb-8">
          <AnimatePresence mode="wait">
            {step === "email" && (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <p className="text-sm text-white/55 leading-relaxed">
                  Enter the email you want on your account. We will send a one-time code to verify it.
                </p>
                <div className="relative">
                  <MailIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setError(null)
                    }}
                    className={`${inputClass} ${inputBorder(
                      emailStatus === "available",
                      ["taken", "invalid", "temporary", "invalid_domain"].includes(emailStatus)
                    )}`}
                    autoComplete="email"
                    autoCapitalize="off"
                  />
                  {checkingEmail && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin" />
                  )}
                </div>
                {emailStatus === "taken" && (
                  <p className="text-xs text-red-400 font-medium">Already used — sign in or use another email.</p>
                )}
                {emailStatus === "temporary" && <p className="text-xs text-red-400 font-medium">Disposable emails are not allowed.</p>}
                {emailStatus === "invalid_domain" && <p className="text-xs text-red-400 font-medium">This email domain is not allowed.</p>}

                <button
                  type="button"
                  onClick={handleEmailContinue}
                  disabled={!emailOkForContinue || checkingEmail || otpLoading}
                  className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-gradient-to-r from-cyan-500 to-primary text-black disabled:opacity-35 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.99] transition-all shadow-lg shadow-cyan-500/15"
                >
                  {otpLoading ? "Sending code…" : "Send verification code"}
                </button>
                {otpError && step === "email" && <p className="text-xs text-red-400 text-center">{otpError}</p>}
              </motion.div>
            )}

            {step === "otp" && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div>
                  <p className="text-sm text-white/60 mb-1">Enter the code we sent to</p>
                  <p className="text-base font-bold text-cyan-300 break-all">{maskEmail(email)}</p>
                </div>

                <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                  {Array.from({ length: otpLength }).map((_, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        otpInputRefs.current[i] = el
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={otpValue[i] ?? ""}
                      onChange={(e) => handleOtpInput(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={handleOtpPaste}
                      className={`w-11 h-14 sm:w-14 sm:h-16 text-center text-2xl sm:text-3xl font-mono font-black rounded-xl border-2 bg-black/40 text-white outline-none transition-all ${
                        otpVerified
                          ? "border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.25)]"
                          : otpError
                            ? "border-red-400"
                            : "border-white/15 focus:border-cyan-400"
                      }`}
                    />
                  ))}
                </div>

                {otpLoading && <p className="text-center text-xs text-white/50">Verifying…</p>}
                {otpVerified && (
                  <motion.p
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center text-sm font-bold text-emerald-400"
                  >
                    Email verified — choose your username next
                  </motion.p>
                )}
                {otpError && !otpVerified && <p className="text-center text-sm text-red-400 font-medium">{otpError}</p>}

                <p className="text-[10px] text-center text-white/38 leading-relaxed">
                  Didn&apos;t get the email? Check spam, then resend the code below.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    type="button"
                    onClick={goEmailFromOtp}
                    className="flex-1 py-2 rounded-xl border border-white/15 text-white/80 text-xs font-bold hover:bg-white/5"
                  >
                    Change email
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (otpRefreshSecs <= 0) void requestOtp()
                    }}
                    disabled={otpLoading || otpRefreshSecs > 0}
                    className="flex-1 py-2 rounded-xl border border-cyan-500/30 text-cyan-300 text-xs font-bold hover:bg-cyan-500/10 disabled:opacity-40"
                  >
                    {otpLoading ? "Sending…" : otpRefreshSecs > 0 ? `Resend in ${otpRefreshSecs}s` : "Resend code"}
                  </button>
                </div>
              </motion.div>
            )}

            {step === "username" && (
              <motion.div
                key="username"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <p className="text-sm text-white/55">
                  Pick a unique username — we check the database as you type (after 6 characters).
                </p>
                <div className="relative">
                  <UserIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="e.g. Alex_99"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value)
                      setError(null)
                    }}
                    className={`${inputClass} ${inputBorder(usernameStatus === "available", usernameStatus === "taken")}`}
                    maxLength={20}
                    autoComplete="username"
                    autoCapitalize="off"
                  />
                  {checkingUsername && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin" />
                  )}
                </div>
                {usernameStatus === "available" && validUsernameRules && (
                  <p className="text-xs font-semibold text-emerald-400 flex items-center gap-2">
                    <CheckIcon size={14} /> Username is available
                  </p>
                )}
                {usernameStatus === "taken" && (
                  <p className="text-xs font-semibold text-red-400 flex items-center gap-2">
                    <XIcon size={14} /> Already taken — choose another username.
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {USERNAME_RULES.map((r) => {
                    const ok = r.test(username)
                    return (
                      <div key={r.key} className="flex items-center gap-2">
                        <span
                          className={`inline-flex w-5 h-5 shrink-0 rounded-md items-center justify-center ${
                            ok ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/25"
                          }`}
                        >
                          {ok ? <CheckIcon size={12} /> : <XIcon size={12} />}
                        </span>
                        <span className={`text-xs font-medium ${ok ? "text-emerald-300/90" : "text-white/40"}`}>{r.label}</span>
                      </div>
                    )
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setError(null)
                    setStep("password")
                  }}
                  disabled={!validUsername || checkingUsername}
                  className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-gradient-to-r from-cyan-500 to-primary text-black disabled:opacity-35 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.99] transition-all"
                >
                  Continue to password
                </button>
              </motion.div>
            )}

            {step === "password" && (
              <motion.div
                key="password"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                  <div className="flex items-center gap-2 min-w-0">
                    <SparklesIcon size={18} className="text-cyan-300 shrink-0" />
                    <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Your username</span>
                  </div>
                  <strong className="text-cyan-200 font-mono text-sm sm:text-base truncate">@{username}</strong>
                </div>

                <div className="relative">
                  <LockIcon size={20} className="absolute left-4 top-[calc(50%-0.125rem)] -translate-y-1/2 text-white/30 pointer-events-none" />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setError(null)
                    }}
                    className={`${inputClass} border-white/12`}
                    autoComplete="new-password"
                  />
                </div>
                <div className="relative">
                  <LockIcon size={20} className="absolute left-4 top-[calc(50%-0.125rem)] -translate-y-1/2 text-white/30 pointer-events-none" />
                  <input
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      setError(null)
                    }}
                    className={`${inputClass} ${inputBorder(passwordsMatch && confirmPassword.length > 0, confirmPassword.length > 0 && !passwordsMatch)}`}
                    autoComplete="new-password"
                  />
                </div>
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-xs text-red-400 font-medium">Passwords do not match.</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PASSWORD_RULES.map((r) => {
                    const ok = r.test(password)
                    return (
                      <div key={r.key} className="flex items-center gap-2">
                        <span
                          className={`inline-flex w-5 h-5 shrink-0 rounded-md items-center justify-center ${
                            ok ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/25"
                          }`}
                        >
                          {ok ? <CheckIcon size={12} /> : <XIcon size={12} />}
                        </span>
                        <span className={`text-xs font-medium ${ok ? "text-emerald-300/90" : "text-white/40"}`}>{r.label}</span>
                      </div>
                    )
                  })}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2 border-t border-white/10">
                  <CountryPicker value={country} onChange={setCountry} size="md" />
                  <span className="text-[10px] font-bold text-white/35 uppercase tracking-widest">Country / region</span>
                </div>

                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-cyan-500/30"
                  />
                  <span className="text-xs text-white/55 leading-snug">
                    I agree to the platform terms and understand my account is for personal use.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading || !agreed || !validPassword || !validUsername}
                  className="w-full py-4 sm:py-5 rounded-2xl font-black text-sm uppercase tracking-widest bg-gradient-to-r from-emerald-500 to-cyan-500 text-black disabled:opacity-35 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.99] transition-all shadow-lg shadow-emerald-500/20"
                >
                  {loading ? "Creating account…" : "Create account"}
                </button>
              </motion.div>
            )}

          </AnimatePresence>

          {error && (
            <div
              className="mt-5 flex items-start gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-200 text-sm"
              role="alert"
            >
              <AlertIcon size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {onSkip && (
            <button type="button" onClick={onSkip} className="mt-4 w-full text-xs text-white/40 hover:text-white/60 font-medium">
              Skip for now
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
