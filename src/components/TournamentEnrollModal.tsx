"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import TurnstileWidget, { type TurnstileWidgetRef } from "./TurnstileWidget"

function generatePaymentKey(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

export default function TournamentEnrollModal({
  tournament,
  liveDate,
  onSuccess,
  onClose
}: {
  tournament: { id: string; title?: string; fee?: number; cashfreeFormUrl?: string }
  /** Formatted date string for Live Mega (e.g. "Today 8:00 PM" or "Feb 27, 2025 at 8:00 PM") */
  liveDate?: string | null
  onSuccess?: () => void
  onClose?: () => void
}) {
  const fee = Number(tournament?.fee ?? 100)
  const cashfreeUrl = tournament?.cashfreeFormUrl?.trim()
  const [stage, setStage] = useState<"scan" | "waiting" | "redirecting" | "denied" | "cashfree">("scan")
  const [paymentKey, setPaymentKey] = useState("")
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileWidgetRef>(null)

  useEffect(() => {
    if (stage === "scan" && !paymentKey) setPaymentKey(generatePaymentKey())
  }, [stage, paymentKey])

  const pollStatus = useCallback(async (id: string) => {
    const r = await fetch(`/api/payments/status?id=${id}`, { cache: "no-store" })
    const j = await r.json().catch(() => ({}))
    return j?.status as string | undefined
  }, [])

  const requestApproval = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/tournaments/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId: tournament.id,
          manual: true,
          paymentKey: paymentKey || undefined
        }),
        credentials: "include"
      })
      const j = await res.json().catch(() => ({}))
      if (!j?.id) throw new Error(j?.error ?? "Failed to create payment request")
      setPaymentId(j.id)
      setStage("waiting")
      const poll = async () => {
        const status = await pollStatus(j.id)
        if (status === "success") {
          setStage("redirecting")
          await new Promise((r) => setTimeout(r, 800))
          onSuccess?.()
          window.location.replace("/home")
          return
        }
        if (status === "denied") {
          setStage("denied")
          return
        }
        setTimeout(poll, 3000)
      }
      poll()
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Request failed")
    } finally {
      setLoading(false)
    }
  }

  const [upiId, setUpiId] = useState("")
  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const id = j?.data?.upiId ?? j?.data?.upi_id
        if (id && typeof id === "string") setUpiId(id.trim())
      })
      .catch(() => {})
  }, [])

  const hasUpi = upiId && upiId.includes("@")
  const upiUrl = hasUpi
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent("IQ Earners")}&am=${encodeURIComponent(String(fee))}&cu=INR&tn=${encodeURIComponent(paymentKey || "IQ-" + tournament.title)}`
    : ""
  const qrSrc = upiUrl ? `/api/qr?data=${encodeURIComponent(upiUrl)}&s=220` : ""

  const payViaCashfree = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = turnstileRef.current?.getToken?.() ?? ""
      const res = await fetch("/api/payments/cashfree/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tournamentId: tournament.id, turnstileToken: token })
      })
      const j = await res.json().catch(() => ({}))
      if (!j?.ok || !j?.paymentSessionId || !j?.appId) {
        throw new Error(j?.error ?? "Failed to create payment")
      }
      setStage("cashfree")
      const loadAndOpen = () => {
        if ((window as any).cashfree?.checkout) {
          (window as any).cashfree.checkout({
            paymentSessionId: j.paymentSessionId,
            returnUrl: `${window.location.origin}/payment/callback?order_id={order_id}&tournamentId=${encodeURIComponent(tournament.id)}`
          })
          return
        }
        const s = document.createElement("script")
        s.src = "https://sdk.cashfree.com/js/v3/cashfree.js"
        s.async = true
        s.onload = () => {
          if ((window as any).cashfree?.checkout) {
            (window as any).cashfree.checkout({
              paymentSessionId: j.paymentSessionId,
              returnUrl: `${window.location.origin}/payment/callback?order_id={order_id}&tournamentId=${encodeURIComponent(tournament.id)}`
            })
          }
        }
        document.body.appendChild(s)
      }
      loadAndOpen()
      onSuccess?.()
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Payment failed")
    } finally {
      setLoading(false)
    }
  }

  if (stage === "redirecting") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center blur-overlay">
        <div className="w-full max-w-md p-6 text-center">
          <div className="inline-flex h-14 w-14 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
          <div className="font-semibold text-lg">Enrolling…</div>
        </div>
      </div>
    )
  }

  if (stage === "denied") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center blur-overlay" onClick={onClose}>
        <div className="w-full max-w-md p-2" onClick={(e) => e.stopPropagation()}>
          <div className="glass-card purple-panel p-6 animate-pop text-center">
            <div className="text-xl mb-2">❌</div>
            <div className="font-semibold">Payment was not approved</div>
            <p className="mt-2 text-sm text-navy-400">Please try again.</p>
            <button type="button" className="mt-4 pill bg-primary w-full py-3" onClick={() => { setStage("scan"); setPaymentKey(generatePaymentKey()); setError(null) }}>Try again</button>
            <button type="button" className="mt-2 pill bg-navy-700 w-full py-2" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    )
  }

  if (stage === "waiting") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center blur-overlay">
        <div className="w-full max-w-md p-2 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="glass-card purple-panel p-8 animate-pop">
            <div className="inline-flex h-14 w-14 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
            <div className="font-semibold text-lg">Please wait for admin approval</div>
          </div>
        </div>
      </div>
    )
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
  const cashfreeLink = cashfreeUrl ? (cashfreeUrl.startsWith("http") ? cashfreeUrl : `https://${cashfreeUrl.replace(/^\/+/, "")}`) : ""

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center blur-overlay p-4" onClick={onClose}>
      <div className="w-full max-w-md p-2" onClick={(e) => e.stopPropagation()}>
        <div className="glass-card purple-panel p-6 animate-pop">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-bold">Join: {tournament.title ?? tournament.id}</div>
            <button className="pill bg-navy-700" onClick={onClose}>✖</button>
          </div>
          {liveDate && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
              📅 Live at {liveDate}
            </div>
          )}
          <p className="text-navy-300 text-sm mb-4">Pay per tournament to participate. Sign in required. Fee varies by tournament.</p>
          <div className="text-center mb-2">
            <div className="text-2xl font-bold text-accent">₹{fee}</div>
          </div>
          <div className="space-y-3 mb-4">
            <TurnstileWidget ref={turnstileRef} size="compact" />
            <button
              type="button"
              onClick={payViaCashfree}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              style={{ background: "#872484", border: "1px solid rgba(255,255,255,.2)" }}
            >
              <img src="https://cashfree-checkoutcartimages-prod.cashfree.com/downloadb9vjla1da270_prod.png" alt="Cashfree" className="w-10 h-10" />
              <div className="flex flex-col items-center">
                <span style={{ fontFamily: "Garamond, serif", color: "#fff", fontSize: 16 }}>Pay ₹{fee} via Cashfree</span>
                <span style={{ fontFamily: "Garamond, serif", color: "rgba(255,255,255,.8)", fontSize: 11 }}>Powered By Cashfree</span>
              </div>
            </button>
            {error && <p className="text-sm text-primary">{error}</p>}
          </div>
          {cashfreeLink ? (
            <div className="space-y-3">
              <p className="text-xs text-navy-500">Or use external form: {baseUrl}/payment/callback</p>
            </div>
          ) : null}
          {(!cashfreeLink || hasUpi) && (
            <>
              <div className="rounded-2xl bg-white p-3 shadow-lg ring-2 ring-primary/30 mb-4 min-h-[226px] min-w-[226px] mx-auto flex items-center justify-center">
                {qrSrc ? <img src={qrSrc} alt="Scan to pay" width={220} height={220} className="rounded-lg" /> : <div className="text-center p-4 text-navy-600 text-sm">UPI not configured</div>}
              </div>
              <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/30">
                <div className="text-xs text-navy-300 uppercase tracking-wider mb-1">Enter in payment remark</div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-mono font-bold text-primary">{paymentKey}</span>
                  <button type="button" className="pill bg-navy-700 text-xs" onClick={() => navigator.clipboard?.writeText(paymentKey)}>Copy</button>
                </div>
              </div>
              {error && <div className="text-sm text-primary mb-2">{error}</div>}
              <button type="button" className="pill btn-purple w-full py-3 font-semibold" onClick={requestApproval} disabled={loading}>
                {loading ? "Requesting…" : "I've paid – Request approval"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
