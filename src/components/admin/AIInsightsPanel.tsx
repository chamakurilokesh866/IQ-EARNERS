"use client"

import { useState, useEffect, useCallback } from "react"
import { adminFetch } from "@/lib/admin/client"
import { DEMO_INSIGHT_DATA, type InsightData } from "@/lib/aiInsightsDemo"

const IMPACT_COLORS = {
  high: "bg-red-500/15 border-red-500/30 text-red-300",
  medium: "bg-amber-500/15 border-amber-500/30 text-amber-300",
  low: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
}

export default function AIInsightsPanel() {
  const [data, setData] = useState<InsightData>(DEMO_INSIGHT_DATA)
  const [loading, setLoading] = useState(true)
  const [fromApi, setFromApi] = useState(false)
  const [activeSection, setActiveSection] = useState<"overview" | "predictions" | "recommendations" | "difficulty">("overview")
  const [generating, setGenerating] = useState(false)

  const loadInsights = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminFetch("/api/admin/ai-insights")
      const j = await res.json().catch(() => ({}))
      if (j?.data) {
        setData(j.data)
        setFromApi(true)
      } else {
        setFromApi(false)
      }
    } catch {
      setFromApi(false)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadInsights() }, [loadInsights])

  const generateNewInsights = async () => {
    setGenerating(true)
    try {
      await adminFetch("/api/admin/ai-insights/generate", { method: "POST" })
      await loadInsights()
    } catch { /* ignore */ }
    setGenerating(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="text-xs text-white/70">
          <span className="font-black text-white uppercase tracking-widest text-[10px]">Data source</span>
          <span className="mx-2 text-white/25">·</span>
          {loading ? (
            <span className="text-white/50">Loading…</span>
          ) : fromApi ? (
            <span className="text-emerald-400 font-bold">Live · /api/admin/ai-insights</span>
          ) : (
            <span className="text-amber-200/90 font-bold">Sample preview · use Generate or configure API for production metrics</span>
          )}
        </div>
      </div>
      {/* Hero metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: "🧠", label: "AI Engagement Score", value: `${data.engagementScore}%`, color: data.engagementScore > 70 ? "text-emerald-400" : "text-amber-400" },
          { icon: "🔄", label: "Retention Rate", value: `${data.retentionRate}%`, color: data.retentionRate > 60 ? "text-accent" : "text-red-400" },
          { icon: "⏱", label: "Avg Session", value: `${data.averageSessionDuration}m`, color: "text-purple-400" },
          { icon: "🛡", label: "Integrity Score", value: `${100 - data.cheatRiskScore}%`, color: data.cheatRiskScore < 15 ? "text-emerald-400" : "text-red-400" },
        ].map((s) => (
          <div key={s.label} className="admin-card p-4 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-lg">{s.icon}</div>
              <div className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</div>
              <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-1">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Nav + generate */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {(["overview", "predictions", "recommendations", "difficulty"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setActiveSection(t)} className={`rounded-lg border px-3 py-2 text-xs font-bold capitalize transition-all ${activeSection === t ? "bg-primary/15 border-primary/30 text-mint" : "bg-white/[0.03] border-white/10 text-white/50 hover:text-white"}`}>{t}</button>
          ))}
        </div>
        <button type="button" onClick={generateNewInsights} disabled={generating} className="admin-btn admin-btn-primary text-xs py-2 px-4">
          {generating ? "Generating…" : "🧠 Generate New Insights"}
        </button>
      </div>

      {activeSection === "overview" && (
        <div className="admin-card p-6">
          <h3 className="text-lg font-black text-white mb-4">Performance Trend</h3>
          <div className="space-y-3">
            {data.performanceTrend.map((m) => (
              <div key={m.month} className="flex items-center gap-4">
                <span className="w-10 text-xs font-bold text-white/50">{m.month}</span>
                <div className="flex-1 h-7 rounded-lg bg-white/[0.03] overflow-hidden relative">
                  <div className="absolute inset-y-0 left-0 rounded-lg bg-gradient-to-r from-primary/40 to-accent/20" style={{ width: `${m.avgScore}%` }} />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white/80">{m.avgScore}% avg · {m.participation} users</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === "predictions" && (
        <div className="admin-card p-6">
          <h3 className="text-lg font-black text-white mb-1">AI Predictions</h3>
          <p className="text-xs text-white/40 mb-5">Machine learning forecasts for the next 30 days</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.predictions.map((p) => (
              <div key={p.metric} className="rounded-xl bg-white/[0.03] border border-white/5 p-5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">{p.metric}</div>
                <div className="flex items-end gap-3 mb-2">
                  <div>
                    <div className="text-xs text-white/40">Current</div>
                    <div className="text-xl font-black text-white">{p.current.toLocaleString()}</div>
                  </div>
                  <div className={`text-lg ${p.trend === "up" ? "text-emerald-400" : p.trend === "down" ? "text-red-400" : "text-white/40"}`}>
                    {p.trend === "up" ? "↗" : p.trend === "down" ? "↘" : "→"}
                  </div>
                  <div>
                    <div className="text-xs text-white/40">Predicted</div>
                    <div className="text-xl font-black text-accent">{p.predicted.toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-accent/60" style={{ width: `${p.confidence}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-white/40">{p.confidence}% confidence</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === "recommendations" && (
        <div className="admin-card p-6">
          <h3 className="text-lg font-black text-white mb-1">AI Recommendations</h3>
          <p className="text-xs text-white/40 mb-5">Actionable insights to grow your platform</p>
          <div className="space-y-3">
            {data.aiRecommendations.map((r, i) => (
              <div key={i} className="rounded-xl bg-white/[0.02] border border-white/5 p-4 hover:border-white/10 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-white text-sm">{r.title}</div>
                    <p className="text-xs text-white/50 mt-1 leading-relaxed">{r.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`rounded-md border px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${IMPACT_COLORS[r.impact]}`}>{r.impact}</span>
                    <span className="text-[9px] text-white/30 font-bold">{r.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === "difficulty" && (
        <div className="admin-card p-6">
          <h3 className="text-lg font-black text-white mb-4">Difficulty Analysis by Category</h3>
          <div className="space-y-3">
            {data.difficultyAnalysis.map((d) => (
              <div key={d.category} className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-sm">{d.category}</span>
                  <span className={`text-sm font-black ${d.avgScore >= 70 ? "text-emerald-400" : d.avgScore >= 50 ? "text-amber-400" : "text-red-400"}`}>{d.avgScore}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-2">
                  <div className={`h-full rounded-full ${d.avgScore >= 70 ? "bg-emerald-400/60" : d.avgScore >= 50 ? "bg-amber-400/60" : "bg-red-400/60"}`} style={{ width: `${d.avgScore}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-white/40">
                  <span>{d.totalAttempts.toLocaleString()} attempts</span>
                  <span>Hardest: <span className="text-white/60">{d.hardestTopic}</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
