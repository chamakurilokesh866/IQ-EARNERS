"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useModalA11y } from "@/hooks/useModalA11y"
import { useToast } from "@/context/ToastContext"
import TurnstileWidget, { type TurnstileWidgetRef } from "./TurnstileWidget"
import PaymentFailedAnimation from "./PaymentFailedAnimation"
import MoneyTransferAnimation from "./MoneyTransferAnimation"
import AdminApprovalWaitAnimation from "./AdminApprovalWaitAnimation"
import { AlertIcon, XIcon } from "./AnimatedIcons"

/** Remove Cashfree checkout iframes so a failed attempt does not leave the gateway modal open. */
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

async function pollCashfreeOrderPaid(
  orderId: string,
  maxMs = 120000,
  isCancelled: () => boolean = () => false
): Promise<boolean> {
  const start = Date.now()
  const interval = 1500
  while (Date.now() - start < maxMs) {
    if (isCancelled()) return false
    try {
      const [stRes, vRes] = await Promise.all([
        fetch(`/api/payments/status?orderId=${encodeURIComponent(orderId)}`, {
          cache: "no-store",
          credentials: "include"
        }),
        fetch(`/api/payments/cashfree/verify-order?orderId=${encodeURIComponent(orderId)}`, {
          cache: "no-store",
          credentials: "include"
        })
      ])
      const [st, v] = await Promise.all([stRes.json().catch(() => ({} as Record<string, unknown>)), vRes.json().catch(() => ({} as Record<string, unknown>))])
      if (st?.status === "success") return true
      if (v?.ok && v?.status === "success") return true
    } catch {
      /* network blip — keep polling */
    }
    if (isCancelled()) return false
    await new Promise((r) => setTimeout(r, interval))
  }
  return false
}

/** Manual: poll often so UI feels responsive when admin acts */
const MANUAL_STATUS_POLL_MS = 1500
const MANUAL_POLL_TTL_MS = 25 * 60 * 1000
/** Main sheet width — compact on all breakpoints */
const PAY_MODAL_W = "max-w-[17rem] sm:max-w-[18.25rem]"

