"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import UsernameSetForm from "@/components/UsernameSetForm"
import { fetchWithCsrf } from "@/lib/fetchWithCsrf"
import MoneyTransferAnimation from "@/components/MoneyTransferAnimation"
import PaymentFailedAnimation from "@/components/PaymentFailedAnimation"

export default function PaymentCallbackPage() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "username" | "failed">("loading")
  const [tournamentId, setTournamentId] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)

  useEffect(() => {
    // This trick masks the history:
    // When we arrive from Cashfree, the history is: [Intro] -> [Cashfree] -> [Callback]
    // We replace the [Callback] entry with [Intro] and then push [Callback] again.
    // If user hits back, they land on [Intro], effectively skipping Cashfree.
    if (typeof window !== "undefined" && !window.location.search.includes("redirected=1")) {
      const currentUrl = new URL(window.location.href)
      currentUrl.searchParams.set("redirected", "1")
      window.history.replaceState(null, "", "/intro")
      window.history.pushState(null, "", currentUrl.toString())
    }

    const handlePopState = () => {
      window.location.replace("/intro")
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  useEffect(() => {
    if (status !== "failed") return
    const t = setTimeout(() => window.location.replace("/intro"), 3000)
    return () => clearTimeout(t)
  }, [status])

  useEffect(() => {
    // Support multiple param names (Cashfree / mobile may use different keys)
    const qs = typeof window !== "undefined" ? window.location.search : ""
    const fromWindow = qs ? new URLSearchParams(qs) : null
    const orderId =
      searchParams.get("order_id") ||
      searchParams.get("orderId") ||
      searchParams.get("cf_order_id") ||
      searchParams.get("reference_id") ||
      searchParams.get("orderid") ||
      fromWindow?.get("order_id") ||
      fromWindow?.get("orderId") ||
      ""
    const tid = searchParams.get("tournamentId") || fromWindow?.get("tournamentId") || null
    if (tid) setTournamentId(tid)
    const isPlaceholder = !orderId || orderId === "{order_id}" || orderId === "{orderId}" || orderId.startsWith("$") || orderId.length < 3
    if (isPlaceholder) {
      setStatus("failed")
      return
    }

    const checkStatus = async () => {
      try {
        // Try verify-order first so we sync from Cashfree even if not in our DB yet (helps mobile redirects)
        const verifyUrl = tid
          ? `/api/payments/cashfree/verify-order?orderId=${encodeURIComponent(orderId)}&tournamentId=${encodeURIComponent(tid)}`
          : `/api/payments/cashfree/verify-order?orderId=${encodeURIComponent(orderId)}`
        let res = await fetch(verifyUrl, { cache: "no-store", credentials: "include" })
        let data = await res.json().catch(() => ({}))
        if (!data.ok || data.status !== "success") {
          res = await fetch(`/api/payments/cashfree/status?orderId=${encodeURIComponent(orderId)}`, {
            cache: "no-store",
            credentials: "include"
          })
          data = await res.json().catch(() => ({}))
          if (!data.ok && res.status === 404) {
            res = await fetch(verifyUrl, { cache: "no-store", credentials: "include" })
            data = await res.json().catch(() => ({}))
          }
        }
        if (data?.ok && (data.status === "success" || data.paymentId)) {
          setOrderId(orderId)
          const tokenRes = await fetch("/api/payment/create-username-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ orderId })
          })
          const tokenData = await tokenRes.json().catch(() => ({}))
          if (tokenData?.ok && tokenData?.token) {
            const url = new URL("/create-username", window.location.origin)
            url.searchParams.set("token", tokenData.token)
            if (tid) url.searchParams.set("tournamentId", tid)
            window.location.replace(url.toString())
            return
          }
          // Show celebration before form
          setShowCelebration(true)
          setTimeout(() => {
            setShowCelebration(false)
            setStatus("username")
          }, 2000)
        } else {
          setStatus("failed")
        }
      } catch {
        setStatus("failed")
      }
    }

    checkStatus()
  }, [searchParams])

  const handleUsernameDone = async (username: string) => {
    if (tournamentId) {
      try {
        await fetch("/api/tournaments/enroll-after-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ tournamentId })
        })
      } catch { }
    }
    try {
      await fetchWithCsrf("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderId: orderId ?? undefined })
      })
    } catch { }
    const params = new URLSearchParams({ login: "1", username })
    window.location.replace(`/intro?${params.toString()}`)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 app-page-surface">
      <div className="glass-card purple-panel p-8 max-w-md w-full text-center relative overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 holo-grid-bg opacity-10 pointer-events-none" />

        {status === "loading" && !showCelebration && (
          <MoneyTransferAnimation message="Verifying payment and connecting to server…" />
        )}

        {/* Celebration animation on successful payment */}
        {showCelebration && (
          <div className="py-12 relative">
            {/* Confetti pieces */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="celebration-confetti-piece" />
              ))}
            </div>

            {/* Success burst */}
            <div className="relative inline-flex items-center justify-center mb-6">
              {/* Ripple rings */}
              <div className="absolute w-24 h-24 rounded-full celebration-ripple" />
              <div className="absolute w-24 h-24 rounded-full celebration-ripple" style={{ animationDelay: "0.2s" }} />
              <div className="absolute w-24 h-24 rounded-full celebration-ripple" style={{ animationDelay: "0.4s" }} />

              {/* Main check */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 border-2 border-emerald-500/50 flex items-center justify-center celebration-burst shadow-[0_0_40px_rgba(34,197,94,0.3)]">
                <span className="text-4xl">✅</span>
              </div>
            </div>

            {/* Receipt stamp */}
            <div className="celebration-receipt-stamp">
              <h2 className="text-2xl font-bold celebration-gold-shine mb-2">Payment Successful!</h2>
              <p className="text-sm text-white/60">Setting up your account…</p>
            </div>

            {/* Banner */}
            <div className="celebration-banner-slide mt-4 py-2 px-4 rounded-lg bg-emerald-500/15 border border-emerald-500/30 inline-flex items-center gap-2">
              <span>🎉</span>
              <span className="text-sm font-semibold text-emerald-400">Welcome to IQ Earners</span>
            </div>
          </div>
        )}

        {status === "username" && (
          <div className="text-left relative">
            <div className="text-center mb-4">
              <div className="inline-flex w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 items-center justify-center mb-2 bio-verify-pulse">
                <span className="text-3xl">✅</span>
              </div>
              <p className="text-sm text-white/60">Payment successful! Create your username to continue.</p>
            </div>
            <UsernameSetForm onSuccess={handleUsernameDone} paymentProof={orderId ? { orderId } : undefined} />
          </div>
        )}
        {status === "failed" && (
          <PaymentFailedAnimation />
        )}
      </div>
    </div>
  )
}
