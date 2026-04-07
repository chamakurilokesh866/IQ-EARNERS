"use client"

import { useState, useCallback, useEffect } from "react"
import { adminFetch } from "@/lib/admin/client"
import type { QuizModeDefinition } from "@/lib/quizModeDefaults"
import { QUIZ_MODE_DEFAULTS } from "@/lib/quizModeDefaults"

export default function AdvancedQuizModes() {
  const [modes, setModes] = useState<QuizModeDefinition[]>(QUIZ_MODE_DEFAULTS)
  const [expandedMode, setExpandedMode] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    adminFetch("/api/admin/quiz-modes")
      .then((r) => r.json())
      .then((j) => {
        if (cancelled || !Array.isArray(j?.data)) return
        setModes(j.data as QuizModeDefinition[])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const toggleMode = useCallback(async (modeId: string) => {
    const mode = modes.find((m) => m.id === modeId)
    if (!mode) return
    setSaving(modeId)
    const newEnabled = !mode.enabled
    try {
      await adminFetch("/api/admin/quiz-modes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: modeId, enabled: newEnabled }),
      })
      setModes((prev) => prev.map((m) => m.id === modeId ? { ...m, enabled: newEnabled } : m))
    } catch { /* ignore */ }
    setSaving(null)
  }, [modes])

  const enabledCount = modes.filter((m) => m.enabled).length

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: "🎮", label: "Total Modes", value: modes.length },
          { icon: "✓", label: "Enabled", value: enabledCount },
          { icon: "🧠", label: "AI-Powered", value: modes.filter((m) => ["adaptive", "spaced_repetition", "ai_tutor"].includes(m.id)).length },
          { icon: "👥", label: "Multiplayer", value: modes.filter((m) => ["team_quiz", "battle_royale", "timed_challenge"].includes(m.id)).length },
        ].map((s) => (
          <div key={s.label} className="admin-card p-4 text-center">
            <div className="text-lg">{s.icon}</div>
            <div className="text-xl font-black text-white mt-1">{s.value}</div>
            <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="admin-card p-6">
        <div className="mb-5">
          <h2 className="text-lg font-black text-white">Advanced Quiz Modes</h2>
          <p className="text-xs text-white/40 mt-0.5">Enable futuristic AI-powered quiz experiences for schools, colleges &amp; organizations</p>
        </div>

        <div className="space-y-3">
          {modes.map((mode) => {
            const expanded = expandedMode === mode.id
            return (
              <div key={mode.id} className={`rounded-xl border transition-all ${mode.enabled ? "bg-primary/[0.04] border-primary/15" : "bg-white/[0.02] border-white/5"}`}>
                <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedMode(expanded ? null : mode.id)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl shrink-0">{mode.icon}</div>
                    <div className="min-w-0">
                      <div className="font-bold text-white text-sm flex items-center gap-2">
                        {mode.name}
                        {["adaptive", "spaced_repetition", "ai_tutor"].includes(mode.id) && <span className="rounded bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.5 text-[8px] font-black text-purple-300 uppercase">AI</span>}
                      </div>
                      <p className="text-[10px] text-white/40 truncate">{mode.description.slice(0, 80)}…</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button type="button" onClick={(e) => { e.stopPropagation(); toggleMode(mode.id) }} disabled={saving === mode.id} className={`w-12 h-6 rounded-full transition-colors flex items-center ${mode.enabled ? "bg-primary/60" : "bg-white/10"}`}>
                      <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${mode.enabled ? "translate-x-6" : "translate-x-0.5"}`} />
                    </button>
                    <span className={`text-white/30 transition-transform ${expanded ? "rotate-180" : ""}`}>▾</span>
                  </div>
                </div>
                {expanded && (
                  <div className="px-4 pb-4 border-t border-white/5 pt-3">
                    <p className="text-xs text-white/50 leading-relaxed mb-4">{mode.description}</p>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2">Configuration</div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(mode.config).map(([key, value]) => (
                        <div key={key} className="rounded-lg bg-black/30 border border-white/5 p-2.5">
                          <div className="text-[9px] text-white/30 font-mono">{key}</div>
                          <div className="text-xs text-white/70 font-bold mt-0.5">
                            {typeof value === "boolean" ? (value ? "✓ Enabled" : "✕ Disabled") : Array.isArray(value) ? value.join(", ") : String(value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