function ManualPaymentStepStrip({ activeStep }: { activeStep: 1 | 2 | 3 }) {
  const steps = [
    { n: 1 as const, label: "Pay & Upload" },
    { n: 2 as const, label: "Reviewing" },
    { n: 3 as const, label: "Done" }
  ]
  return (
    <div
      className="mb-3 flex items-center justify-between gap-1 rounded-xl border border-white/[0.08] bg-slate-950/40 p-1.5 backdrop-blur-md"
      role="list"
      aria-label="Payment steps"
    >
      {steps.map((s, idx) => {
        const done = activeStep > s.n
        const current = activeStep === s.n
        return (
          <div key={s.n} className="flex flex-1 items-center gap-2" role="listitem">
            <div className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-300 ${
                  done
                    ? "bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                    : current
                      ? "bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.4)] ring-2 ring-cyan-400/20"
                      : "bg-white/[0.06] text-white/30"
                }`}
                aria-current={current ? "step" : undefined}
              >
                {done ? "✓" : s.n}
              </div>
              <span
                className={`text-[8px] font-bold uppercase tracking-tighter transition-colors duration-300 ${current ? "text-cyan-300" : "text-white/25"}`}
              >
                {s.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className="h-[1px] flex-1 bg-white/[0.08]">
                <div 
                  className={`h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-700 ${done ? "w-full" : "w-0"}`}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

type CashfreePhase = "idle" | "confirming" | "failed"
type PaymentMode = "cashfree" | "manual"
/** Manual: single form (QR + receipt), then waiting for admin, or failed */
type ManualStep = "form" | "waiting" | "failed"

export default function PaymentModal({ amount = 100, onSuccess, onClose }: { amount?: number; onSuccess?: () => void; onClose?: () => void }) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const historyPushedRef = useRef(false)
  const closedViaPopRef = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    closedViaPopRef.current = false
    try {
      const p = window.location.pathname + window.location.search
      window.history.pushState({ iqPayModal: 1 }, "", p)
      historyPushedRef.current = true
    } catch {
      historyPushedRef.current = false
    }
    const onPop = () => {
      closedViaPopRef.current = true
      historyPushedRef.current = false
      ;(onCloseRef.current ?? (() => {}))()
    }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  const handleClose = useCallback(() => {
    stopPaymentPollsRef.current = true
    ;(onCloseRef.current ?? (() => {}))()
    if (!closedViaPopRef.current && historyPushedRef.current) {
      try {
        window.history.back()
      } catch {
        /* ignore */
      }
      historyPushedRef.current = false
    }
    closedViaPopRef.current = false
  }, [])

  const { showToast } = useToast()
  const [resolvedEntryFee, setResolvedEntryFee] = useState<number>(() => Math.max(1, amount))
  const [settingsUpiId, setSettingsUpiId] = useState<string>("")
  const [settingsQrImageUrl, setSettingsQrImageUrl] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileWidgetRef>(null)
  const [mode, setMode] = useState<PaymentMode>("cashfree")
  const [manualStep, setManualStep] = useState<ManualStep>("form")
  const [manualScreenshot, setManualScreenshot] = useState<File | null>(null)
  const [manualPaymentId, setManualPaymentId] = useState<string | null>(null)
  const [manualSubmitting, setManualSubmitting] = useState(false)
  const [fastSuccessMessage, setFastSuccessMessage] = useState<string | null>(null)
  const stopPaymentPollsRef = useRef(false)
  useEffect(() => {
    stopPaymentPollsRef.current = false
    return () => {
      stopPaymentPollsRef.current = true
    }
  }, [])

  const manualScreenshotObjectUrlRef = useRef<string | null>(null)
  const [manualScreenshotPreviewUrl, setManualScreenshotPreviewUrl] = useState<string | null>(null)
  const manualFileInputRef = useRef<HTMLInputElement>(null)
  const setManualScreenshotFile = useCallback((file: File | null) => {
    if (manualScreenshotObjectUrlRef.current) {
      URL.revokeObjectURL(manualScreenshotObjectUrlRef.current)
      manualScreenshotObjectUrlRef.current = null
    }
    setManualScreenshot(file)
    if (file) {
      const u = URL.createObjectURL(file)
      manualScreenshotObjectUrlRef.current = u
      setManualScreenshotPreviewUrl(u)
    } else {
      setManualScreenshotPreviewUrl(null)
    }
  }, [])
  useEffect(() => {
    return () => {
      if (manualScreenshotObjectUrlRef.current) {
        URL.revokeObjectURL(manualScreenshotObjectUrlRef.current)
        manualScreenshotObjectUrlRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const d = j?.data ?? {}
        const ef = Number(d.entryFee ?? amount)
        if (Number.isFinite(ef) && ef > 0) setResolvedEntryFee(Math.max(1, ef))
        setSettingsUpiId(String(d.upiId ?? d.upi_id ?? "").trim())
        setSettingsQrImageUrl(String(d.qrImageUrl ?? "").trim())
      })
      .catch(() => showToast("Could not load payment settings"))
  }, [showToast, amount])

  const cashfreePayAmount = resolvedEntryFee

  const [cashfreeLoading, setCashfreeLoading] = useState(false)
  const [cashfreePhase, setCashfreePhase] = useState<CashfreePhase>("idle")
  const resetCashfreeFailure = useCallback(() => {
    dismissCashfreeCheckoutDom()
    setCashfreePhase("idle")
    setError(null)
    turnstileRef.current?.reset()
  }, [])

  const dismissFromForm = useCallback(() => {
    resetCashfreeFailure()
    handleClose()
  }, [resetCashfreeFailure, handleClose])

  const onModalEscape = useCallback(() => {
    if (manualStep === "waiting") return
    if (cashfreePhase === "confirming") return
    if (cashfreePhase === "failed") {
      resetCashfreeFailure()
      return
    }
    dismissFromForm()
  }, [manualStep, cashfreePhase, resetCashfreeFailure, dismissFromForm])

  const contentRef = useModalA11y(true, onModalEscape)

  useEffect(() => {
    if (cashfreePhase !== "failed") return
    const t = window.setTimeout(() => dismissCashfreeCheckoutDom(), 400)
    return () => clearTimeout(t)
  }, [cashfreePhase])

  useEffect(() => {
    if (typeof window === "undefined") return
    const pendingOrderId = window.localStorage.getItem("pending_cashfree_username_order_id")
    if (pendingOrderId) {
      fetch("/api/payment/create-username-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderId: pendingOrderId })
      })
        .then((r) => r.json())
        .then((j) => {
          if (!j?.ok || !j?.token) return
          window.localStorage.removeItem("pending_cashfree_username_order_id")
          const url = new URL("/create-username", window.location.origin)
          url.searchParams.set("token", j.token)
          window.location.replace(url.toString())
        })
        .catch(() => { })
    }

    const pendingPaymentId = window.localStorage.getItem("pending_manual_username_payment_id")
    if (!pendingPaymentId) return
    fetch(`/api/payments/status?id=${encodeURIComponent(pendingPaymentId)}`, { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then(async (j) => {
        if (j?.status !== "success") return
        const tokenRes = await fetch("/api/payment/create-username-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ paymentId: pendingPaymentId })
        })
        const tokenData = await tokenRes.json().catch(() => ({}))
        if (tokenData?.ok && tokenData?.token) {
          window.localStorage.removeItem("pending_manual_username_payment_id")
          const url = new URL("/create-username", window.location.origin)
          url.searchParams.set("token", tokenData.token)
          window.location.replace(url.toString())
        }
      })
      .catch(() => { })
  }, [])

  const handlePayWithCashfree = async () => {
    const turnstileToken = turnstileRef.current?.getToken() ?? null
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Please complete the verification below.")
      return
    }
    stopPaymentPollsRef.current = false
    setCashfreeLoading(true)
    setError(null)
    setCashfreePhase("idle")
    let orderIdForPoll: string | null = null
    try {
      const res = await fetch("/api/payments/cashfree/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: cashfreePayAmount,
          paymentPlan: "entry",
          type: "entry",
          customerId: `CUST_${Date.now()}`,
          customerName: "Participant",
          customerPhone: undefined,
          turnstileToken: turnstileToken ?? undefined
        })
      })
      const data = await res.json().catch(() => ({}))
      if (!data?.paymentSessionId) throw new Error(data?.error || "Failed to create order")
      orderIdForPoll = typeof data.orderId === "string" ? data.orderId : null
      if (!orderIdForPoll) throw new Error("No order id from gateway")
      try { window.localStorage.setItem("pending_cashfree_username_order_id", orderIdForPoll) } catch { }

      await loadCashfreeScript()
      const Cf = (window as unknown as { Cashfree?: (opts: { mode: string }) => { checkout: (opts: Record<string, unknown>) => Promise<unknown> } }).Cashfree
      if (!Cf) throw new Error("Cashfree SDK did not load. Please try again.")
      const cashfree = Cf({ mode: data?.mode ?? "production" })
      const returnUrl = `${window.location.origin}/payment/callback?order_id={order_id}`

      type CheckoutResult = { error?: { message?: string }; redirect?: boolean } | undefined
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

      setCashfreePhase("confirming")
      setCashfreeLoading(false)

      const paid = await pollCashfreeOrderPaid(orderIdForPoll, 120000, () => stopPaymentPollsRef.current)
      if (stopPaymentPollsRef.current) {
        dismissCashfreeCheckoutDom()
        setCashfreePhase("idle")
        return
      }
      if (paid) {
        dismissCashfreeCheckoutDom()
        setFastSuccessMessage("Payment successful! Opening username setup...")
        const tokenRes = await fetch("/api/payment/create-username-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ orderId: orderIdForPoll })
        })
        const tokenData = await tokenRes.json().catch(() => ({}))
        if (tokenData?.ok && tokenData?.token) {
          await new Promise((r) => setTimeout(r, 350))
          try { window.localStorage.removeItem("pending_cashfree_username_order_id") } catch { }
          onSuccess?.()
          const url = new URL("/create-username", window.location.origin)
          url.searchParams.set("token", tokenData.token)
          window.location.replace(url.toString())
          return
        }
        setCashfreePhase("failed")
        setError(
          String(
            tokenData?.error ||
              "Payment verified but we could not start account setup. Return from the payment page or contact support."
          )
        )
      } else {
        dismissCashfreeCheckoutDom()
        setCashfreePhase("failed")
        setError("Payment not completed or confirmation timed out.")
      }
    } catch (err: unknown) {
      setCashfreePhase("idle")
      setError(err instanceof Error ? err.message : "Payment failed to start")
      turnstileRef.current?.reset()
    } finally {
      setCashfreeLoading(false)
    }
  }

  const pollManualPayment = useCallback(
    async (paymentId: string) => {
      const started = Date.now()
      while (Date.now() - started < MANUAL_POLL_TTL_MS) {
        if (stopPaymentPollsRef.current) return
        const stRes = await fetch(`/api/payments/status?id=${encodeURIComponent(paymentId)}`, { cache: "no-store", credentials: "include" })
        const st = await stRes.json().catch(() => ({}))
        if (st?.status === "success") {
          const tokenRes = await fetch("/api/payment/create-username-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ paymentId })
          })
          const tokenData = await tokenRes.json().catch(() => ({}))
          if (tokenData?.ok && tokenData?.token) {
            setFastSuccessMessage("Payment approved! Opening username setup...")
            await new Promise((r) => setTimeout(r, 400))
            try {
              window.localStorage.removeItem("pending_manual_username_payment_id")
            } catch { }
            onSuccess?.()
            const url = new URL("/create-username", window.location.origin)
            url.searchParams.set("token", tokenData.token)
            window.location.replace(url.toString())
            return
          }
          setManualStep("failed")
          setError("Payment is approved, but we could not open account setup. Return to the app and use payment help or contact support.")
          return
        }
        if (st?.status === "denied" || st?.status === "failed" || st?.status === "rejected") {
          setManualStep("failed")
          setError("Admin rejected this payment proof. Please retry with a real payment screenshot.")
          return
        }
        if (stopPaymentPollsRef.current) return
        await new Promise((r) => setTimeout(r, MANUAL_STATUS_POLL_MS))
      }
      setManualStep("failed")
      setError("No response after a long wait. If your payment was approved, try logging in; you can also close this and return later.")
    },
    [onSuccess]
  )

  const handleManualScreenshotChange = useCallback(
    (file: File | null) => {
      setManualScreenshotFile(file)
    },
    [setManualScreenshotFile]
  )

  const handleManualSubmitProof = useCallback(async () => {
    const turnstileToken = turnstileRef.current?.getToken() ?? null
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Please complete the verification below.")
      return
    }
    if (!manualScreenshot) {
      setError("Upload your payment screenshot.")
      return
    }
    setError(null)
    setManualSubmitting(true)
    stopPaymentPollsRef.current = false
    try {
      const paymentCode = `${Math.floor(1000 + Math.random() * 9000)}`
      const fd = new FormData()
      fd.set("paymentCode", paymentCode)
      fd.set("amount", String(cashfreePayAmount))
      fd.set("paymentPlan", "entry")
      fd.set("screenshot", manualScreenshot)
      if (turnstileToken) fd.set("turnstileToken", turnstileToken)
      const res = await fetch("/api/payments/manual-proof", { method: "POST", body: fd, credentials: "include" })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.ok || !j?.id) {
        throw new Error(String(j?.error || "Failed to send screenshot"))
      }
      setManualPaymentId(String(j.id))
      try { window.localStorage.setItem("pending_manual_username_payment_id", String(j.id)) } catch { }
      setManualScreenshotFile(null)
      if (manualFileInputRef.current) manualFileInputRef.current.value = ""
      setManualStep("waiting")
      await pollManualPayment(String(j.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send screenshot")
    } finally {
      setManualSubmitting(false)
      turnstileRef.current?.reset()
    }
  }, [manualScreenshot, cashfreePayAmount, pollManualPayment, setManualScreenshotFile])

  /** Step strip: 1 = on form, 2 = waiting for admin, 3 = will advance after approval */
  const manualActiveStep: 1 | 2 | 3 =
    manualStep === "waiting" ? 2 : manualStep === "failed" ? 1 : 1

  if (fastSuccessMessage) {
    return (
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-3 sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Payment successful"
      >
        <div
          className={`w-full ${PAY_MODAL_W} rounded-xl border border-emerald-500/20 bg-slate-900/95 p-3.5 text-center shadow-lg shadow-emerald-950/30 ring-1 ring-white/[0.04]`}
          role="status"
        >
          <div
            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-xl text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500/30"
            aria-hidden
          >
            ✓
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-emerald-400 sm:text-sm">Success</p>
          <p className="mt-1 text-[11px] font-medium leading-relaxed text-white/80 sm:text-xs">{fastSuccessMessage}</p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="h-1 w-1 animate-bounce rounded-full bg-emerald-400" />
            <span className="h-1 w-1 animate-bounce rounded-full bg-emerald-400 [animation-delay:0.2s]" />
            <span className="h-1 w-1 animate-bounce rounded-full bg-emerald-400 [animation-delay:0.4s]" />
          </div>
        </div>
      </div>
    )
  }

  if (manualStep === "waiting") {
    return (
      <div
        className="fixed inset-0 z-[60] flex flex-col items-center justify-end bg-slate-950/95 backdrop-blur-md p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:justify-center"
        role="dialog"
        aria-modal="true"
        aria-label="Payment pending verification"
      >
        <div
          className={`w-full ${PAY_MODAL_W} relative overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900/40 p-1 shadow-2xl ring-1 ring-white/[0.05]`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top animated bar */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-[shimmer_2s_infinite]" />
          
          <div className="p-4">
            <ManualPaymentStepStrip activeStep={2} />
            <div ref={contentRef} className="mt-4">
              <AdminApprovalWaitAnimation
                message="Processing Proof"
                submessage="Our team is verifying your payment. We usually approve manual receipts in 2-5 minutes."
                paymentId={manualPaymentId}
                compact
              />
              
              <div className="mt-4 rounded-xl border border-cyan-500/10 bg-cyan-500/[0.03] p-3 text-center">
                <p className="text-[10px] font-medium text-cyan-200/70">
                  ⚡ <span className="text-cyan-100">Fast-Track Mode:</span> Reviewers have been notified of your submission.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const ErrorMsg = ({ msg }: { msg: string | null }) => {
    if (!msg) return null
    return (
      <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.08] px-2.5 py-2 text-[11px] leading-snug text-red-200 sm:text-xs">
        <AlertIcon size={16} className="mt-0.5 shrink-0 text-red-400" />
        <span>{msg}</span>
      </div>
    )
  }

  if (cashfreePhase === "confirming") {
    return (
      <div
        className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/90 backdrop-blur-sm p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:items-center sm:p-3"
        role="dialog"
        aria-modal="true"
        aria-label="Confirming payment"
      >
        <div ref={contentRef} className={`w-full ${PAY_MODAL_W} min-w-0 relative z-10`} onClick={(e) => e.stopPropagation()}>
          <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-slate-900/95 p-3 shadow-lg ring-1 ring-white/[0.04] sm:p-3.5">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />
            <MoneyTransferAnimation message="Confirming with Cashfree…" compact />
            <p className="mt-2 text-center text-[9px] text-white/40 sm:text-[10px]">Keep this window open.</p>
          </div>
        </div>
      </div>
    )
  }

  if (cashfreePhase === "failed") {
    return (
      <div
        className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/90 backdrop-blur-sm p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:items-center sm:p-3"
        role="dialog"
        aria-modal="true"
        aria-label="Payment failed"
      >
        <div ref={contentRef} className={`w-full ${PAY_MODAL_W} min-w-0 relative z-10`} onClick={(e) => e.stopPropagation()}>
          <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-slate-900/95 p-3 shadow-lg ring-1 ring-white/[0.04]">
            <PaymentFailedAnimation onRetry={resetCashfreeFailure} subtitle={error ?? undefined} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto overscroll-contain bg-slate-950/90 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center sm:p-3"
      onClick={dismissFromForm}
      role="dialog"
      aria-modal="true"
      aria-label="Entry fee payment"
    >
      <div
        ref={contentRef}
        className={`relative z-10 my-1 w-full min-w-0 ${PAY_MODAL_W} sm:my-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900/60 shadow-2xl shadow-black/50 ring-1 ring-white/[0.05] backdrop-blur-xl">
          {/* Premium Top Bar */}
          <div className="h-[3px] w-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-violet-500" />

          <div className="relative p-4 sm:p-5">
            {/* Fast Process Badge */}
            <div className="absolute right-4 top-4 flex items-center gap-1.5">
              <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 ring-1 ring-emerald-500/20">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-400">Secure & Fast</span>
              </div>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.03] text-white/40 transition-all hover:bg-white/[0.08] hover:text-white"
                onClick={dismissFromForm}
                title="Close"
                aria-label="Close payment window"
              >
                <XIcon size={18} />
              </button>
            </div>

            <div className="mb-2.5 pr-8">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-200/80">Entry fee</p>
              <h2 className="mt-1 text-[15px] font-bold leading-tight tracking-tight text-white sm:text-base">Pay</h2>
              <p className="mt-1 text-[10px] leading-snug text-white/45 sm:text-[11px]">
                Cashfree confirms instantly. Static UPI is reviewed by the team.
              </p>
            </div>

            <div className="mb-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 sm:p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-medium uppercase tracking-wider text-white/35">Due</p>
                  <p className="mt-0.5 flex items-baseline gap-1">
                    <span className="text-lg font-bold tabular-nums text-white sm:text-xl">₹{cashfreePayAmount}</span>
                    <span className="text-[10px] text-white/30">INR</span>
                  </p>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 ring-1 ring-cyan-400/20">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-cyan-300" aria-hidden>
                    <path d="M12 2L4 6v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V6l-8-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-xl border border-white/[0.06] bg-slate-950/40 p-1.5 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => {
                  setMode("cashfree")
                  setError(null)
                  setManualStep("form")
                  setManualScreenshotFile(null)
                  if (manualFileInputRef.current) manualFileInputRef.current.value = ""
                }}
                className={`group relative flex flex-col items-center justify-center rounded-lg py-2.5 transition-all duration-300 ${
                  mode === "cashfree" 
                    ? "bg-white text-slate-900 shadow-[0_0_20px_rgba(255,255,255,0.15)]" 
                    : "text-white/50 hover:bg-white/[0.03] hover:text-white/80"
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-widest sm:text-[11px]">Instant</span>
                <span className={`mt-0.5 text-[8px] font-medium opacity-60 sm:text-[9px] ${mode === "cashfree" ? "text-slate-600" : "text-white/30"}`}>Auto-Verify</span>
                {mode === "cashfree" && (
                  <div className="absolute -bottom-1 h-1 w-1/3 rounded-full bg-cyan-500" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("manual")
                  setError(null)
                  setManualStep("form")
                  setManualScreenshotFile(null)
                  if (manualFileInputRef.current) manualFileInputRef.current.value = ""
                }}
                className={`group relative flex flex-col items-center justify-center rounded-lg py-2.5 transition-all duration-300 ${
                  mode === "manual" 
                    ? "bg-white text-slate-900 shadow-[0_0_20px_rgba(255,255,255,0.15)]" 
                    : "text-white/50 hover:bg-white/[0.03] hover:text-white/80"
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-widest sm:text-[11px]">Manual</span>
                <span className={`mt-0.5 text-[8px] font-medium opacity-60 sm:text-[9px] ${mode === "manual" ? "text-slate-600" : "text-white/30"}`}>UPI Receipt</span>
                {mode === "manual" && (
                  <div className="absolute -bottom-1 h-1 w-1/3 rounded-full bg-indigo-500" />
                )}
              </button>
            </div>
            <p className="mb-4 text-center text-[9px] font-medium leading-snug text-white/30 sm:text-[10px]">
              {mode === "cashfree" ? "Highly recommended for instant access via Cards or UPI." : "Secure transfer to official UPI. Verified by staff manually."}
            </p>

            <form onSubmit={(e) => e.preventDefault()} className="space-y-2.5 sm:space-y-3">
              <ErrorMsg msg={error} />

              {mode === "cashfree" && (
                <>
                  <div className="flex min-h-[60px] items-center justify-center overflow-x-auto overflow-y-hidden rounded-lg border border-white/[0.06] bg-slate-950/60 py-0.5 [-webkit-overflow-scrolling:touch]">
                    <TurnstileWidget ref={turnstileRef} theme="dark" size="compact" />
                  </div>

                  <button
                    type="button"
                    onClick={handlePayWithCashfree}
                    disabled={cashfreeLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2 text-xs font-semibold text-slate-900 shadow-md transition duration-150 hover:bg-slate-100 active:scale-[0.99] disabled:opacity-55 sm:py-2.5 sm:text-sm"
                  >
                    <img
                      src="https://cashfree-checkoutcartimages-prod.cashfree.com/downloadb9vjla1da270_prod.png"
                      alt=""
                      className="h-5 w-5"
                      width={20}
                      height={20}
                    />
                    {cashfreeLoading ? "Opening…" : "Continue"}
                  </button>
                </>
              )}

              {mode === "manual" && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <ManualPaymentStepStrip activeStep={manualActiveStep} />
                  {manualStep === "form" && (
                    <div className="space-y-4">
                      {/* Terminal-like QR Container */}
                      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-950/60 p-4 shadow-inner">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.1),transparent)]" />
                        
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="mb-3 rounded-xl bg-white p-2.5 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                            {settingsQrImageUrl ? (
                              <img
                                src={settingsQrImageUrl}
                                alt="Payment QR"
                                className="h-32 w-32 object-contain sm:h-36 sm:w-36"
                                loading="eager"
                              />
                            ) : (
                              <div className="flex h-32 w-32 items-center justify-center rounded-lg border border-dashed border-slate-200 text-center text-[10px] text-slate-400 sm:h-36 sm:w-36">
                                QR Unavailable
                              </div>
                            )}
                          </div>
                          
                          {settingsUpiId && (
                            <div className="flex items-center gap-2 rounded-full bg-white/[0.05] px-3 py-1 ring-1 ring-white/[0.1]">
                              <span className="text-[10px] font-medium text-white/40">UPI:</span>
                              <span className="text-[10px] font-bold text-cyan-300">{settingsUpiId}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Upload Section */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-white/30">Proof of Payment</label>
                        <div className="group relative">
                          <input
                            ref={manualFileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            capture="environment"
                            onChange={(e) => { handleManualScreenshotChange(e.target.files?.[0] ?? null) }}
                            className="sr-only"
                            id="payment-manual-screenshot"
                          />
                          <label
                            htmlFor="payment-manual-screenshot"
                            className={`flex min-h-[4rem] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-300 ${
                              manualScreenshot 
                                ? "border-emerald-500/40 bg-emerald-500/[0.03]" 
                                : "border-white/10 bg-white/[0.02] hover:border-cyan-500/40 hover:bg-cyan-500/[0.02]"
                            }`}
                          >
                            {!manualScreenshot ? (
                              <>
                                <svg className="mb-1 h-6 w-6 text-white/20 group-hover:text-cyan-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                <span className="text-[10px] font-bold text-white/50 group-hover:text-white/80">Tap to Upload Receipt</span>
                              </>
                            ) : (
                              <div className="flex items-center gap-3 px-4">
                                <div className="h-10 w-10 overflow-hidden rounded-lg border border-emerald-500/20">
                                  <img src={manualScreenshotPreviewUrl!} alt="Preview" className="h-full w-full object-cover" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-emerald-400">Receipt Selected</span>
                                  <span className="text-[8px] text-white/40">Tap to change file</span>
                                </div>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>

                      {/* Verification Widget */}
                      <div className="flex min-h-[60px] items-center justify-center rounded-xl border border-white/[0.06] bg-slate-950/40 py-1">
                        <TurnstileWidget ref={turnstileRef} theme="dark" size="compact" />
                      </div>

                      <button
                        type="button"
                        onClick={handleManualSubmitProof}
                        disabled={manualSubmitting || !manualScreenshot}
                        className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 py-3 text-[11px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-cyan-500/20 active:scale-[0.98] disabled:opacity-30"
                      >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          {manualSubmitting ? (
                            <>
                              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                              Processing...
                            </>
                          ) : (
                            "Submit for Approval"
                          )}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]" />
                      </button>
                    </div>
                  )}

                  {manualStep === "failed" && (
                    <button
                      type="button"
                      onClick={() => {
                        setManualStep("form")
                        setManualScreenshotFile(null)
                        if (manualFileInputRef.current) manualFileInputRef.current.value = ""
                        setError(null)
                      }}
                      className="w-full rounded-md border border-white/15 py-2 text-xs font-medium text-white transition duration-150 hover:bg-white/[0.04]"
                    >
                      Try again
                    </button>
                  )}
                </div>
              )}

              <p className="text-center text-[8px] leading-relaxed text-white/32 sm:text-[9px]">
                {mode === "manual"
                  ? "Duplicate receipts rejected. Image must be a real photo file."
                  : "Encrypted connection (HTTPS)."}
              </p>
            </form>

            <div className="mt-2 border-t border-white/[0.05] pt-2 text-center text-[8px] text-white/35 sm:text-[9px]">
              <a
                href="/more/terms"
                className="text-cyan-200/80 underline decoration-white/15 underline-offset-2 hover:text-white"
                target="_blank"
                rel="noreferrer"
              >
                Terms
              </a>{" "}
              ·
              <a
                href="/more/privacy"
                className="text-cyan-200/80 underline decoration-white/15 underline-offset-2 hover:text-white"
                target="_blank"
                rel="noreferrer"
              >
                Privacy
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
