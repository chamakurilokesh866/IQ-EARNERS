"use client"

import { useState, useEffect, useCallback } from "react"

const statBorderHover: Record<string, string> = {
  primary: "hover:border-primary/35",
  success: "hover:border-emerald-500/35",
  warning: "hover:border-amber-500/35"
}

const statValueTone: Record<string, string> = {
  primary: "text-white",
  success: "text-emerald-400",
  warning: "text-amber-400"
}

export function Stat({
  icon,
  label,
  value,
  sub,
  color = "primary",
  onClick
}: {
  icon: string
  label: string
  value: string | number
  sub?: string
  color?: "primary" | "success" | "warning"
  onClick?: () => void
}) {
  const border = statBorderHover[color] ?? statBorderHover.primary
  const tone = statValueTone[color] ?? statValueTone.primary
  return (
    <button
      type="button"
      onClick={onClick}
      className={`admin-stat-card text-left transition-colors ${border} ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <span className="text-2xl mb-2 block drop-shadow-sm">{icon}</span>
      <div className="text-sm text-navy-300 font-medium">{label}</div>
      <div className={`mt-2 text-2xl font-black num-display tracking-tight ${tone}`}>{value}</div>
      {sub && <div className="text-[10px] text-navy-500 mt-1 uppercase font-bold tracking-wider">{sub}</div>}
    </button>
  )
}

export type AdminStatsSnapshot = {
  revenue30d?: number
  totalRevenue?: number
  pendingPayments?: number
  successPayments?: number
  deniedPayments?: number
  pendingWithdrawals?: number
  totalWithdrawals?: number
  totalReferralCredits?: number
  activeTournaments?: number
  tournamentsCount?: number
  quizzesCount?: number
  totalPlayers?: number
  activeToday?: number
  paymentsByGateway?: Record<string, number>
}

export function OverviewContext({
  stats,
  onNavigate
}: {
  stats: AdminStatsSnapshot | null
  onNavigate: (key: string) => void
}) {
  if (!stats) {
    return (
      <div className="admin-card p-8 border-primary/10 flex items-center justify-center min-h-[200px]">
        <div className="flex flex-col items-center gap-3 text-navy-400">
          <div className="w-10 h-10 border-2 border-primary/30 border-t-accent rounded-full animate-spin" />
          <span className="text-sm font-semibold">Syncing platform metrics…</span>
        </div>
      </div>
    )
  }

  const gw = stats.paymentsByGateway || {}
  const gwLines = Object.entries(gw)
    .filter(([, n]) => n > 0)
    .slice(0, 4)

  return (
    <div className="admin-card p-6 sm:p-8 border-primary/15 bg-gradient-to-br from-slate-900/90 via-[#0a0f18] to-[#05070c] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/[0.06] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/[0.05] rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h3 className="font-black text-xl text-white tracking-tight">Command overview</h3>
          <p className="text-sm text-navy-400 mt-1 max-w-lg">
            Revenue, payouts, and live tournament signals — jump to any area below.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
          <button
            type="button"
            onClick={() => onNavigate("Payments")}
            className="rounded-xl bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-bold text-white/80 hover:bg-white/10 hover:border-primary/30 transition-all"
          >
            Payments
          </button>
          <button
            type="button"
            onClick={() => onNavigate("Analytics")}
            className="rounded-xl bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-bold text-white/80 hover:bg-white/10 hover:border-primary/30 transition-all"
          >
            Analytics
          </button>
        </div>
      </div>

      <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricTile
          icon="📈"
          label="Revenue (30d)"
          value={`₹${(stats.revenue30d ?? 0).toLocaleString()}`}
          hint="Entry + gateway"
        />
        <MetricTile
          icon="🏦"
          label="Total collected"
          value={`₹${(stats.totalRevenue ?? 0).toLocaleString()}`}
          hint="All-time success"
        />
        <MetricTile
          icon="✅"
          label="Paid checkouts"
          value={String(stats.successPayments ?? 0)}
          hint="Successful payments"
        />
        <MetricTile
          icon="⏳"
          label="Awaiting approval"
          value={String(stats.pendingPayments ?? 0)}
          hint="Manual / QR"
          accent={stats.pendingPayments ? "amber" : undefined}
        />
      </div>

      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-black/30 border border-white/5 p-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-primary/80 mb-4">Operations</div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-navy-400">Active tournaments</span>
              <span className="font-black text-white">{stats.activeTournaments ?? 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-navy-400">Pending withdrawals</span>
              <span className="font-black text-amber-400">{stats.pendingWithdrawals ?? 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-navy-400">Referral credits (₹)</span>
              <span className="font-black text-emerald-400">₹{(stats.totalReferralCredits ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-navy-400">Denied payments</span>
              <span className="font-black text-red-400/90">{stats.deniedPayments ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-black/30 border border-white/5 p-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-violet-400/80 mb-4">Gateway mix</div>
          {gwLines.length === 0 ? (
            <p className="text-sm text-navy-400">No gateway breakdown yet.</p>
          ) : (
            <ul className="space-y-2">
              {gwLines.map(([k, v]) => (
                <li key={k} className="flex justify-between items-center text-sm">
                  <span className="text-navy-300 uppercase text-xs font-bold tracking-wider">{k}</span>
                  <span className="font-mono text-white/90">{v}</span>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => onNavigate("Payments")}
            className="mt-4 w-full rounded-xl bg-primary/10 border border-primary/25 py-2.5 text-xs font-black text-mint hover:bg-primary/20 transition-all uppercase tracking-widest"
          >
            Open payments
          </button>
        </div>
      </div>
    </div>
  )
}

function MetricTile({
  icon,
  label,
  value,
  hint,
  accent
}: {
  icon: string
  label: string
  value: string
  hint: string
  accent?: "amber"
}) {
  return (
    <div
      className={`rounded-2xl p-4 border transition-colors ${
        accent === "amber"
          ? "bg-amber-500/5 border-amber-500/20"
          : "bg-white/[0.03] border-white/5 hover:border-primary/15"
      }`}
    >
      <div className="text-lg mb-1">{icon}</div>
      <div className="text-[10px] font-bold text-navy-500 uppercase tracking-wider">{label}</div>
      <div className="text-lg sm:text-xl font-black text-white mt-1 tabular-nums">{value}</div>
      <div className="text-[10px] text-navy-500 mt-0.5">{hint}</div>
    </div>
  )
}

export function RecentActivity() {
  const [activities, setActivities] = useState<any[]>([])
  useEffect(() => {
    fetch("/api/admin/activity", { cache: "no-store", credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setActivities(j && Array.isArray(j.data) ? j.data : []))
  }, [])
  return (
    <div className="admin-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="font-black text-lg text-white">Activity feed</div>
        <span className="text-[10px] font-bold text-navy-500 uppercase tracking-widest">Latest</span>
      </div>
      <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
        {activities.length === 0 && <div className="text-sm text-navy-400 py-8 text-center">No recent events</div>}
        {activities.map((a, i) => (
          <div key={i} className="flex items-start gap-3 text-sm rounded-xl bg-white/[0.02] border border-white/5 p-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-base">
              {a.type === "payment" ? "💰" : a.type === "user" ? "👤" : a.type === "quiz" ? "📝" : "🔔"}
            </div>
            <div>
              <div className="font-semibold text-white">{a.title}</div>
              <div className="text-navy-400 text-xs mt-0.5">
                {a.time} · {a.user}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function RevenueOverviewCard({ onNavigate }: { onNavigate: (key: string) => void }) {
  const [data, setData] = useState<any>(null)
  useEffect(() => {
    fetch("/api/admin/revenue-streams", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setData(j?.data ?? null))
  }, [])
  return (
    <div className="admin-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="font-black text-white">Revenue streams</div>
        <button type="button" onClick={() => onNavigate("Ads")} className="text-xs font-bold text-accent hover:text-mint">
          Ads →
        </button>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between py-3 border-b border-white/5 rounded-lg px-2 -mx-2 hover:bg-white/[0.02]">
          <span className="text-sm text-navy-400">Ads (30d)</span>
          <span className="font-black text-white">₹{data?.ads30d ?? "0"}</span>
        </div>
        <div className="flex justify-between py-3 border-b border-white/5 rounded-lg px-2 -mx-2 hover:bg-white/[0.02]">
          <span className="text-sm text-navy-400">Entry fees (30d)</span>
          <span className="font-black text-white">₹{data?.fees30d ?? "0"}</span>
        </div>
      </div>
    </div>
  )
}

export function QuestionReportsCard() {
  const [reports, setReports] = useState<any[]>([])
  useEffect(() => {
    fetch("/api/admin/quiz/reports", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setReports(j?.data ?? []))
  }, [])
  return (
    <div className="admin-card p-6 border-red-500/15">
      <div className="font-black mb-4 flex items-center gap-2 text-white">
        <span>🚩</span> Question reports
      </div>
      <div className="space-y-2 max-h-[240px] overflow-y-auto">
        {reports.map((r, i) => (
          <div key={i} className="text-sm p-3 rounded-xl bg-red-500/5 border border-red-500/10">
            <div className="font-medium text-white">{r.question}</div>
            <div className="text-xs text-red-400/90 mt-1">
              {r.reason} · @{r.username}
            </div>
          </div>
        ))}
        {!reports.length && <div className="text-sm text-navy-400 py-4">No open reports</div>}
      </div>
    </div>
  )
}

export function ReferralsOverviewCard() {
  const [stats, setStats] = useState<any>(null)
  useEffect(() => {
    fetch("/api/admin/referrals/overview", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setStats(j?.data ?? null))
  }, [])
  return (
    <div className="admin-card p-6">
      <div className="font-black mb-4 text-white">Referrals</div>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
          <div className="text-2xl font-black text-white">{stats?.total ?? "0"}</div>
          <div className="text-[10px] text-navy-500 uppercase font-bold mt-1">Total</div>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
          <div className="text-2xl font-black text-emerald-400">₹{stats?.paid ?? "0"}</div>
          <div className="text-[10px] text-navy-500 uppercase font-bold mt-1">Paid out</div>
        </div>
      </div>
    </div>
  )
}
