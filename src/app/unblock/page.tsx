"use client"

import Navbar from "../../components/Navbar"
import { useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import TransitionLink from "../../components/TransitionLink"
import UnblockUploadForm from "../../components/UnblockUploadForm"

export default function UnblockPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const username = searchParams.get("username")?.trim() ?? ""
  const [stage, setStage] = useState<"form" | "waiting" | "unblocking">("form")
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [amount, setAmount] = useState(50)
  const [qrUrl, setQrUrl] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!username) router.replace("/intro")
  }, [username, router])

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const d = j?.data ?? {}
        setAmount(Math.max(1, Number(d.blockedAmount ?? 50)))
        setQrUrl(d.blockedQrUrl ?? "")
      })
      .catch(() => {})
  }, [])

  const handleSuccess = (id: string) => {
    setPaymentId(id)
    setStage("waiting")
  }

  useEffect(() => {
    if (stage !== "waiting" || !paymentId) return
    const poll = async () => {
      const r = await fetch(`/api/payments/status?id=${paymentId}`, { cache: "no-store" })
      const j = await r.json().catch(() => ({}))
      if (j?.status === "success") setStage("unblocking")
    }
    const t = setInterval(poll, 1500)
    poll()
    return () => clearInterval(t)
  }, [stage, paymentId])

  useEffect(() => {
    if (stage !== "unblocking" || !username) return
    const pollBlocked = async () => {
      const r = await fetch(`/api/auth/blocked-status?username=${encodeURIComponent(username)}`, { cache: "no-store" })
      const j = await r.json().catch(() => ({}))
      if (j?.ok && !j?.blocked) router.replace("/intro?msg=unblocked")
    }
    const t = setInterval(pollBlocked, 400)
    pollBlocked()
    return () => clearInterval(t)
  }, [stage, username, router])

  if (!username) return null

  if (stage === "unblocking") {
    return (
      <main className="min-h-screen app-page-surface">
        <Navbar />
        <section className="mx-auto max-w-md px-4 py-12">
          <div className="card p-8 text-center">
            <div className="relative mx-auto w-16 h-16 mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-primary/30" />
              <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <div className="absolute inset-2 rounded-full bg-primary/10 animate-pulse" />
            </div>
            <div className="font-semibold text-lg">Removing you from blocked list…</div>
            <p className="mt-2 text-sm text-navy-300">Almost there! Your account is being unblocked.</p>
          </div>
        </section>
      </main>
    )
  }

  if (stage === "waiting") {
    return (
      <main className="min-h-screen app-page-surface">
        <Navbar />
        <section className="mx-auto max-w-md px-4 py-12">
          <div className="card p-8 text-center">
            <div className="inline-flex h-14 w-14 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
            <div className="font-semibold text-lg">Awaiting approval</div>
            <p className="mt-2 text-sm text-navy-300">Admin will verify your payment and unblock your account shortly.</p>
            <TransitionLink href="/intro" className="mt-6 inline-block pill bg-navy-700">Back to login</TransitionLink>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen app-page-surface">
      <Navbar />
      <section className="mx-auto max-w-md px-4 py-8 sm:py-12">
        <div className="rounded-2xl border border-white/10 bg-navy-950/50 backdrop-blur-md p-6 sm:p-8 shadow-2xl">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-2">Account recovery</div>
          <h1 className="text-xl font-bold text-white tracking-tight">Pay ₹{amount} to unblock</h1>
          <p className="mt-2 text-sm text-navy-300 leading-relaxed">
            Account <span className="font-mono text-white/90">@{username}</span> is blocked. Submit payment proof below.
          </p>
          <div className="mt-8 pt-6 border-t border-white/10">
            <UnblockUploadForm
              username={username}
              amount={amount}
              qrUrl={qrUrl || undefined}
              onSuccess={handleSuccess}
              onError={(msg) => setError(msg)}
            />
          </div>
          {error && <div className="mt-4 text-sm font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2.5">{error}</div>}
          <p className="mt-5 text-xs text-navy-400 leading-relaxed">
            Enter UTR, transaction ID, or order ID, or upload a screenshot. Each reference can only be used once.
          </p>
        </div>
        <TransitionLink href="/intro" className="mt-6 inline-flex text-sm font-semibold text-navy-400 hover:text-primary transition-colors">
          ← Back to login
        </TransitionLink>
      </section>
    </main>
  )
}
