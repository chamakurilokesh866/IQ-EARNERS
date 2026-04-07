"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

type ReceiptPayment = {
  id: string
  amount: number
  status: string
  gateway?: string
  type?: string
  meta: Record<string, unknown>
  created_at: number
  profileId?: string
}

export default function PaymentReceiptPage() {
  const params = useSearchParams()
  const paymentId = params.get("id") ?? ""
  const [payment, setPayment] = useState<ReceiptPayment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!paymentId) {
      setError("No payment ID provided")
      setLoading(false)
      return
    }
    fetch(`/api/payments/status?id=${encodeURIComponent(paymentId)}&detail=1`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { ok?: boolean; data?: ReceiptPayment; error?: string }) => {
        if (j.ok && j.data && typeof j.data.id === "string") {
          const d = j.data
          setPayment({
            ...d,
            meta: d.meta && typeof d.meta === "object" && !Array.isArray(d.meta) ? (d.meta as Record<string, unknown>) : {}
          })
        } else {
          setError(j.error || "Payment not found")
        }
      })
      .catch(() => setError("Failed to load payment details"))
      .finally(() => setLoading(false))
  }, [paymentId])

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center app-page-surface">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  if (error || !payment) {
    return (
      <main className="min-h-screen flex items-center justify-center app-page-surface p-6">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-6">❌</div>
          <h1 className="text-2xl font-black text-white mb-2">Payment Not Found</h1>
          <p className="text-white/40 mb-8">{error}</p>
          <Link href="/intro" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 text-black font-bold text-sm hover:bg-cyan-400 transition-all">
            Go to Home
          </Link>
        </div>
      </main>
    )
  }

  const isApproved = payment.status === "success"
  const isDenied = payment.status === "denied"
  const isPending = payment.status === "pending_approval" || payment.status === "pending"
  const meta = payment.meta
  const denyReason = typeof meta.deny_reason === "string" ? meta.deny_reason : ""

  return (
    <main className="min-h-screen flex items-center justify-center app-page-surface p-6">
      <div className="max-w-lg w-full">
        <div className="rounded-3xl bg-white/[0.03] border border-white/10 overflow-hidden shadow-2xl">
          <div className={`px-8 pt-10 pb-6 text-center ${isApproved ? "bg-emerald-500/10" : isDenied ? "bg-red-500/10" : "bg-amber-500/10"}`}>
            <div className="text-6xl mb-4">
              {isApproved ? "✅" : isDenied ? "❌" : "⏳"}
            </div>
            <h1 className="text-2xl font-black text-white">
              {isApproved ? "Payment Approved" : isDenied ? "Payment Denied" : "Payment Pending"}
            </h1>
            <p className="text-sm text-white/50 mt-2">
              {isApproved
                ? "Your payment has been verified and approved."
                : isDenied
                  ? "Your payment was declined by the admin."
                  : "Your payment is being reviewed by the admin."}
            </p>
          </div>

          <div className="p-8 space-y-6">
            <div className="flex justify-between items-center py-3 border-b border-white/5">
              <span className="text-white/40 text-sm font-bold uppercase tracking-widest">Amount</span>
              <span className="text-2xl font-black text-white">₹{payment.amount ?? 0}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-white/30 text-[10px] uppercase tracking-widest block mb-1">Payment ID</span>
                <span className="text-white/70 font-mono text-xs">{payment.id}</span>
              </div>
              <div>
                <span className="text-white/30 text-[10px] uppercase tracking-widest block mb-1">Gateway</span>
                <span className="text-white/70 font-bold">{payment.gateway || "Manual"}</span>
              </div>
              <div>
                <span className="text-white/30 text-[10px] uppercase tracking-widest block mb-1">Status</span>
                <span className={`font-bold ${isApproved ? "text-emerald-400" : isDenied ? "text-red-400" : "text-amber-400"}`}>
                  {String(payment.status || "").replace(/_/g, " ").toUpperCase()}
                </span>
              </div>
              <div>
                <span className="text-white/30 text-[10px] uppercase tracking-widest block mb-1">Date</span>
                <span className="text-white/70">{new Date(payment.created_at || Date.now()).toLocaleDateString()}</span>
              </div>
            </div>

            {denyReason ? (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
                <span className="text-red-400 text-xs font-bold">Reason: </span>
                <span className="text-red-300 text-sm">{denyReason}</span>
              </div>
            ) : null}

            <div className="pt-4 space-y-3">
              {isApproved && !payment.profileId && (
                <Link
                  href="/intro?login=1"
                  className="block w-full text-center py-4 rounded-2xl bg-cyan-500 text-black font-black text-sm hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20"
                >
                  Create Your Account →
                </Link>
              )}
              {isApproved && payment.profileId && (
                <Link
                  href="/intro?login=1"
                  className="block w-full text-center py-4 rounded-2xl bg-cyan-500 text-black font-black text-sm hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20"
                >
                  Log In to Your Account →
                </Link>
              )}
              {isPending && (
                <div className="text-center py-4 text-white/40 text-sm">
                  Your payment is being reviewed. You will be notified once approved.
                </div>
              )}
              {isDenied && (
                <Link
                  href="/intro"
                  className="block w-full text-center py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-all"
                >
                  Try Again
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
