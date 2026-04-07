"use client"

import { useState, useEffect, useRef } from "react"
import { useModalA11y } from "@/hooks/useModalA11y"
import { useToast } from "@/context/ToastContext"
import TurnstileWidget, { type TurnstileWidgetRef } from "./TurnstileWidget"
import { TimerIcon, CameraIcon, FileTextIcon, AlertIcon, XIcon } from "./AnimatedIcons"

const PAYMENT_NAME = "IQ Earners"

function WaitingForApproval({ paymentId, onClose, onError }: { paymentId: string | null; onClose?: () => void; onError?: (msg: string) => void }) {
  const [approved, setApproved] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  useEffect(() => {
    if (!paymentId) return
    const poll = async () => {
      try {
        const r = await fetch(`/api/payments/status?id=${paymentId}`, { cache: "no-store" })
        const j = await r.json().catch(() => ({}))
        if (j?.status === "success") {
          setApproved(true)
        }
      } catch { }
    }
    const t = setInterval(poll, 3000)
    poll()
    return () => clearInterval(t)
  }, [paymentId])

  useEffect(() => {
    if (!approved || !paymentId || redirecting) return
    const fetchTokenAndRedirect = async () => {
      setRedirecting(true)
      try {
        const res = await fetch("/api/payment/create-username-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ paymentId })
        })
        const data = await res.json().catch(() => ({}))
        if (data?.ok && data?.token) {
          const url = new URL("/create-username", window.location.origin)
          url.searchParams.set("token", data.token)
          window.location.replace(url.toString())
          return
        }
      } catch {
        onError?.("Could not proceed. Please try again.")
      }
      setRedirecting(false)
    }
    fetchTokenAndRedirect()
  }, [approved, paymentId, redirecting, onError])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center blur-overlay p-3 sm:p-4" onClick={onClose}>
      {/* Background particles */}
      <div className="modal-particle-bg">
        <div className="modal-particle" style={{ left: "20%", top: "30%", width: "4px", height: "4px", background: "rgba(168,85,247,0.5)", "--dur": "7s", "--delay": "0s", "--float-y": "-25px", "--max-op": "0.2" } as React.CSSProperties} />
        <div className="modal-particle" style={{ right: "15%", top: "65%", width: "3px", height: "3px", background: "rgba(245,179,1,0.4)", "--dur": "8s", "--delay": "1s", "--float-y": "-30px", "--max-op": "0.15" } as React.CSSProperties} />
      </div>

      <div className="w-full max-w-sm relative z-10" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-2xl border border-white/10 bg-navy-950/90 backdrop-blur-xl shadow-2xl p-6 overflow-hidden">
          <div className="relative z-10 text-center py-4">
            {approved ? (
              <>
                <div className="w-16 h-16 mx-auto rounded-full border-2 border-emerald-500/30 flex items-center justify-center mb-4">
                  <div className="inline-flex h-10 w-10 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                </div>
                <div className="font-bold text-lg text-white">Verification Successful</div>
                <p className="mt-2 text-sm text-white/50">One moment while we prepare your account...</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto mb-6 relative">
                  <div className="absolute inset-0 rounded-full border border-white/10 animate-ping opacity-20" />
                  <div className="w-full h-full rounded-full border-2 border-primary/20 border-t-primary animate-spin flex items-center justify-center">
                    <TimerIcon size={24} className="text-primary" />
                  </div>
                </div>
                <div className="font-bold text-xl text-white">Awaiting Approval</div>
                <p className="mt-2 text-sm text-white/50 leading-relaxed px-4">Our administrators are verifying your transaction. This typically takes 2-5 minutes.</p>
                <div className="mt-8 pt-6 border-t border-white/5">
                  <button type="button" className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm font-bold transition-all" onClick={onClose}>Close & Wait</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function generateUniqueCode(usedCodes: Set<string>): string {
  for (const len of [4, 5, 6]) {
    const max = Math.pow(10, len) - 1
    const min = Math.pow(10, len - 1)
    for (let i = 0; i < 100; i++) {
      const code = String(Math.floor(min + Math.random() * (max - min + 1)))
      if (!usedCodes.has(code)) return code
    }
  }
  return String(Date.now()).slice(-6)
}

type Stage = "form" | "qr" | "upload" | "waiting" | "success"

export default function PaymentModal({ amount = 100, onSuccess, onClose }: { amount?: number; onSuccess?: () => void; onClose?: () => void }) {
  const handleClose = onClose ?? (() => { })
  const contentRef = useModalA11y(true, handleClose)
  const { showToast } = useToast()
  const [phone, setPhone] = useState("")
  const [generatedCode, setGeneratedCode] = useState("")
  const [usedCodesRef] = useState(() => new Set<string>())
  const [error, setError] = useState<string | null>(null)
  const [upiId, setUpiId] = useState("")
  const [qrImageUrl, setQrImageUrl] = useState("")
  const [stage, setStage] = useState<Stage>("form")
  const [qrTimer, setQrTimer] = useState(120)
  const [showPaidPrompt, setShowPaidPrompt] = useState(false)
  const [showRetry, setShowRetry] = useState(false)
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [showQrOption, setShowQrOption] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const turnstileRef = useRef<TurnstileWidgetRef>(null)
  const turnstileUploadRef = useRef<TurnstileWidgetRef>(null)

  useEffect(() => {
    const code = generateUniqueCode(usedCodesRef)
    usedCodesRef.add(code)
    setGeneratedCode(code)
  }, [usedCodesRef])

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const d = j?.data ?? {}
        const id = d.upiId ?? d.upi_id ?? process.env.NEXT_PUBLIC_DEFAULT_UPI ?? ""
        if (typeof id === "string") setUpiId(id.trim())
        const qr = d.qrImageUrl ?? ""
        if (typeof qr === "string" && qr) setQrImageUrl(qr)
      })
      .catch(() => showToast("Could not load payment settings"))
  }, [showToast])

  // 2 min timer when QR is shown
  useEffect(() => {
    if (stage !== "qr") return
    setQrTimer(120)
    setShowRetry(false)
    timerRef.current = setInterval(() => {
      setQrTimer((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          setShowRetry(true)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [stage])

  // After 10s show "Have you paid?"
  useEffect(() => {
    if (stage !== "qr") return
    const t = setTimeout(() => setShowPaidPrompt(true), 10000)
    return () => clearTimeout(t)
  }, [stage])

  const [cashfreeLoading, setCashfreeLoading] = useState(false)

  const handlePayWithCashfree = async () => {
    const turnstileToken = turnstileRef.current?.getToken() ?? null
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Please complete the verification below.")
      return
    }
    setCashfreeLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/payments/cashfree/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount,
          type: "entry",
          customerId: `CUST_${Date.now()}`,
          customerName: "Participant",
          customerPhone: phone.trim() || undefined,
          turnstileToken: turnstileToken ?? undefined
        })
      })
      const data = await res.json().catch(() => ({}))
      if (!data?.paymentSessionId) throw new Error(data?.error || "Failed to create order")
      let Cf = (window as any).Cashfree
      if (!Cf) throw new Error("Cashfree SDK did not load. Please try again.")
      const cashfree = Cf({ mode: data?.mode ?? "production" })
      const returnUrl = `${window.location.origin}/payment/callback?order_id={order_id}`
      await cashfree.checkout({
        paymentSessionId: data.paymentSessionId,
        redirectTarget: "_self",
        returnUrl
      })
    } catch (err: any) {
      setError(err?.message ?? "Payment failed to start")
      turnstileRef.current?.reset()
    } finally {
      setCashfreeLoading(false)
    }
  }

  const hasUpi = upiId && upiId.includes("@")
  const upiUrl = hasUpi
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(PAYMENT_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent(generatedCode)}`
    : ""
  const hasCustomQr = !!qrImageUrl
  const qrSrc = hasCustomQr ? qrImageUrl : (upiUrl ? `/api/qr?data=${encodeURIComponent(upiUrl)}&s=220` : "")

  const handleShowQr = () => {
    const turnstileToken = turnstileRef.current?.getToken() ?? null
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Please complete the verification below.")
      return
    }
    if (!hasCustomQr && !hasUpi) {
      setError("QR not configured. Admin: upload a QR code in Dashboard → Settings, or use Pay Now.")
      return
    }
    setError(null)
    setStage("qr")
    setShowPaidPrompt(false)
    setShowRetry(false)
  }

  const handleRetryQr = () => {
    setStage("qr")
    setShowPaidPrompt(true)
    setShowRetry(false)
    setQrTimer(120)
  }

  const handlePaidYes = () => {
    setStage("upload")
  }

  const handlePaidNo = () => {
    setError(null)
  }

  const handleScreenshotSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!screenshot) {
      setError("Please select a payment screenshot")
      return
    }
    const turnstileToken = turnstileUploadRef.current?.getToken() ?? null
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Please complete the verification below.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append("name", "Participant")
      fd.append("paymentCode", generatedCode)
      fd.append("amount", String(amount))
      fd.append("screenshot", screenshot)
      if (turnstileToken) fd.append("turnstileToken", turnstileToken)
      const res = await fetch("/api/payments/qr-request", {
        method: "POST",
        credentials: "include",
        body: fd
      })
      const j = await res.json().catch(() => ({}))
      if (!j?.ok) throw new Error(j?.error || "Failed to submit")
      setPaymentId(j.id)
      setStage("waiting")
    } catch (err: any) {
      setError(err.message ?? "Submission failed")
      turnstileUploadRef.current?.reset()
    } finally {
      setLoading(false)
    }
  }

  /* ── Error component ── */
  const ErrorMsg = ({ msg }: { msg: string | null }) => {
    if (!msg) return null
    return (
      <div className="modal-error flex items-center gap-2">
        <AlertIcon size={16} className="text-red-400 shrink-0" />
        <span>{msg}</span>
      </div>
    )
  }

  if (stage === "waiting") {
    return (
      <WaitingForApproval paymentId={paymentId} onClose={handleClose} onError={showToast} />
    )
  }

  /* ══════════════════════ QR SCAN STAGE ══════════════════════ */
  if (stage === "qr") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center blur-overlay p-3 sm:p-4" onClick={handleClose} role="dialog" aria-modal="true" aria-label="Scan to pay">
        <div ref={contentRef} className="w-full max-w-[360px] relative z-10" onClick={(e) => e.stopPropagation()}>

          <div className="modal-card-payment payment-holo-card payment-holo-glow">
            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <span className="modal-status-badge modal-status-badge-payment"><CameraIcon size={18} className="text-primary" /></span>
                  <h2 className="text-lg sm:text-xl font-bold text-white">Scan to Pay</h2>
                </div>
                <button type="button" className="modal-btn-secondary text-sm px-3 py-2" onClick={() => { setStage("form"); setError(null) }}>← Back</button>
              </div>

              {/* QR Code area */}
              <div className="rounded-xl bg-white/[0.04] border border-white/10 p-4 sm:p-5 mb-4">
                <p className="text-white/70 font-medium mb-3 text-sm text-center uppercase tracking-wider">Quiz Participation</p>
                <div className="flex justify-center">
                  {qrSrc ? (
                    <div className="relative">
                      <img src={qrSrc} alt="Scan to pay" width={200} height={200} className="rounded-lg object-contain sm:w-[220px] sm:h-[220px]" />
                      {/* Scan line animation */}
                      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
                        <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_8px_rgba(168,85,247,0.5)]" style={{ animation: "bioScanLine 3s ease-in-out infinite" }} />
                      </div>
                    </div>
                  ) : (
                    <div className="w-[200px] h-[200px] sm:w-[220px] sm:h-[220px] rounded-lg bg-white/5 flex items-center justify-center text-white/40 text-sm">No QR</div>
                  )}
                </div>
                <p className="text-white/50 text-xs sm:text-sm mt-3 text-center">Scan with your Camera or UPI app</p>

                {/* Payment code */}
                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className="text-white/60 text-xs">Code:</span>
                  <span className="font-mono font-bold text-white text-sm tracking-wider bg-white/[0.06] px-3 py-1 rounded-lg border border-white/10">{generatedCode}</span>
                  <button type="button" className="text-xs px-2 py-1 rounded-lg border border-white/15 bg-white/[0.06] text-white/70 hover:bg-white/10 hover:text-white transition-colors" onClick={async () => { try { await navigator.clipboard?.writeText(generatedCode) } catch { } }}>Copy</button>
                </div>
              </div>

              {/* Timer */}
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 bg-white/[0.04] rounded-full px-4 py-2 border border-white/8">
                  <span className="text-xl sm:text-2xl font-mono font-bold text-white">{Math.floor(qrTimer / 60)}:{(qrTimer % 60).toString().padStart(2, "0")}</span>
                  <span className="text-xs text-white/40">remaining</span>
                </div>
              </div>

              {/* Rainbow divider */}
              <div className="payment-holo-rainbow mb-4" />

              {showRetry && (
                <button type="button" className="modal-btn-secondary w-full mb-3" onClick={handleRetryQr}>⟳ Retry</button>
              )}
              {showPaidPrompt && (
                <div className="space-y-3">
                  <p className="text-sm text-white/70 text-center">Have you completed the payment?</p>
                  <div className="flex gap-2">
                    <button type="button" className="flex-1 modal-btn-primary text-sm py-3" onClick={handlePaidYes}>Yes, I&apos;ve Paid</button>
                    <button type="button" className="flex-1 modal-btn-secondary text-sm py-3" onClick={handlePaidNo}>No</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ══════════════════════ UPLOAD STAGE ══════════════════════ */
  if (stage === "upload") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center blur-overlay p-3 sm:p-4" onClick={handleClose} role="dialog" aria-modal="true" aria-label="Upload receipt">
        <div ref={contentRef} className="w-full max-w-[360px] relative z-10" onClick={(e) => e.stopPropagation()}>
          <div className="modal-card-payment payment-holo-card payment-holo-glow">
            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <span className="modal-status-badge"><FileTextIcon size={18} className="text-primary" /></span>
                <div>
                  <h2 className="text-lg font-bold text-white">Upload Receipt</h2>
                  <p className="text-xs text-white/50 mt-0.5">Admin will verify your payment to approve access.</p>
                </div>
              </div>

              {/* Payment code display */}
              <div className="mb-5 p-4 rounded-xl bg-white/[0.04] border border-white/10">
                <p className="text-[11px] text-white/40 mb-1 uppercase tracking-wider">Payment Code (for admin)</p>
                <p className="text-xl sm:text-2xl font-mono font-bold text-white tracking-widest select-all">{generatedCode}</p>
              </div>

              <form onSubmit={handleScreenshotSubmit} className="space-y-5">
                <div className="min-h-[65px] my-1 flex w-full justify-center items-center overflow-hidden rounded-xl border border-white/8 bg-white/[0.03] ring-1 ring-white/[0.04]">
                  <TurnstileWidget ref={turnstileUploadRef} theme="dark" size="normal" />
                </div>
                <label className="block">
                  <span className="form-ui-label-dark">Payment screenshot</span>
                  <div className="relative rounded-xl border border-white/12 bg-white/[0.04] px-2 py-2 transition-colors focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15">
                    <input
                      type="file"
                      accept="image/*"
                      required
                      className="block w-full text-sm text-white/90
                        file:mr-3 file:py-2.5 file:px-4 file:rounded-lg
                        file:border-0 file:bg-white/12
                        file:text-white file:text-sm file:font-semibold
                        file:cursor-pointer file:transition-colors
                        hover:file:bg-white/18"
                      onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  {screenshot && (
                    <p className="text-[11px] text-white/40 mt-1.5">Selected: {screenshot.name}</p>
                  )}
                </label>
                <ErrorMsg msg={error} />

                {/* Rainbow divider */}
                <div className="payment-holo-rainbow" />

                <div className="flex gap-2">
                  <button type="button" className="flex-1 modal-btn-secondary" onClick={() => setStage("qr")}>← Back</button>
                  <button type="submit" className="flex-1 modal-btn-neural" disabled={loading}>{loading ? "Submitting…" : "Submit Receipt"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ══════════════════════ MAIN FORM ══════════════════════ */
  const hasQrOption = hasCustomQr || hasUpi

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center blur-overlay p-3 sm:p-4 overflow-y-auto" onClick={handleClose} role="dialog" aria-modal="true" aria-label="Payment">
      <div ref={contentRef} className="w-full max-w-[360px] min-w-0 relative z-10" onClick={(e) => e.stopPropagation()}>

        <div className="rounded-2xl border border-white/10 bg-navy-950/95 backdrop-blur-2xl shadow-2xl p-6 sm:p-7">
          <div className="relative z-10 text-white">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold tracking-tight">Challenge Entry</h2>
                <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">Secure Transaction</p>
              </div>
              <button type="button" className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors" onClick={onClose} aria-label="Close"><XIcon size={18} /></button>
            </div>

            {/* Amount display */}
            <div className="text-center py-6 mb-8 border-y border-white/5">
              <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-2 font-bold">One-Time Fee</p>
              <p className="text-5xl font-black tabular-nums">₹{amount}</p>
              <p className="text-[11px] text-primary font-bold mt-2 uppercase tracking-widest">Merit Program Access</p>
            </div>

            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              {/* Phone input */}
              <div>
                <label htmlFor="payment-phone" className="form-ui-label-dark">Primary contact (optional)</label>
                <input
                  id="payment-phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(null) }}
                  className="modal-input-enhanced text-white"
                  maxLength={10}
                  autoComplete="tel"
                />
                <p className="mt-2 text-[11px] text-white/45 leading-relaxed">Leave blank if you prefer not to share a phone number.</p>
              </div>

              <ErrorMsg msg={error} />

              <div className="min-h-[65px] my-2 flex w-full justify-center items-center overflow-hidden">
                <TurnstileWidget ref={turnstileRef} theme="dark" size="normal" />
              </div>

              {/* Cashfree pay button */}
              <button
                type="button"
                onClick={handlePayWithCashfree}
                disabled={cashfreeLoading}
                className="btn-paper w-full py-4 px-6 rounded-xl disabled:opacity-50"
              >
                <img src="https://cashfree-checkoutcartimages-prod.cashfree.com/downloadb9vjla1da270_prod.png" alt="" className="w-8 h-8 shrink-0 mr-3" width={32} height={32} />
                <span className="font-bold text-base tracking-tight">{cashfreeLoading ? "Establishing Connection..." : "Pay Securely with UPI"}</span>
              </button>

              {/* QR Option */}
              {hasQrOption && (
                <div className="pt-3 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setShowQrOption(!showQrOption)}
                    className="text-xs sm:text-sm text-white/50 hover:text-purple-400 transition-colors w-full text-left flex items-center gap-1"
                  >
                    <span className="transition-transform duration-200" style={{ transform: showQrOption ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                    Other payment options
                  </button>
                  {showQrOption && (
                    <button
                      type="button"
                      onClick={handleShowQr}
                      className="mt-3 w-full modal-btn-secondary flex items-center justify-center gap-2 text-sm"
                    >
                      <CameraIcon size={16} className="text-primary" />
                      <span>Scan UPI QR</span>
                    </button>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
