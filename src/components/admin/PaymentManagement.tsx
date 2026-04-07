"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { XIcon, CheckIcon, AlertIcon, RefreshIcon } from "../AnimatedIcons"
import { triggerHapticImpact } from "@/lib/haptics"
import { fetchAdminPendingPayments, type AdminPendingPaymentRow } from "@/lib/admin/client"

function metaString(meta: Record<string, unknown> | undefined, key: string): string {
  const v = meta?.[key]
  return typeof v === "string" ? v : ""
}

type AdminPendingPayment = AdminPendingPaymentRow

export function PendingPayments({ onPendingChange }: { onPendingChange?: () => void }) {
  const [pending, setPending] = useState<AdminPendingPayment[]>([])
  const [loading, setLoading] = useState(false)
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; amount?: number; id: string } | null>(null)
  const [showNotifyBtn, setShowNotifyBtn] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const prevCountRef = useRef(-1)
  const lastProcessedIdRef = useRef<string | null>(null)

  useEffect(() => {
    setShowNotifyBtn(typeof window !== "undefined" && "Notification" in window && Notification.permission === "default")
    const savedSound = localStorage.getItem("admin_payment_sound") === "true"
    setSoundEnabled(savedSound)
  }, [])

  const playChime = () => {
    if (!soundEnabled) return
    try {
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/221/221-preview.mp3")
      audio.volume = 0.5
      audio.play().catch(() => {})
    } catch {}
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAdminPendingPayments()
      if (prevCountRef.current !== -1 && data.length > prevCountRef.current) {
        const newest = data[0]
        if (newest && newest.id !== lastProcessedIdRef.current) {
          lastProcessedIdRef.current = newest.id
          playChime()
        }
      }
      setPending(data)
      prevCountRef.current = data.length
    } finally {
      setLoading(false)
      onPendingChange?.()
    }
  }, [onPendingChange, soundEnabled])

  useEffect(() => {
    load()
    const int = setInterval(load, 5000)
    return () => clearInterval(int)
  }, [load])

  useEffect(() => {
    let es: EventSource | null = null
    let reconnectTimeout: any = null
    const connect = () => {
      try {
        es = new EventSource("/api/admin/payments/stream", { withCredentials: true })
        es.onmessage = (e) => {
          try {
            const j = JSON.parse(e.data || "{}")
            const data = (Array.isArray(j?.data) ? j.data : []) as AdminPendingPayment[]
            const prev = prevCountRef.current
            if (prev >= 0 && data.length > prev) {
              const newest = data[0]
              if (newest && newest.id !== lastProcessedIdRef.current) {
                lastProcessedIdRef.current = newest.id
                setToast({ msg: "NEW MANUAL REQUEST", amount: newest.amount, id: newest.id })
                playChime()
                if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                  new Notification("💰 New Payment Request", {
                    body: `₹${newest.amount} · Manual QR Approval Required`,
                    tag: "payment-" + newest.id
                  })
                }
              }
            }
            setPending(data)
            prevCountRef.current = data.length
          } catch {}
        }
        es.onerror = () => {
          es?.close()
          reconnectTimeout = setTimeout(connect, 3000)
        }
      } catch {}
    }
    connect()
    return () => {
      es?.close()
      clearTimeout(reconnectTimeout)
    }
  }, [soundEnabled])

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [denyReasonId, setDenyReasonId] = useState<string | null>(null)
  const [denyReason, setDenyReason] = useState("")

  const approve = async (id: string) => {
    const original = [...pending]
    setPending((prev) => prev.filter((p) => p.id !== id))
    if (toast?.id === id) setToast(null)
    try {
      const r = await fetch(`/api/admin/payments/${id}/approve`, { method: "POST", credentials: "include" })
      if (!r.ok) throw new Error()
      try { void triggerHapticImpact("medium") } catch {}
    } catch {
      setPending(original)
      alert("Failed to approve payment.")
    }
  }

  const deny = async (id: string, reason?: string) => {
    const original = [...pending]
    setPending((prev) => prev.filter((p) => p.id !== id))
    if (toast?.id === id) setToast(null)
    setDenyReasonId(null)
    setDenyReason("")
    try {
      const r = await fetch(`/api/admin/payments/${id}/deny`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || undefined })
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        const msg = typeof j?.error === "string" ? j.error : r.status === 400 ? "This payment is no longer pending approval." : "Deny failed."
        alert(msg)
        throw new Error(msg)
      }
    } catch {
      setPending(original)
    }
  }

  const verifyUtr = async (id: string) => {
    setVerifyingId(id)
    try {
      const r = await fetch(`/api/admin/payments/${id}/verify-utr`, { method: "POST", credentials: "include" })
      const j = await r.json().catch(() => ({}))
      if (r.ok && j?.ok) {
        setPending((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  meta: {
                    ...(p.meta && typeof p.meta === "object" ? p.meta : {}),
                    bankMatched: j.bankMatched,
                    bankVerifyError: j.bankVerifyError,
                    bankTxTime: j.bankTxTime
                  }
                }
              : p
          )
        )
      }
    } finally {
      setVerifyingId(null)
    }
  }

  const toggleSound = () => {
    const next = !soundEnabled
    setSoundEnabled(next)
    localStorage.setItem("admin_payment_sound", String(next))
  }

  return (
    <div className="admin-card bg-[#0a0c12] border-primary/30 p-0 overflow-hidden relative min-h-[300px]">
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -50, x: "-50%" }}
            className="fixed top-4 left-1/2 z-[200] w-[90%] max-w-sm"
          >
            <div className="bg-primary rounded-2xl p-4 shadow-[0_0_50px_rgba(46,254,255,0.4)] flex items-center justify-between gap-4 border-2 border-white/20 text-black">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-primary animate-pulse text-xl">💰</div>
                <div>
                  <div className="text-[10px] font-black text-black/60 uppercase">Incoming Request</div>
                  <div className="font-black text-black text-lg">₹{toast.amount}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => approve(toast.id)} className="bg-black text-primary px-4 py-2 rounded-xl text-xs font-black hover:scale-105 transition-transform">APPROVE</button>
                <button onClick={() => setToast(null)} className="text-black/40 hover:text-black focus:outline-none"><XIcon size={20} /></button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white/5 p-6 border-b border-white/5 flex items-center justify-between">
        <div>
          <h3 className="font-black text-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Live Approvals
          </h3>
          <p className="text-xs text-white/40 font-bold mt-1 uppercase tracking-widest">Awaiting Manual Verification</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleSound} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${soundEnabled ? "bg-primary text-black" : "bg-white/5 text-white/40"}`}>
            {soundEnabled ? "🔊" : "🔇"}
          </button>
          <button type="button" className="admin-btn admin-btn-ghost h-10 px-4" onClick={load} disabled={loading}>
            {loading ? <RefreshIcon className="animate-spin" size={16} /> : "Refresh"}
          </button>
        </div>
      </div>

      <div className="p-6">
        <AnimatePresence mode="popLayout">
          {pending.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center text-white/20 font-bold uppercase tracking-widest text-sm">No pending requests</motion.div>
          ) : (
            <div className="space-y-4">
              {pending.map((p) => (
                <motion.div layout key={p.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, x: 20 }} className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden hover:border-primary/20 transition-all group">
                  <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-xl group-hover:bg-primary/20 transition-colors shrink-0">{p.gateway === "qr" ? "📸" : "💳"}</div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-white text-lg">₹{p.amount}</span>
                          <span className="text-[10px] font-black bg-white/5 text-white/40 px-2 py-0.5 rounded-md uppercase tracking-wider">{p.gateway || "manual"}</span>
                          <span className="text-[10px] font-black bg-primary/10 text-primary/70 px-2 py-0.5 rounded-md uppercase tracking-wider">{p.type || "entry"}</span>
                        </div>
                        <div className="text-xs text-white/40 font-bold mt-0.5 truncate">{metaString(p.meta, "name") || "Member"} · Code: {metaString(p.meta, "paymentKey") || p.id}</div>
                        <div className="text-[10px] text-white/20 mt-0.5">{new Date(p.created_at || Date.now()).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                      <button onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} className="text-[10px] font-black text-white/30 hover:text-white uppercase tracking-widest px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">{expandedId === p.id ? "Hide" : "Details"}</button>
                      {metaString(p.meta, "screenshotUrl") ? (
                        <a href={metaString(p.meta, "screenshotUrl")} target="_blank" rel="noreferrer" className="text-[10px] font-black text-primary/60 hover:text-primary uppercase tracking-widest px-3 py-2">
                          Proof
                        </a>
                      ) : null}
                      <button onClick={() => approve(p.id)} className="flex-1 sm:flex-none h-11 px-5 rounded-xl bg-emerald-500 text-black font-black text-xs hover:bg-emerald-400 active:scale-95 transition-all">APPROVE</button>
                      <button onClick={() => setDenyReasonId(denyReasonId === p.id ? null : p.id)} className="w-11 h-11 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-black transition-all"><XIcon size={18} /></button>
                    </div>
                  </div>
                  {expandedId === p.id && (
                    <div className="px-5 pb-5 border-t border-white/5 pt-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                        <div><span className="text-white/30 block text-[10px] uppercase tracking-widest mb-1">Payment ID</span><span className="text-white/70 font-mono">{p.id}</span></div>
                        <div><span className="text-white/30 block text-[10px] uppercase tracking-widest mb-1">User</span><span className="text-white/70 font-bold">{metaString(p.meta, "name") || "Unknown"}</span></div>
                        <div><span className="text-white/30 block text-[10px] uppercase tracking-widest mb-1">Code</span><span className="text-white/70 font-mono">{metaString(p.meta, "paymentKey") || "—"}</span></div>
                        {metaString(p.meta, "upiMasked") ? (
                          <div><span className="text-white/30 block text-[10px] uppercase tracking-widest mb-1">UPI</span><span className="text-white/70">{metaString(p.meta, "upiMasked")}</span></div>
                        ) : null}
                        {metaString(p.meta, "cardLast4") ? (
                          <div><span className="text-white/30 block text-[10px] uppercase tracking-widest mb-1">Card</span><span className="text-white/70">****{metaString(p.meta, "cardLast4")}</span></div>
                        ) : null}
                      </div>
                      {metaString(p.meta, "screenshotUrl") ? (
                        <div className="mt-4">
                          <span className="text-white/30 block text-[10px] uppercase tracking-widest mb-2">Payment Screenshot</span>
                          <a href={metaString(p.meta, "screenshotUrl")} target="_blank" rel="noreferrer">
                            <img src={metaString(p.meta, "screenshotUrl")} alt="Payment proof" className="max-w-[280px] rounded-xl border border-white/10 hover:border-primary/40 transition-colors" />
                          </a>
                        </div>
                      ) : null}
                    </div>
                  )}
                  {denyReasonId === p.id && (
                    <div className="px-5 pb-5 border-t border-white/5 pt-4">
                      <div className="flex gap-2">
                        <input
                          value={denyReason}
                          onChange={(e) => setDenyReason(e.target.value)}
                          placeholder="Reason for denial (optional)..."
                          className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-xs text-white placeholder:text-white/20 focus:border-red-500/50 outline-none"
                        />
                        <button onClick={() => deny(p.id, denyReason)} className="h-10 px-5 rounded-xl bg-red-500 text-white font-black text-xs hover:bg-red-400 active:scale-95 transition-all">DENY</button>
                        <button onClick={() => { setDenyReasonId(null); setDenyReason("") }} className="h-10 px-3 rounded-xl bg-white/5 text-white/40 text-xs hover:bg-white/10">Cancel</button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export function WalletWithdrawalCard() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [actioningId, setActioningId] = useState<string | null>(null)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch("/api/admin/payments/withdrawals", { cache: "no-store", credentials: "include" })
      const j = await r.json().catch(() => ({ data: [] }))
      setItems(Array.isArray(j?.data) ? j.data : [])
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  const handleAction = async (id: string, action: "payout" | "reject") => {
    setActioningId(id)
    try {
      const r = await fetch(`/api/admin/payments/withdrawals/${id}/${action}`, { method: "POST", credentials: "include" })
      if (r.ok) {
        setItems(prev => prev.filter(x => x.id !== id))
        try { void triggerHapticImpact("light") } catch {}
      }
    } finally { setActioningId(null) }
  }
  return (
    <div className="admin-card bg-[#0a0c12] p-0 overflow-hidden">
      <div className="bg-white/5 p-6 border-b border-white/5 flex items-center justify-between">
        <div>
          <h3 className="font-black text-xl flex items-center gap-2">💸 Withdrawal Requests</h3>
          <p className="text-xs text-white/40 font-bold mt-1 uppercase tracking-widest">Pending Payouts</p>
        </div>
        <button className="admin-btn admin-btn-ghost h-10 px-4" onClick={load} disabled={loading}>Refresh</button>
      </div>
      <div className="p-6">
        {items.length === 0 ? (
          <div className="py-8 text-center text-white/20 font-bold uppercase text-xs">No pending withdrawals</div>
        ) : (
          <div className="space-y-4">
            {items.map(p => (
              <div key={p.id} className="rounded-2xl bg-white/[0.03] border border-white/5 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold">₹</div>
                  <div>
                    <div className="font-black text-white text-lg">₹{p.amount}</div>
                    <div className="text-xs text-white/40 font-bold">{p.username} · {p.upiId || "No UPI Provided"}</div>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={() => handleAction(p.id, "payout")} disabled={actioningId === p.id} className="flex-1 sm:flex-none h-11 px-6 rounded-xl bg-white text-black font-black text-xs hover:bg-emerald-400">PAID</button>
                  <button onClick={() => handleAction(p.id, "reject")} disabled={actioningId === p.id} className="h-11 px-4 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 font-bold text-xs uppercase">Deny</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function CashfreeSettingsCard() {
  const [data, setData] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const load = useCallback(async () => {
    const r = await fetch("/api/settings", { cache: "no-store" })
    const j = await r.json()
    setData(j.data)
  }, [])
  useEffect(() => { load() }, [load])
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const formData = new FormData(e.target as HTMLFormElement)
    const payload: Record<string, unknown> = {}; formData.forEach((v, k) => { payload[k] = v })
    try { await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), credentials: "include" }) }
    finally { setSaving(false) }
  }
  if (!data) return null
  const inputCls =
    "w-full rounded-xl bg-white/[0.06] border border-white/12 px-4 py-3.5 text-sm text-white placeholder:text-white/35 outline-none transition-all focus:border-primary/55 focus:ring-2 focus:ring-primary/15 hover:border-white/18"
  return (
    <div className="admin-card bg-[#0a0c12] p-6">
      <div className="font-black text-xl mb-6">🔗 Payment Gateway (Cashfree)</div>
      <form onSubmit={save} className="space-y-6 text-white">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="form-ui-label-dark text-white/50">App ID</label>
            <input name="cashfreeAppId" defaultValue={data.cashfreeAppId} className={inputCls} />
          </div>
          <div className="space-y-2">
            <label className="form-ui-label-dark text-white/50">Secret Key</label>
            <input name="cashfreeSecretKey" type="password" defaultValue={data.cashfreeSecretKey} className={inputCls} />
          </div>
        </div>
        <button type="submit" disabled={saving} className="admin-btn admin-btn-primary w-full py-4 text-sm font-black uppercase tracking-widest">{saving ? "Saving..." : "Update Gateway Credentials"}</button>
      </form>
    </div>
  )
}

export function QrUploadCard() {
  const [data, setData] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const load = useCallback(async () => {
    const r = await fetch("/api/settings", { cache: "no-store" })
    const j = await r.json()
    setData(j.data)
  }, [])
  useEffect(() => { load() }, [load])
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const formData = new FormData(e.target as HTMLFormElement)
    const payload: Record<string, unknown> = {}; formData.forEach((v, k) => { payload[k] = v })
    try { await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), credentials: "include" }) }
    finally { setSaving(false) }
  }
  if (!data) return null
  const inputCls =
    "w-full rounded-xl bg-white/[0.06] border border-white/12 px-4 py-3.5 text-sm text-white placeholder:text-white/35 outline-none transition-all focus:border-primary/55 focus:ring-2 focus:ring-primary/15 hover:border-white/18"
  return (
    <div className="admin-card bg-[#0a0c12] p-6">
      <div className="font-black text-xl mb-6">📸 Manual QR Setup</div>
      <form onSubmit={save} className="space-y-6">
        <div className="space-y-2">
          <label className="form-ui-label-dark text-white/50">Platform UPI ID</label>
          <input name="upiId" defaultValue={data.upiId} placeholder="merchant@upi" className={inputCls} />
        </div>
        <button type="submit" disabled={saving} className="admin-btn admin-btn-primary w-full py-4 text-xs font-black uppercase tracking-widest">{saving ? "Saving..." : "Save UPI Settings"}</button>
      </form>
    </div>
  )
}

export function EntryFeeCard() {
  const [data, setData] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const load = useCallback(async () => {
    const r = await fetch("/api/settings", { cache: "no-store" })
    const j = await r.json()
    setData(j.data)
  }, [])
  useEffect(() => { load() }, [load])
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const formData = new FormData(e.target as HTMLFormElement)
    const payload: Record<string, unknown> = {}; formData.forEach((v, k) => { payload[k] = v })
    try { await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), credentials: "include" }) }
    finally { setSaving(false) }
  }
  if (!data) return null
  return (
    <div className="admin-card bg-[#0a0c12] p-6">
      <div className="font-black text-xl mb-1 text-white">🏦 Platform Entry Fee</div>
      <p className="text-xs text-white/40 mb-6 font-bold uppercase tracking-widest">Global enrollment cost</p>
      <form onSubmit={save} className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-bold">₹</span>
          <input name="entryFee" defaultValue={data.entryFee} type="number" className="w-full rounded-xl bg-white/[0.06] border border-white/12 pl-8 pr-4 py-3.5 text-white font-black outline-none transition-all focus:border-primary/55 focus:ring-2 focus:ring-primary/15" />
        </div>
        <button type="submit" disabled={saving} className="admin-btn admin-btn-primary px-8 font-black uppercase tracking-widest text-xs">Save</button>
      </form>
    </div>
  )
}

export function BlockedPaymentCard() {
  const [data, setData] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const load = useCallback(async () => {
    const r = await fetch("/api/settings", { cache: "no-store" })
    const j = await r.json()
    setData(j.data)
  }, [])
  useEffect(() => { load() }, [load])
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const formData = new FormData(e.target as HTMLFormElement)
    const payload: Record<string, unknown> = {}; formData.forEach((v, k) => { payload[k] = v })
    try { await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), credentials: "include" }) }
    finally { setSaving(false) }
  }
  if (!data) return null
  return (
    <div className="admin-card bg-[#0a0c12] p-6">
      <div className="font-black text-xl mb-1 text-white">🚨 Unblock Cost</div>
      <p className="text-xs text-white/40 mb-6 font-bold uppercase tracking-widest">Fee to unblock account</p>
      <form onSubmit={save} className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-bold">₹</span>
          <input name="unblockFee" defaultValue={data.unblockFee || 50} type="number" className="w-full rounded-xl bg-white/[0.06] border border-white/12 pl-8 pr-4 py-3.5 text-white font-black outline-none transition-all focus:border-primary/55 focus:ring-2 focus:ring-primary/15" />
        </div>
        <button type="submit" disabled={saving} className="admin-btn admin-btn-primary px-8 font-black uppercase tracking-widest text-xs">Save</button>
      </form>
    </div>
  )
}

export function PaymentHistoryTable() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch("/api/admin/payments", { cache: "no-store", credentials: "include" })
      const j = await r.json()
      setItems(Array.isArray(j.data) ? j.data : [])
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  const filtered = items.filter(x => String(x.id).includes(search) || String(x.meta?.name || "").toLowerCase().includes(search.toLowerCase()))
  return (
    <div className="admin-card bg-[#0a0c12] p-0 overflow-hidden">
      <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-black text-xl text-white">📜 Payment History</h3>
          <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-1">All processed transactions</p>
        </div>
        <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-xs text-white focus:border-primary/50 outline-none w-full sm:w-64" />
      </div>
      <div className="overflow-x-auto text-white">
        <table className="w-full text-left text-xs">
          <thead><tr className="border-b border-white/5 text-white/40 uppercase tracking-widest bg-white/5"><th className="px-6 py-4">ID</th><th className="px-6 py-4">User</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4">Gateway</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Date</th></tr></thead>
          <tbody className="divide-y divide-white/5">{filtered.map(p => {
            const statusColors: Record<string, string> = {
              success: "bg-emerald-500/10 text-emerald-400",
              completed: "bg-emerald-500/10 text-emerald-400",
              pending_approval: "bg-amber-500/10 text-amber-400",
              pending: "bg-amber-500/10 text-amber-400",
              denied: "bg-red-500/10 text-red-400",
              rejected: "bg-red-500/10 text-red-400",
              failed: "bg-red-500/10 text-red-400"
            }
            return (
              <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group"><td className="px-6 py-4 font-mono text-white/40 text-[10px]">{p.id}</td><td className="px-6 py-4 font-black">{p.meta?.name || p.meta?.username || "Member"}</td><td className="px-6 py-4 font-black">₹{p.amount}</td><td className="px-6 py-4 uppercase font-bold text-white/40">{p.gateway || "manual"}</td><td className="px-6 py-4"><span className={`px-2 py-1 rounded-md font-black text-[9px] uppercase tracking-wider ${statusColors[p.status] || "bg-white/5 text-white/40"}`}>{(p.status || "").replace(/_/g, " ")}</span></td><td className="px-6 py-4 text-white/40 font-medium">{new Date(p.created_at || Date.now()).toLocaleString()}</td></tr>
            )
          })}</tbody>
        </table>
      </div>
    </div>
  )
}
