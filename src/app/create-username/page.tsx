"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { useTransitionNavigate } from "@/hooks/useTransitionNavigate"
import UsernameSetForm from "@/components/UsernameSetForm"
import { fetchWithCsrf } from "@/lib/fetchWithCsrf"
import MoneyTransferAnimation from "@/components/MoneyTransferAnimation"
import UsernameCreatedAnimation from "@/components/UsernameCreatedAnimation"
import { useToast } from "@/context/ToastContext"
import TurnstileWidget, { type TurnstileWidgetRef } from "@/components/TurnstileWidget"

export default function CreateUsernamePage() {
  const searchParams = useSearchParams()
  const { navigate } = useTransitionNavigate()
  const { showToast } = useToast()
  const [status, setStatus] = useState<"loading" | "form" | "success" | "invalid">("loading")
  const [tournamentId, setTournamentId] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [createdUsername, setCreatedUsername] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState("")
  const [recovering, setRecovering] = useState(false)
  const [recoveryError, setRecoveryError] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileWidgetRef>(null)

  // Lock back navigation: prevent returning to create-username with token (no second username without payment)
  useEffect(() => {
    // Mask history to skip Cashfree gateway on back button
    if (typeof window !== "undefined" && !window.location.search.includes("redirected=1")) {
      const currentUrl = new URL(window.location.href)
      currentUrl.searchParams.set("redirected", "1")
      window.history.replaceState(null, "", "/intro")
      window.history.pushState(null, "", currentUrl.toString())
    }

    const handlePopState = () => {
      if (status === "form") {
        window.history.pushState(null, "", window.location.href) // trap it actively on mobile
        showToast("Please complete account creation.")
      } else {
        window.location.replace("/intro")
      }
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [status, showToast])

  useEffect(() => {
    const t = searchParams.get("token")?.trim()
    const tid = searchParams.get("tournamentId")
    const created = searchParams.get("created")
    if (tid) setTournamentId(tid)

    if (!t) {
      if (created === "1") {
        window.location.replace("/intro")
        return
      }
      setStatus("invalid")
      return
    }

    const validate = async () => {
      try {
        const res = await fetch(`/api/payment/validate-username-token?token=${encodeURIComponent(t)}`, {
          cache: "no-store",
          credentials: "include"
        })
        const data = await res.json().catch(() => ({}))
        if (data.ok) {
          setToken(t)
          if (data.orderId) setOrderId(data.orderId)
          setStatus("form")
        } else {
          setStatus("invalid")
        }
      } catch {
        setStatus("invalid")
      }
    }

    validate()
  }, [searchParams])

  const handleUsernameDone = useCallback(async (username: string) => {
    setCreatedUsername(username)
    setStatus("success")
    // Remove token from URL and history so back button cannot return to form with valid token
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/create-username?created=1")
    }
  }, [])

  const handleCopyUsername = useCallback(() => {
    if (!createdUsername) return
    navigator.clipboard?.writeText(createdUsername).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => { })
  }, [createdUsername])

  const handleGoToLogin = useCallback(() => {
    if (!createdUsername) return
    try {
      sessionStorage.setItem("login_username", createdUsername)
      sessionStorage.setItem("just_created_username", "1")
    } catch { }
    const params = new URLSearchParams({ login: "1", username: createdUsername })
    // Replace so back button never returns to create-username (prevents creating another account without payment)
    window.location.replace(`/intro?${params.toString()}`)
  }, [createdUsername])

  const handleRecover = useCallback(async () => {
    const turnstileToken = turnstileRef.current?.getToken() ?? null
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      setRecoveryError("Please complete verification first.")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail.trim())) {
      setRecoveryError("Enter a valid email.")
      return
    }
    setRecovering(true)
    setRecoveryError(null)
    try {
      const res = await fetch("/api/payment/recover-username-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: recoveryEmail.trim().toLowerCase(), turnstileToken: turnstileToken ?? undefined })
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.ok || !j?.token) {
        throw new Error(String(j?.error || "Recovery failed"))
      }
      const url = new URL("/create-username", window.location.origin)
      url.searchParams.set("token", j.token)
      window.location.replace(url.toString())
    } catch (e) {
      setRecoveryError(e instanceof Error ? e.message : "Recovery failed")
      turnstileRef.current?.reset()
    } finally {
      setRecovering(false)
    }
  }, [recoveryEmail])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 app-page-surface">
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none -z-10" />
      <div className="w-full flex justify-center">
        {(status === "loading" || status === "form") && (
          <div className="create-username-modal">
            {status === "loading" && (
              <div className="create-username-modal-inner flex flex-col items-center justify-center text-center py-8">
                <MoneyTransferAnimation message="Verifying your payment…" />
              </div>
            )}
            {status === "form" && token && (
              <div className="create-username-crossfade-enter create-username-modal-inner flex flex-col h-full">
                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-5 py-5">
                  <UsernameSetForm onSuccess={handleUsernameDone} createUsernameToken={token} tournamentId={tournamentId || undefined} />
                </div>
              </div>
            )}
          </div>
        )}
        {status === "success" && createdUsername && (
          <div className="create-username-modal">
            <div className="create-username-modal-inner flex flex-col items-center justify-center text-center py-6 px-5 create-username-crossfade-enter">
              <UsernameCreatedAnimation
                username={createdUsername}
                onCopy={handleCopyUsername}
                onGoToLogin={handleGoToLogin}
                copied={copied}
              />
            </div>
          </div>
        )}
        {status === "invalid" && (
          <div className="create-username-modal">
            <div className="create-username-modal-inner flex flex-col items-center justify-center text-center py-8 px-6">
              <div className="text-4xl mb-4 create-username-field">⛔</div>
              <h2 className="font-semibold text-lg text-primary create-username-field" style={{ animationDelay: "0.05s" }}>Invalid or expired link</h2>
              <p className="mt-2 text-sm text-white/60 create-username-field" style={{ animationDelay: "0.1s" }}>This link may have been used or expired. Complete payment again for a new link.</p>
              <button
                onClick={() => navigate("/intro")}
                className="mt-6 create-username-btn-primary py-3 px-6 rounded-xl bg-primary text-black font-semibold create-username-field"
                style={{ animationDelay: "0.2s" }}
              >
                Go to Payment
              </button>
              <div className="mt-5 w-full max-w-sm rounded-xl border border-white/10 bg-white/5 p-4 text-left">
                <p className="text-xs font-semibold text-white">Already paid but missed username setup?</p>
                <p className="mt-1 text-[11px] text-white/60">Enter the same payment email to recover your username setup link.</p>
                <input
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-3 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-primary/60"
                />
                <div className="mt-3 flex min-h-[56px] items-center justify-center overflow-x-auto overflow-y-hidden rounded-xl border border-white/[0.06] bg-[#050810] py-1">
                  <TurnstileWidget ref={turnstileRef} theme="dark" size="compact" />
                </div>
                {recoveryError && <p className="mt-2 text-[11px] text-red-300">{recoveryError}</p>}
                <button
                  type="button"
                  onClick={handleRecover}
                  disabled={recovering}
                  className="mt-3 w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
                >
                  {recovering ? "Recovering..." : "Recover username setup"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
