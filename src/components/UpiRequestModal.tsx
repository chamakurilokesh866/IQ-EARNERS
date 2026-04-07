"use client"

import { useEffect, useState } from "react"

type Request = { id: string; targetUsername: string; message: string; status: string }

export default function UpiRequestModal({ username, onClose }: { username: string | null; onClose: () => void }) {
  const [request, setRequest] = useState<Request | null>(null)
  const [upiId, setUpiId] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!username) return
    const fetchRequest = async () => {
      const r = await fetch("/api/user/upi-request", { cache: "no-store" })
      const j = await r.json().catch(() => ({}))
      if (j?.ok && j?.data) setRequest(j.data)
    }
    fetchRequest()
    const t = setInterval(fetchRequest, 5000)
    return () => clearInterval(t)
  }, [username])

  const handlePass = async () => {
    setLoading(true)
    try {
      const r = await fetch("/api/user/upi-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pass" }),
        credentials: "include"
      })
      const j = await r.json()
      if (j?.ok) {
        setSubmitted(true)
        onClose()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    const trimmed = upiId.trim()
    if (!trimmed) return
    setLoading(true)
    try {
      const r = await fetch("/api/user/upi-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", upiId: trimmed }),
        credentials: "include"
      })
      const j = await r.json()
      if (j?.ok) {
        setSubmitted(true)
        onClose()
      }
    } finally {
      setLoading(false)
    }
  }

  if (!request || submitted) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 blur-overlay" onClick={onClose}>
      <div className="w-full max-w-sm flex flex-col modal-card-payment relative" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} className="modal-close-btn">✕</button>
        <div className="flex flex-col items-center text-center mt-4 border-b border-white/5 pb-4 mb-4">
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Award Notice</h2>
        </div>
        <p className="text-sm text-white/50 text-center px-2">{request.message}</p>
        <div className="mt-8 space-y-2">
          <label htmlFor="upi-request-id" className="form-ui-label-dark">Payment address (UPI ID)</label>
          <input
            id="upi-request-id"
            type="text"
            placeholder="yourname@paytm"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            className="modal-input-enhanced py-3 font-mono text-[15px]"
            autoComplete="off"
          />
        </div>
        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleSend}
            disabled={loading || !upiId.trim()}
            className="modal-btn-primary !py-4 uppercase text-xs font-black tracking-widest"
          >
            Claim Rewards
          </button>
          <button
            type="button"
            onClick={handlePass}
            disabled={loading}
            className="modal-btn-secondary !py-3 uppercase text-[10px] font-bold tracking-widest opacity-60 hover:opacity-100"
          >
            Pass to next player
          </button>
        </div>
        <button type="button" onClick={onClose} className="mt-3 w-full text-sm text-navy-400 hover:text-navy-200">
          Close (you can respond later)
        </button>
      </div>
    </div>
  )
}
