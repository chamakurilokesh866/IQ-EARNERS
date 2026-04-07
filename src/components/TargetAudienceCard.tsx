"use client"

import { useState, useEffect, useCallback } from "react"
import { RocketIcon, RefreshIcon, CheckIcon } from "./AnimatedIcons"

export default function TargetAudienceCard() {
    const [targetAudience, setTargetAudience] = useState<number>(100)
    const [progressBaseCount, setProgressBaseCount] = useState<number>(0)
    const [currentRaw, setCurrentRaw] = useState<number>(0)
    const [loading, setLoading] = useState(false)
    const [saved, setSaved] = useState(false)
    const [resetLoading, setResetLoading] = useState(false)

    const load = useCallback(() => {
        fetch("/api/settings", { cache: "no-store", credentials: "include" })
            .then((r) => r.json())
            .then((j) => {
                const d = j?.data ?? {}
                setTargetAudience(Number(d.targetAudience ?? 100))
                setProgressBaseCount(Number(d.progressBaseCount ?? 0))
            })
            .catch(() => { })
        fetch("/api/progress", { cache: "no-store", credentials: "include" })
            .then((r) => r.json())
            .then((j) => {
                setCurrentRaw(j?.paidCount ?? 0)
            })
            .catch(() => { })
    }, [])

    useEffect(() => { load() }, [load])

    const save = async () => {
        setLoading(true)
        setSaved(false)
        try {
            const res = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    targetAudience: Math.max(1, Math.min(99999, targetAudience)),
                    progressBaseCount: Number(progressBaseCount || 0)
                })
            })
            if (res.ok) {
                setSaved(true)
                setTimeout(() => setSaved(false), 2000)
            }
        } finally {
            setLoading(false)
        }
    }

    const resetProgress = async () => {
        if (!confirm("Reset progress bar to 0%? This will clear history and start fresh from current moment.")) return
        setResetLoading(true)
        try {
            const now = Date.now()
            const res = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    progressBaseCount: 0,
                    lastResetAt: now
                })
            })
            if (res.ok) {
                setProgressBaseCount(0)
                setCurrentRaw(0)
                setSaved(true)
                setTimeout(() => setSaved(false), 2000)
            }
        } finally {
            setResetLoading(false)
        }
    }

    const effective = Math.max(0, currentRaw + progressBaseCount)
    const pct = Math.min(100, Math.round((effective / (targetAudience || 1)) * 100))

    return (
        <div className="admin-card p-6 border-primary/20 bg-primary/5">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <div className="font-bold text-lg flex items-center gap-2">
                        <RocketIcon size={20} className="text-primary" /> Quiz Launch Progress
                    </div>
                    <p className="text-xs text-navy-400">Manage the goal and offset for the frontend progress bar.</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${pct >= 100 ? "bg-success text-black" : "bg-primary/20 text-primary border border-primary/30"}`}>
                    {pct}% COMPLETE
                </div>
            </div>

            <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-navy-400">Target Users (Goal)</label>
                        <input
                            type="number"
                            value={targetAudience}
                            onChange={(e) => setTargetAudience(Number(e.target.value))}
                            className="w-full rounded-xl bg-navy-900 border border-navy-700 px-4 py-2.5 text-sm focus:border-primary/50 outline-none transition-all text-white"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-navy-400">Manual Offset</label>
                        <input
                            type="number"
                            value={progressBaseCount}
                            onChange={(e) => setProgressBaseCount(Number(e.target.value))}
                            className="w-full rounded-xl bg-navy-900 border border-navy-700 px-4 py-2.5 text-sm focus:border-primary/50 outline-none transition-all text-white"
                        />
                    </div>
                </div>

                <div className="bg-navy-900/60 rounded-2xl p-4 border border-navy-700/50">
                    <div className="flex justify-between text-[11px] mb-2 px-1">
                        <span className="text-navy-400 italic">Effective Count: {effective}</span>
                        <span className="text-navy-300">Goal: {targetAudience}</span>
                    </div>
                    <div className="h-3 w-full bg-navy-950 rounded-full overflow-hidden border border-white/5">
                        <div
                            className="h-full bg-gradient-to-r from-primary via-blue-400 to-emerald-400 transition-all duration-1000 ease-out"
                            style={{ width: `${pct}%`, boxShadow: "0 0 15px rgba(124,58,237,0.4)" }}
                        />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                        <div className="text-[10px] text-navy-500">
                            Raw: {currentRaw} | Offset: {progressBaseCount}
                        </div>
                        <button type="button" onClick={load} className="text-[10px] text-primary hover:underline flex items-center gap-1">Refresh <RefreshIcon size={10} /></button>
                    </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                    <button
                        className="flex-1 py-3 rounded-xl bg-primary text-navy-950 font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                        onClick={save}
                        disabled={loading}
                    >
                        {loading ? "Saving..." : "Apply Settings"}
                    </button>
                    <button
                        className="px-4 py-3 rounded-xl bg-navy-800 border border-navy-700 text-xs font-semibold hover:bg-navy-700 transition-all disabled:opacity-50"
                        onClick={resetProgress}
                        disabled={resetLoading}
                    >
                        {resetLoading ? "..." : "Reset to 0%"}
                    </button>
                </div>
                {saved && <div className="text-center text-xs text-success animate-fade flex items-center justify-center gap-1"><CheckIcon size={12} /> Settings synced to frontend</div>}
            </div>
        </div>
    )
}
