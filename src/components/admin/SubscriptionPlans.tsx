"use client"

import { useState, useEffect, useCallback } from "react"
import { adminFetch, adminGetJsonArray } from "@/lib/admin/client"

type Plan = {
  id: string
  name: string
  tier: "free" | "pro" | "enterprise" | "custom"
  priceMonthly: number
  priceYearly: number
  currency: string
  features: string[]
  maxUsers: number
  maxQuizzes: number
  maxStorage: number
  aiCredits: number
  whiteLabel: boolean
  apiAccess: boolean
  prioritySupport: boolean
  active: boolean
  subscriberCount: number
}

type Subscription = {
  id: string
  orgName: string
  planName: string
  tier: string
  status: "active" | "expired" | "cancelled" | "trial"
  startDate: string
  endDate: string
  amount: number
  autoRenew: boolean
}

const TIER_COLORS: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  free: { border: "border-white/10", bg: "bg-white/[0.02]", text: "text-white/60", glow: "" },
  pro: { border: "border-primary/30", bg: "bg-primary/[0.06]", text: "text-mint", glow: "shadow-primary/10" },
  enterprise: { border: "border-amber-500/30", bg: "bg-amber-500/[0.06]", text: "text-amber-300", glow: "shadow-amber-500/10" },
  custom: { border: "border-purple-500/30", bg: "bg-purple-500/[0.06]", text: "text-purple-300", glow: "shadow-purple-500/10" },
}

const DEFAULT_PLANS: Plan[] = [
  {
    id: "free", name: "Starter", tier: "free", priceMonthly: 0, priceYearly: 0, currency: "INR",
    features: ["Up to 50 students", "5 quizzes/month", "Basic analytics", "Community support", "Standard certificates"],
    maxUsers: 50, maxQuizzes: 5, maxStorage: 100, aiCredits: 10, whiteLabel: false, apiAccess: false, prioritySupport: false, active: true, subscriberCount: 0,
  },
  {
    id: "pro", name: "Professional", tier: "pro", priceMonthly: 999, priceYearly: 9999, currency: "INR",
    features: ["Up to 500 students", "Unlimited quizzes", "AI question generation", "Advanced analytics", "Custom certificates", "Priority email support", "Bulk import/export", "Quiz scheduling"],
    maxUsers: 500, maxQuizzes: -1, maxStorage: 5000, aiCredits: 500, whiteLabel: false, apiAccess: true, prioritySupport: true, active: true, subscriberCount: 0,
  },
  {
    id: "enterprise", name: "Enterprise", tier: "enterprise", priceMonthly: 4999, priceYearly: 49999, currency: "INR",
    features: ["Unlimited students", "Unlimited quizzes", "AI-powered adaptive learning", "Full analytics suite", "White-label branding", "API access & webhooks", "Dedicated support", "Custom integrations", "LMS integration", "SSO/SAML support", "SLA guarantee"],
    maxUsers: -1, maxQuizzes: -1, maxStorage: -1, aiCredits: -1, whiteLabel: true, apiAccess: true, prioritySupport: true, active: true, subscriberCount: 0,
  },
]

