"use client"
import { useEffect, useState } from "react"
import TransitionLink from "./TransitionLink"

interface Recommendation {
    id: string
    title: string
    reason: string
    priority: "high" | "medium" | "low"
    tag: string
}

const TAG_STYLES: Record<string, string> = {
    "Improve Weakness": "bg-red-50 border-red-100 text-red-700",
    "Next Step": "bg-blue-50 border-blue-100 text-blue-700",
    "Build Streak": "bg-amber-50 border-amber-200 text-amber-800",
    "Challenge Mode": "bg-purple-50 border-purple-100 text-purple-700",
    "Recommended": "bg-emerald-50 border-emerald-100 text-emerald-700",
}

const PRIORITY_DOT: Record<string, string> = {
    high: "bg-red-400",
    medium: "bg-amber-400",
    low: "bg-emerald-400",
}

function Shimmer({ className }: { className?: string }) {
    return <div className={`rounded-lg bg-white/5 animate-pulse ${className ?? ""}`} aria-hidden />
}

export default function AIRecommendations({ username }: { username: string | null }) {
    const [recs, setRecs] = useState<Recommendation[]>([])
    const [loading, setLoading] = useState(false)
    const [visible, setVisible] = useState(false)
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        if (!username || dismissed) return
        const key = `ai_recs_dismissed_${new Date().toISOString().slice(0, 10)}`
        if (typeof window !== "undefined" && localStorage.getItem(key)) {
            setDismissed(true)
            return
        }
        setLoading(true)
        fetch("/api/ai/recommendations", { credentials: "include", cache: "no-store" })
            .then((r) => r.json())
            .then((j) => {
                if (j?.ok && Array.isArray(j.data) && j.data.length > 0) {
                    setRecs(j.data)
                    setTimeout(() => setVisible(true), 80)
                }
            })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [username, dismissed])

    const handleDismiss = () => {
        setDismissed(true)
        try {
            const key = `ai_recs_dismissed_${new Date().toISOString().slice(0, 10)}`
            localStorage.setItem(key, "1")
        } catch { }
    }

    if (!username || dismissed) return null

    if (loading) {
        return (
            <section className="mt-8 space-y-3">
                <Shimmer className="h-3 w-40" />
                {[0, 1, 2].map((i) => (
                    <Shimmer key={i} className="h-16 w-full" />
                ))}
            </section>
        )
    }

    if (recs.length === 0) return null

    return (
        <section
            className={`mt-8 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
                }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3 px-2">
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed]" />
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6b7a99]">
                        AI Recommended for You
                    </h2>
                </div>
                <button
                    type="button"
                    onClick={handleDismiss}
                    aria-label="Dismiss recommendations"
                    className="text-[10px] text-[#94a3b8] hover:text-[#1a2340] transition-colors font-bold"
                >
                    dismiss
                </button>
            </div>

            {/* Recommendation cards */}
            <div className="space-y-2.5">
                {recs.map((rec, i) => {
                    const tagStyle = TAG_STYLES[rec.tag] ?? TAG_STYLES["Recommended"]
                    const dotStyle = PRIORITY_DOT[rec.priority] ?? "bg-[#94a3b8]"
                    return (
                        <TransitionLink
                            key={rec.id}
                            href={`/daily-quiz?id=${encodeURIComponent(rec.id)}`}
                            className="group flex items-start gap-3 rounded-2xl border border-[#e8eaf0] bg-white hover:bg-[#f8fafc] hover:border-[#cbd5e1] p-3.5 shadow-sm transition-all duration-200 active:scale-[0.99]"
                            style={{ transitionDelay: `${i * 40}ms` }}
                        >
                            {/* Priority dot */}
                            <span className={`mt-1.5 shrink-0 w-2 h-2 rounded-full ${dotStyle}`} />

                            <div className="flex-1 min-w-0">
                                {/* Title + tag row */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-black text-[#1a2340] truncate leading-tight group-hover:text-[#7c3aed]">
                                        {rec.title}
                                    </span>
                                    <span
                                        className={`shrink-0 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${tagStyle}`}
                                    >
                                        {rec.tag}
                                    </span>
                                </div>
                                {/* Reason */}
                                <p className="mt-1 text-[11px] text-[#64748b] font-medium leading-relaxed line-clamp-2">
                                    {rec.reason}
                                </p>
                            </div>

                            {/* Arrow */}
                            <span className="shrink-0 self-center text-[#94a3b8] group-hover:text-[#7c3aed] group-hover:translate-x-0.5 transition-all font-bold">
                                →
                            </span>
                        </TransitionLink>
                    )
                })}
            </div>

            <p className="mt-4 text-[10px] text-[#94a3b8] text-center font-bold uppercase tracking-widest">
                Powered by AI • Analytics updated daily
            </p>
        </section>
    )
}
