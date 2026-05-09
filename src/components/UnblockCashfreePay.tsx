"use client"

import { useRef, useState, useCallback } from "react"
import TurnstileWidget, { type TurnstileWidgetRef } from "./TurnstileWidget"
import { clearBlockedCookies } from "@/lib/clearUserData"

function dismissCashfreeCheckoutDom() {
  if (typeof document === "undefined") return
  try {
    document.querySelectorAll("iframe").forEach((el) => {
      const s = el.getAttribute("src") || ""
      if (/cashfree/i.test(s)) el.remove()
    })
  } catch {
    /* ignore */
  }
}

async function loadCashfreeScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"))
  const w = window as unknown as { Cashfree?: unknown }
  if (w.Cashfree) return
  await new Promise<void>((resolve, reject) => {
    const src = "https://sdk.cashfree.com/js/v3/cashfree.js"
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      if (w.Cashfree) {
        resolve()
        return
      }
      existing.addEventListener("load", () => resolve(), { once: true })
      existing.addEventListener("error", () => reject(new Error("Cashfree SDK failed to load")), { once: true })
      return
    }
    const s = document.createElement("script")
    s.src = src
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error("Cashfree SDK failed to load"))
    document.head.appendChild(s)
  })
}

async function pollUnblockOrderPaid(orderId: string, maxMs = 120000): Promise<boolean> {
  const start = Date.now()
  const interval = 2000
  while (Date.now() - start < maxMs) {
    try {
      const stRes = await fetch(`/api/payments/status?orderId=${encodeURIComponent(orderId)}`, {
        cache: "no-store",
        credentials: "include"
      })
      const st = await stRes.json().catch(() => ({}))
      if (st?.status === "success") return true
    } catch {
      /* keep polling */
    }
    await new Promise((r) => setTimeout(r, interval))
  }
  return false
}

export default function UnblockCashfreePay({
  username,
  amount,
  lightBg,
  onPaymentSuccess
}: {
  username: string
  amount: number
  lightBg?: boolean
  onPaymentSuccess: () => void
}) {
  const turnstileRef = useRef<TurnstileWidgetRef>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isLight = !!lightBg

  const pay = useCallback(async () => {
    const turnstileToken = turnstileRef.current?.getToken() ?? null
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Please complete the verification below.")
      return
    }
    setLoading(true)
    setError(null)
    let orderIdForPoll: string | null = null
    try {
      const res = await fetch("/api/payments/cashfree/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: "unblock",
          unblockUsername: username,
          customerId: `UNBLOCK_${Date.now()}`,
          customerName: username,
          turnstileToken: turnstileToken ?? undefined
        })
      })
      const data = await res.json().catch(() => ({}))
      if (!data?.paymentSessionId) throw new Error(data?.error || "Failed to create order")
      orderIdForPoll = typeof data.orderId === "string" ? data.orderId : null
      if (!orderIdForPoll) throw new Error("No order id from gateway")

      await loadCashfreeScript()
      const Cf = (window as unknown as { Cashfree?: (opts: { mode: string }) => { checkout: (opts: Record<string, unknown>) => Promise<unknown> } }).Cashfree
      if (!Cf) throw new Error("Cashfree SDK did not load.")
      const cashfree = Cf({ mode: data?.mode ?? "production" })
      const returnUrl = `${window.location.origin}/payment/unblock-callback?order_id={order_id}&username=${encodeURIComponent(username)}`

      type CheckoutResult = { error?: { message?: string } } | undefined
      try {
        const result = (await cashfree.checkout({
          paymentSessionId: data.paymentSessionId,
          redirectTarget: "_modal",
          returnUrl
        })) as CheckoutResult
        if (result && typeof result === "object" && result.error) {
          const msg = result.error?.message?.trim()
          if (msg) console.warn("Cashfree checkout:", msg)
        }
      } catch (checkoutErr) {
        const msg = checkoutErr instanceof Error ? checkoutErr.message : ""
        if (msg) console.warn("Cashfree checkout closed or error:", msg)
      }

      setLoading(false)
      const paid = await pollUnblockOrderPaid(orderIdForPoll, 120000)
      dismissCashfreeCheckoutDom()
      if (paid) {
        clearBlockedCookies()
        onPaymentSuccess()
        return
      }
      setError("Payment not completed or confirmation timed out. If you paid, wait a moment or use Pay with QR.")
      turnstileRef.current?.reset()
    } catch (err: unknown) {
      dismissCashfreeCheckoutDom()
      setError(err instanceof Error ? err.message : "Payment failed to start")
      turnstileRef.current?.reset()
    } finally {
      setLoading(false)
    }
  }, [username, onPaymentSuccess])

  return (
    <div className="space-y-3">
      {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
        <div className="flex justify-center min-h-[65px]">
          <TurnstileWidget ref={turnstileRef} />
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => void pay()}
        disabled={loading}
        className={`w-full rounded-xl px-6 py-3 font-semibold transition-colors disabled:opacity-50 ${
          isLight ? "bg-[#7c3aed] text-white hover:bg-violet-600" : "bg-primary text-black hover:brightness-110"
        }`}
      >
        {loading ? "Opening payment…" : `Pay ₹${amount} with Cashfree (UPI / Card)`}
      </button>
      {error && <p className={`text-sm ${isLight ? "text-amber-700" : "text-amber-400"}`}>{error}</p>}
    </div>
  )
}