export default function SubscriptionPlans() {
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS)
  const [subs, setSubs] = useState<Subscription[]>([])
  const [view, setView] = useState<"plans" | "subscriptions" | "revenue">("plans")
  const [loading, setLoading] = useState(true)
  const [editingPlan, setEditingPlan] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [p, s] = await Promise.all([
      adminGetJsonArray<Plan>("/api/admin/subscriptions/plans"),
      adminGetJsonArray<Subscription>("/api/admin/subscriptions"),
    ])
    if (p.length) setPlans(p)
    setSubs(s)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const totalMRR = subs.filter((s) => s.status === "active").reduce((sum, s) => sum + s.amount, 0)
  const activeSubs = subs.filter((s) => s.status === "active").length
  const trialSubs = subs.filter((s) => s.status === "trial").length

  const savePlan = async (plan: Plan) => {
    await adminFetch("/api/admin/subscriptions/plans", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plan),
    })
    setEditingPlan(null)
    loadData()
  }

  return (
    <div className="space-y-6">
      {/* Revenue overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: "💰", label: "Monthly Revenue", value: `₹${totalMRR.toLocaleString()}`, color: "text-emerald-400" },
          { icon: "📊", label: "Active Subs", value: activeSubs, color: "text-accent" },
          { icon: "🔄", label: "Trial", value: trialSubs, color: "text-amber-400" },
          { icon: "📈", label: "ARR", value: `₹${(totalMRR * 12).toLocaleString()}`, color: "text-purple-400" },
        ].map((s) => (
          <div key={s.label} className="admin-card p-4 text-center">
            <div className="text-lg">{s.icon}</div>
            <div className={`text-xl font-black mt-1 ${s.color}`}>{s.value}</div>
            <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1.5">
        {(["plans", "subscriptions", "revenue"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setView(t)} className={`rounded-lg border px-4 py-2 text-xs font-bold capitalize transition-all ${view === t ? "bg-primary/15 border-primary/30 text-mint" : "bg-white/[0.03] border-white/10 text-white/50 hover:text-white"}`}>{t}</button>
        ))}
      </div>

      {view === "plans" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const tc = TIER_COLORS[plan.tier] ?? TIER_COLORS.free
            const editing = editingPlan === plan.id
            return (
              <div key={plan.id} className={`admin-card p-6 ${tc.border} ${tc.bg} ${tc.glow} relative overflow-hidden`}>
                {plan.tier === "enterprise" && <div className="absolute top-0 right-0 px-3 py-1 rounded-bl-xl bg-amber-500/20 text-amber-300 text-[8px] font-black uppercase tracking-widest">Popular</div>}
                <div className="text-center mb-4">
                  <h3 className={`text-lg font-black ${tc.text}`}>{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-black text-white">₹{plan.priceMonthly.toLocaleString()}</span>
                    <span className="text-white/30 text-sm">/mo</span>
                  </div>
                  {plan.priceYearly > 0 && <div className="text-[10px] text-white/40 mt-1">₹{plan.priceYearly.toLocaleString()}/yr (save {Math.round((1 - plan.priceYearly / (plan.priceMonthly * 12)) * 100)}%)</div>}
                </div>
                <div className="space-y-2 mb-5">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-white/70">
                      <span className="text-emerald-400 shrink-0 mt-0.5">✓</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t border-white/5 space-y-1.5 text-[10px] text-white/30">
                  <div className="flex justify-between"><span>Max users</span><span className="text-white/60">{plan.maxUsers === -1 ? "∞" : plan.maxUsers}</span></div>
                  <div className="flex justify-between"><span>AI credits/mo</span><span className="text-white/60">{plan.aiCredits === -1 ? "∞" : plan.aiCredits}</span></div>
                  <div className="flex justify-between"><span>API access</span><span className={plan.apiAccess ? "text-emerald-400" : "text-red-400"}>{plan.apiAccess ? "Yes" : "No"}</span></div>
                  <div className="flex justify-between"><span>White label</span><span className={plan.whiteLabel ? "text-emerald-400" : "text-red-400"}>{plan.whiteLabel ? "Yes" : "No"}</span></div>
                  <div className="flex justify-between"><span>Subscribers</span><span className="text-white/60">{plan.subscriberCount}</span></div>
                </div>
                <button type="button" onClick={() => setEditingPlan(editing ? null : plan.id)} className="mt-4 w-full admin-btn admin-btn-ghost-dark text-xs py-2">
                  {editing ? "Cancel" : "Edit Plan"}
                </button>
                {editing && (
                  <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                    <input type="number" defaultValue={plan.priceMonthly} onChange={(e) => { plan.priceMonthly = Number(e.target.value) }} className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-white" placeholder="Monthly price" />
                    <input type="number" defaultValue={plan.priceYearly} onChange={(e) => { plan.priceYearly = Number(e.target.value) }} className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-white" placeholder="Yearly price" />
                    <button type="button" onClick={() => savePlan(plan)} className="w-full admin-btn admin-btn-primary text-xs py-2">Save</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {view === "subscriptions" && (
        <div className="admin-card p-6">
          <h3 className="text-lg font-black text-white mb-4">Active Subscriptions</h3>
          {loading ? (
            <div className="text-center py-8 text-white/30 text-sm">Loading…</div>
          ) : !subs.length ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-white/40 text-sm">No subscriptions yet. Organizations will appear here when they subscribe.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {subs.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/5 p-4">
                  <div>
                    <div className="font-bold text-white text-sm">{s.orgName}</div>
                    <div className="text-[10px] text-white/40">{s.planName} · {new Date(s.startDate).toLocaleDateString()} → {new Date(s.endDate).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-white">₹{s.amount.toLocaleString()}/mo</span>
                    <span className={`rounded-md border px-2 py-0.5 text-[9px] font-black uppercase ${s.status === "active" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" : s.status === "trial" ? "bg-amber-500/15 border-amber-500/30 text-amber-300" : "bg-red-500/15 border-red-500/30 text-red-300"}`}>{s.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === "revenue" && (
        <div className="admin-card p-6">
          <h3 className="text-lg font-black text-white mb-2">Revenue Analytics</h3>
          <p className="text-xs text-white/40 mb-6">Subscription revenue breakdown</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-5 text-center">
              <div className="text-2xl font-black text-accent">₹{totalMRR.toLocaleString()}</div>
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">Monthly Recurring</div>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-5 text-center">
              <div className="text-2xl font-black text-emerald-400">₹{(totalMRR * 12).toLocaleString()}</div>
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">Annual Run Rate</div>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-5 text-center">
              <div className="text-2xl font-black text-amber-400">{activeSubs > 0 ? `₹${Math.round(totalMRR / activeSubs).toLocaleString()}` : "—"}</div>
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">ARPU</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
