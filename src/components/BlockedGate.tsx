"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import dynamic from "next/dynamic"
import { useBootstrap } from "@/hooks/useBootstrap"
import { useToast } from "@/context/ToastContext"
import { performLogout } from "@/lib/logout"
import { clearBlockedCookies } from "@/lib/clearUserData"
const UnblockUploadForm = dynamic(() => import("./UnblockUploadForm"), { ssr: false })
const UnblockCongrats = dynamic(() => import("./UnblockCongrats"), { ssr: false })
const UnblockCashfreePay = dynamic(() => import("./UnblockCashfreePay"), { ssr: false })

const PUBLIC_PATHS = ["/more/join", "/more/terms", "/more/privacy", "/more/rules", "/more/grievance", "/more/refund", "/more/disclaimer", "/more/cookie-policy", "/more/admin-login"]

function getBlockedFromCookie(): { username: string } | null {
  if (typeof document === "undefined") return null
  const key = document.cookie.match(/blocked=([^;]*)/)
  const user = document.cookie.match(/blocked_username=([^;]*)/)
  if (key?.[1] === "B" && user?.[1]) {
    try {
      return { username: decodeURIComponent(user[1].trim()) }
    } catch {}
  }
  return null
}

export default function BlockedGate() {
  const pathname = usePathname()
  const { showToast } = useToast()
  const { data: bootstrap } = useBootstrap()
  const [blocked, setBlocked] = useState<{ reason: string; username: string } | null>(null)
  const [checked, setChecked] = useState(false)
  const [payStep, setPayStep] = useState<"main" | "scanner" | "upload" | "awaiting" | "unblocking" | "congrats">("main")
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [unblockAmount, setUnblockAmount] = useState(50)
  const [unblockQrUrl, setUnblockQrUrl] = useState("")
  const [uploadError, setUploadError] = useState<string | null>(null)

  const runCheck = () => {
    const fromCookie = getBlockedFromCookie()
    if (fromCookie) {
      setBlocked({ reason: "Your account has been blocked. Pay ₹50 to unblock.", username: fromCookie.username })
      setChecked(true)
      return
    }
    if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) || pathname === "/unblock" || pathname === "/blocked") {
      setChecked(true)
      return
    }
    setChecked(true)
    if (bootstrap && (bootstrap.blocked || bootstrap.blockKey === "B") && bootstrap.blockUsername) {
      setBlocked({
        reason: bootstrap.blockReason || "Your account has been blocked.",
        username: bootstrap.blockUsername
      })
    }
  }

  useEffect(() => {
    runCheck()
    const onBlockedCookieSet = () => {
      const fromCookie = getBlockedFromCookie()
      if (fromCookie) {
        setBlocked({ reason: "Your account has been blocked. Pay ₹50 to unblock.", username: fromCookie.username })
        setChecked(true)
      }
    }
    window.addEventListener("blocked-cookie-set", onBlockedCookieSet)
    return () => window.removeEventListener("blocked-cookie-set", onBlockedCookieSet)
  }, [pathname, bootstrap])

  useEffect(() => {
    if (blocked) {
      fetch("/api/settings", { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => {
          const d = j?.data ?? {}
          setUnblockAmount(Math.max(1, Number(d.blockedAmount ?? 50)))
          setUnblockQrUrl(d.blockedQrUrl ?? "")
        })
        .catch(() => showToast("Could not load unblock settings"))
    }
  }, [blocked, showToast])

  useEffect(() => {
    if (payStep !== "awaiting" || !paymentId) return
    const poll = async () => {
      const r = await fetch(`/api/payments/status?id=${paymentId}`, { cache: "no-store" })
      const j = await r.json().catch(() => ({}))
      if (j?.status === "success") setPayStep("unblocking")
    }
    const t = setInterval(poll, 1500)
    poll()
    return () => clearInterval(t)
  }, [payStep, paymentId])

  useEffect(() => {
    if (payStep !== "unblocking" || !blocked?.username) return
    const pollBlocked = async () => {
      const r = await fetch(`/api/auth/blocked-status?username=${encodeURIComponent(blocked.username)}`, { cache: "no-store" })
      const j = await r.json().catch(() => ({}))
      if (j?.ok && !j?.blocked) setPayStep("congrats")
    }
    const t = setInterval(pollBlocked, 400)
    pollBlocked()
    return () => clearInterval(t)
  }, [payStep, blocked?.username])

  const handleLogout = () => {
    clearBlockedCookies()
    performLogout()
  }

  const handlePaidNo = () => {
    clearBlockedCookies()
    performLogout()
  }

  if (!checked || !blocked) return null

  const paperClass = "w-full max-w-md bg-[#0a0618]/90 backdrop-blur-2xl text-white rounded-[2rem] border border-white/10 p-6 sm:p-10 animate-pop relative overflow-hidden shadow-2xl"
  const paperHeader = "absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-white/20 via-white/40 to-white/20"

  return (
    <div className="fixed inset-0 z-[150] flex flex-col items-center justify-start sm:justify-center bg-black/95 backdrop-blur-md p-4 overflow-y-auto pt-12 pb-20 sm:py-8">
      <div className={paperClass}>
        <div className={paperHeader} />
        {payStep === "congrats" && blocked.username ? (
          <UnblockCongrats
            username={blocked.username}
            onContinue={() => { clearBlockedCookies(); window.location.replace("/intro") }}
          />
        ) : payStep === "unblocking" ? (
          <div className="text-center">
            <div className="relative mx-auto w-16 h-16 mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-300" />
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              <div className="absolute inset-2 rounded-full bg-emerald-100 animate-pulse" />
            </div>
            <div className="text-xl font-bold text-emerald-700">Removing you from blocked list…</div>
            <p className="mt-3 text-sm text-white/70">Almost there! Your account is being unblocked.</p>
          </div>
        ) : payStep === "awaiting" ? (
          <div className="text-center">
            <div className="inline-flex h-12 w-12 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto mb-4" />
            <div className="text-xl font-bold text-emerald-700">Awaiting approval</div>
            <p className="mt-3 text-sm text-white/70">Admin will verify your payment and unblock your account shortly.</p>
            <p className="mt-1 text-xs text-white/60">Screenshot and extracted details have been sent. Checking for approval…</p>
            <button type="button" onClick={handleLogout} className="mt-6 w-full rounded-xl bg-white/10 border border-white/10 text-white px-6 py-3 font-medium hover:bg-white/15 transition-colors">
              Log out
            </button>
          </div>
        ) : payStep === "upload" && blocked.username ? (
          <div className="text-left">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-bold text-white">Upload payment proof</div>
              <button type="button" className="text-sm text-white/60 hover:text-white" onClick={() => { setPayStep("scanner"); setUploadError(null) }}>← Back</button>
            </div>
            <UnblockUploadForm
              username={blocked.username}
              amount={unblockAmount}
              qrUrl={unblockQrUrl || undefined}
              onSuccess={(id) => { setPaymentId(id); setPayStep("awaiting") }}
              onError={(msg) => setUploadError(msg)}
              lightBg
            />
            {uploadError && <div className="mt-3 text-sm text-amber-600">{uploadError}</div>}
            <button type="button" onClick={handleLogout} className="mt-4 w-full rounded-xl bg-white/10 border border-white/10 text-white px-6 py-3 font-medium hover:bg-white/15 transition-colors">
              Log out
            </button>
          </div>
        ) : payStep === "scanner" ? (
          <div className="text-center space-y-6">
            <div className="text-2xl font-bold text-white">Scan & Pay ₹{unblockAmount}</div>
            <div className="relative mx-auto w-48 h-48 rounded-xl overflow-hidden bg-white border-2 border-amber-200/80 shadow-inner">
              {unblockQrUrl ? (
                <img src={unblockQrUrl} alt="Pay QR" className="w-full h-full object-contain p-2" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/50 text-sm">QR not set</div>
              )}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute left-0 right-0 h-1 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(34,197,94,0.6)] animate-unblock-scan" />
              </div>
            </div>
            <p className="text-sm text-white/70">Have you completed the payment?</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setPayStep("upload")} className="flex-1 rounded-xl bg-emerald-600 text-white px-6 py-3 font-semibold hover:bg-emerald-500 transition-colors">
                Yes, I&apos;ve paid
              </button>
              <button type="button" onClick={handlePaidNo} className="flex-1 rounded-xl bg-white/10 text-white px-6 py-3 font-medium hover:bg-white/15 transition-colors">
                No
              </button>
            </div>
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <div className="w-full border-t border-white/15" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wider">
                <span className="bg-[#0a0618]/90 px-3 text-white/50">or</span>
              </div>
            </div>
            {blocked.username ? (
              <UnblockCashfreePay
                username={blocked.username}
                amount={unblockAmount}
                onPaymentSuccess={() => setPayStep("unblocking")}
              />
            ) : null}
            <button type="button" onClick={() => setPayStep("main")} className="text-sm text-white/60 hover:text-white">
              ← Back
            </button>
          </div>
        ) : (
          <div className="text-center space-y-5">
            <div className="text-5xl">⚠️</div>
            <div className="text-2xl font-bold text-amber-700">Account Blocked</div>
            <p className="text-white/80">{blocked.reason}</p>
            <p className="text-sm text-white/60">Pay ₹{unblockAmount} to IQ Earners to get unblocked and regain access.</p>
            <div className="flex flex-col gap-3">
              {blocked.username ? (
                <UnblockCashfreePay
                  username={blocked.username}
                  amount={unblockAmount}
                  onPaymentSuccess={() => setPayStep("unblocking")}
                />
              ) : null}
              <button type="button" onClick={() => setPayStep("scanner")} className="w-full rounded-xl bg-amber-500 text-navy-900 px-6 py-3 font-semibold hover:bg-amber-400 transition-colors">
                Pay with QR / proof
              </button>
              <button type="button" onClick={handleLogout} className="w-full rounded-xl bg-white/10 text-white px-6 py-3 font-medium hover:bg-white/15 transition-colors">
                Log out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
