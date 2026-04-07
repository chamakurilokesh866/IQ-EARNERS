"use client"

import { useEffect, useMemo, useState } from "react"
import ProgressBar from "./ProgressBar"
import PaymentModal from "./PaymentModal"
import TransitionLink from "./TransitionLink"
import { usePaidStatus } from "@/hooks/usePaidStatus"

export default function JoinCard() {
  const [t, setT] = useState<{ id?: string; prizePool?: string; enrolled?: number; capacity?: number } | null>(null)
  const [settings, setSettings] = useState<{ currency: string; entryFee: number } | null>(null)
  const { paid, loading } = usePaidStatus()

  useEffect(() => {
    fetch("/api/tournaments", { cache: "no-store" }).then((r) => r.json()).then((j) => {
      const last = Array.isArray(j?.data) && j.data.length ? j.data[j.data.length - 1] : null
      setT(last)
    }).catch(() => setT(null))
    fetch("/api/settings", { cache: "no-store" }).then((r) => r.json()).then((j) => setSettings(j.data ?? null)).catch(() => setSettings(null))
  }, [])
  const percentage = useMemo(() => {
    if (!t || !t.capacity) return 0
    const filled = Number(t.enrolled ?? 0)
    return Math.min(100, Math.round((filled / Number(t.capacity)) * 100))
  }, [t])
  const enroll = async () => {
    if (!t?.id) return
    await fetch("/api/tournaments/enroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: t.id }) })
    const j = await fetch("/api/tournaments", { cache: "no-store" }).then((r) => r.json())
    const last = Array.isArray(j?.data) && j.data.length ? j.data[j.data.length - 1] : null
    setT(last)
  }
  const [showPay, setShowPay] = useState(false)
  return (
    <div className="card p-6">
      <div className="font-semibold">Join Tournament</div>
      {t ? (
        <>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-navy-300">Entry Fee</span>
              <span className="font-semibold">{settings ? `₹${settings.entryFee}` : "₹100"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-navy-300">Total Prize Pool</span>
              <span className="font-semibold">{t.prizePool ?? "₹0"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-navy-300">Tournament Capacity</span>
              <span className="font-semibold">{Number(t.enrolled ?? 0).toLocaleString()} / {Number(t.capacity ?? 0).toLocaleString()}</span>
            </div>
            <ProgressBar value={percentage} />
            <div className="text-xs text-navy-300">{percentage}% spots filled</div>
          </div>
          {loading ? (
            <div className="mt-5 h-10 rounded-lg bg-white/5 animate-pulse" />
          ) : !paid ? (
            <TransitionLink href="/intro" className="mt-5 block w-full rounded-lg bg-accent px-4 py-2 font-semibold text-black text-center" aria-label="Log in to enroll">
              {settings ? `Pay ₹${settings.entryFee} & Enroll` : "Pay ₹100 & Enroll"}
            </TransitionLink>
          ) : (
            <div className="mt-5 flex items-center justify-between">
              <span className="pill bg-success text-black">Enrolled</span>
              <a href="/tournaments" className="pill bg-navy-700">Go to Tournaments</a>
            </div>
          )}
          {showPay && <PaymentModal amount={settings?.entryFee ?? 100} onSuccess={enroll} onClose={() => setShowPay(false)} />}
        </>
      ) : (
        <div className="mt-3 text-sm text-navy-300">No active tournament</div>
      )}
    </div>
  )
}
