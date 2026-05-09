"use client"

import { useCallback, useEffect, useState } from "react"
import { adminFetch, adminGetJsonArray } from "@/lib/admin/client"

type LedgerRow = {
  id: string
  ts: number
  type: string
  amountRupees: number
  currency: string
  paymentId: string
  orderId?: string
  tournamentId?: string
  username?: string
  splitGroup: string
}

type DisputeRow = {
  id: string
  subject: string
  detail: string
  username?: string
  paymentId?: string
  tournamentId?: string
  status: string
  createdAt: number
  updatedAt: number
  adminNotes?: string
}

export default function MoneyRiskPanel() {
  const [ledger, setLedger] = useState<LedgerRow[]>([])
  const [disputes, setDisputes] = useState<DisputeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [subject, setSubject] = useState("")
  const [detail, setDetail] = useState("")
  const [payId, setPayId] = useState("")
  const [tournamentId, setTournamentId] = useState("")
  const [username, setUsername] = useState("")
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [l, d] = await Promise.all([
        adminGetJsonArray<LedgerRow>("/api/admin/money-ledger?limit=600"),
        adminGetJsonArray<DisputeRow>("/api/admin/money-disputes?limit=100"),
      ])
      setLedger(l)
      setDisputes(d)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const createDispute = async () => {
    if (!subject.trim() || !detail.trim()) return
    setSaving(true)
    try {
      const res = await adminFetch("/api/admin/money-disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          detail: detail.trim(),
          paymentId: payId.trim() || undefined,
          tournamentId: tournamentId.trim() || undefined,
          username: username.trim() || undefined,
        }),
      })
      if (res.ok) {
        setSubject("")
        setDetail("")
        setPayId("")
        setTournamentId("")
        setUsername("")
        await load()
      }
    } finally {
      setSaving(false)
    }
  }

  const patchDispute = async (id: string, status: string) => {
    await adminFetch(`/api/admin/money-disputes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    await load()
  }

  const feeTotal = ledger.filter((r) => r.type === "platform_fee").reduce((s, r) => s + r.amountRupees, 0)
  const poolTotal = ledger.filter((r) => r.type === "prize_pool_allocation").reduce((s, r) => s + r.amountRupees, 0)

  return (
    <div id="money-risk-panel" className="space-y-8 scroll-mt-28">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/90">
        <span className="font-black text-amber-200">Legal & operations</span> — Ledger entries are accounting aids, not tax or legal
        advice. Pair disputes with your payment gateway and counsel where required.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="admin-card bg-[#0a0c12] p-5 lg:col-span-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-white/35 mb-1">Platform fees (ledger)</div>
          <div className="text-2xl font-black text-mint">₹{feeTotal.toLocaleString()}</div>
          <div className="text-[10px] text-white/30 mt-2">Sum of recorded platform_fee lines</div>
        </div>
        <div className="admin-card bg-[#0a0c12] p-5 lg:col-span-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-white/35 mb-1">Prize pool allocations</div>
          <div className="text-2xl font-black text-cyan-300">₹{poolTotal.toLocaleString()}</div>
          <div className="text-[10px] text-white/30 mt-2">Net of entry after configured % fee</div>
        </div>
        <div className="admin-card bg-[#0a0c12] p-5 lg:col-span-1 flex flex-col justify-center">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="admin-btn admin-btn-ghost-dark text-xs py-2 px-4 w-full"
          >
            {loading ? "Refreshing…" : "Refresh ledger & disputes"}
          </button>
        </div>
      </div>

      <div className="admin-card bg-[#0a0c12] p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="font-black text-lg text-white">Tournament money ledger</h3>
            <p className="text-[10px] text-white/35 mt-1 uppercase tracking-widest">Append-only · paid tournament_entry only</p>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-left text-[11px] text-white">
            <thead className="sticky top-0 bg-[#12151f] z-10">
              <tr className="text-white/40 uppercase tracking-wider border-b border-white/5">
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">₹</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Tournament</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {ledger.map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2 text-white/50 whitespace-nowrap">{new Date(r.ts).toLocaleString()}</td>
                  <td className="px-4 py-2 font-mono text-[10px] text-accent/90">{r.type}</td>
                  <td className="px-4 py-2 tabular-nums font-bold">{r.amountRupees.toLocaleString()}</td>
                  <td className="px-4 py-2 font-mono text-[10px] text-white/45 max-w-[120px] truncate">{r.paymentId}</td>
                  <td className="px-4 py-2 text-white/60 max-w-[100px] truncate">{r.username ?? "—"}</td>
                  <td className="px-4 py-2 font-mono text-[10px] text-white/45 max-w-[100px] truncate">{r.tournamentId ?? "—"}</td>
                </tr>
              ))}
              {!ledger.length && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-white/35">
                    No ledger rows yet. Successful tournament payments will create entries automatically.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="admin-card bg-[#0a0c12] p-6 space-y-4">
          <h3 className="font-black text-lg text-white">Open a dispute / case</h3>
          <p className="text-xs text-white/45">Track chargebacks, collusion suspicion, or payout conflicts.</p>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Short subject"
            className="w-full rounded-xl bg-white/[0.06] border border-white/12 px-4 py-3 text-sm text-white"
          />
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Details (what happened, links, gateway case IDs…)"
            rows={4}
            className="w-full rounded-xl bg-white/[0.06] border border-white/12 px-4 py-3 text-sm text-white resize-y min-h-[100px]"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              value={payId}
              onChange={(e) => setPayId(e.target.value)}
              placeholder="Payment id (optional)"
              className="rounded-xl bg-white/[0.06] border border-white/12 px-3 py-2 text-xs text-white"
            />
            <input
              value={tournamentId}
              onChange={(e) => setTournamentId(e.target.value)}
              placeholder="Tournament id"
              className="rounded-xl bg-white/[0.06] border border-white/12 px-3 py-2 text-xs text-white"
            />
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="rounded-xl bg-white/[0.06] border border-white/12 px-3 py-2 text-xs text-white"
            />
          </div>
          <button
            type="button"
            disabled={saving || !subject.trim() || !detail.trim()}
            onClick={() => void createDispute()}
            className="admin-btn admin-btn-primary text-xs py-2.5 px-5"
          >
            {saving ? "Saving…" : "Log dispute"}
          </button>
        </div>

        <div className="admin-card bg-[#0a0c12] p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 font-black text-lg text-white">Disputes ({disputes.length})</div>
          <div className="max-h-[480px] overflow-y-auto divide-y divide-white/5">
            {disputes.map((d) => (
              <div key={d.id} className="px-5 py-4 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="font-bold text-white text-sm">{d.subject}</div>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-white/10 text-white/70">{d.status}</span>
                </div>
                <p className="text-xs text-white/55 whitespace-pre-wrap">{d.detail}</p>
                <div className="text-[10px] text-white/35 font-mono">
                  {d.paymentId && <span className="mr-2">pay:{d.paymentId}</span>}
                  {d.tournamentId && <span className="mr-2">t:{d.tournamentId}</span>}
                  {d.username && <span>@{d.username}</span>}
                </div>
                {d.adminNotes ? <p className="text-[10px] text-amber-200/80">Note: {d.adminNotes}</p> : null}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(["open", "reviewing", "resolved", "rejected"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => void patchDispute(d.id, st)}
                      className={`rounded-lg px-2 py-1 text-[9px] font-black uppercase border ${
                        d.status === st ? "border-primary/50 bg-primary/15 text-mint" : "border-white/10 text-white/45 hover:text-white"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
                <div className="text-[9px] text-white/25">{new Date(d.updatedAt).toLocaleString()}</div>
              </div>
            ))}
            {!disputes.length && <div className="p-8 text-center text-white/35 text-sm">No disputes logged.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
