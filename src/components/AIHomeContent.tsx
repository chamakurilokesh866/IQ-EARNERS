"use client"
import { useEffect, useState } from "react"

interface HomeContent {
    greeting: string
    tip: string
    spotlight: string
}

// Shimmer skeleton
function Shimmer({ className }: { className?: string }) {
    return (
        <div
            className={`rounded-lg bg-white/5 animate-pulse ${className ?? ""}`}
            aria-hidden
        />
    )
}

export default function AIHomeContent({ username }: { username: string | null }) {
    const [data, setData] = useState<HomeContent | null>(null)
    const [loading, setLoading] = useState(false)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (!username) return
        setLoading(true)
        fetch("/api/ai/home-content", { credentials: "include", cache: "no-store" })
            .then((r) => r.json())
            .then((j) => {
                if (j?.ok && j.data) {
                    setData(j.data)
                    // Slight delay for entrance animation
                    setTimeout(() => setVisible(true), 50)
                }
            })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [username])

    // Don't render if no user
    if (!username) return null

    if (loading) {
        return (
            <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.02] p-4 space-y-3">
                <Shimmer className="h-4 w-3/4" />
                <Shimmer className="h-3 w-full" />
                <Shimmer className="h-3 w-5/6" />
                <Shimmer className="h-3 w-2/3" />
            </div>
        )
    }

    if (!data) return null

    return (
        <div
            className={`mt-6 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/5 via-transparent to-transparent p-4 space-y-3 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
                }`}
        >
            {/* AI badge */}
            <div className="flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                <span className="text-[10px] uppercase tracking-widest font-bold text-violet-400/70">
                    AI Personalised
                </span>
            </div>

            {/* Greeting */}
            {data.greeting && (
                <p className="text-sm font-medium text-white/90 leading-snug">
                    {data.greeting}
                </p>
            )}

            {/* Divider */}
            {(data.tip || data.spotlight) && (
                <div className="h-px bg-white/5" />
            )}

            {/* Spotlight */}
            {data.spotlight && (
                <div className="flex items-start gap-2">
                    <span className="shrink-0 text-sm">🎯</span>
                    <p className="text-xs text-white/70 leading-relaxed">{data.spotlight}</p>
                </div>
            )}

            {/* Study tip */}
            {data.tip && (
                <div className="rounded-xl bg-white/[0.03] border border-white/8 px-3 py-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">
                        Today&apos;s Study Tip
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed">{data.tip}</p>
                </div>
            )}
        </div>
    )
}
