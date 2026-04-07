"use client"

import { useEffect, useMemo, useState } from "react"
import SkillRadar from "./SkillRadar"

function SkillRadarChart({ data }: { data: { label: string; score: number }[] }) {
    const size = 220
    const center = size / 2
    const maxRadius = 72
    const sides = data.length
    if (sides === 0) return null
    const angleStep = (Math.PI * 2) / sides

    const getPoint = (value: number, idx: number) => {
        const r = (Math.max(0, Math.min(100, value)) / 100) * maxRadius
        const a = idx * angleStep - Math.PI / 2
        return `${center + r * Math.cos(a)},${center + r * Math.sin(a)}`
    }

    const pathData = data.map((d, i) => getPoint(d.score, i)).join(" ")
    const gridLevels = [0.25, 0.5, 0.75, 1.0]

    return (
        <div className="flex flex-col items-center justify-center">
            <div className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Skill Radar</div>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
                {gridLevels.map(level => {
                    const r = level * maxRadius
                    const points = data.map((_, i) => {
                        const a = i * angleStep - Math.PI / 2
                        return `${center + r * Math.cos(a)},${center + r * Math.sin(a)}`
                    }).join(" ")
                    return <polygon key={level} points={points} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                })}
                {data.map((d, i) => {
                    const a = i * angleStep - Math.PI / 2
                    const endX = center + maxRadius * Math.cos(a)
                    const endY = center + maxRadius * Math.sin(a)
                    const textX = center + (maxRadius + 18) * Math.cos(a)
                    const textY = center + (maxRadius + 14) * Math.sin(a)
                    return (
                        <g key={d.label}>
                            <line x1={center} y1={center} x2={endX} y2={endY} stroke="rgba(255,255,255,0.04)" />
                            <text x={textX} y={textY} textAnchor="middle" alignmentBaseline="middle" fill="rgba(255,255,255,0.55)" fontSize="9" fontWeight="500">{d.label}</text>
                        </g>
                    )
                })}
                <polygon points={pathData} fill="rgba(99, 102, 241, 0.2)" stroke="#6366f1" strokeWidth="1.5" style={{ filter: "drop-shadow(0 0 6px rgba(99,102,241,0.4))" }} />
                {data.map((d, i) => {
                    const [x, y] = getPoint(d.score, i).split(",")
                    return <circle key={`dot-${i}`} cx={x} cy={y} r={3} fill="#fff" stroke="#6366f1" strokeWidth={1.5} />
                })}
            </svg>
        </div>
    )
}

function AccuracyGauge({ percent }: { percent: number }) {
    const r = 36
    const c = Math.PI * (r * 2)
    const pct = Math.max(0, Math.min(100, percent))
    const dashoffset = ((100 - pct) / 100) * c
    const color = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444"

    return (
        <div className="flex flex-col items-center justify-center">
            <div className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Accuracy</div>
            <div className="relative flex items-center justify-center">
                <svg fill="transparent" width="100" height="100" viewBox="0 0 100 100">
                    <circle className="text-navy-700" strokeWidth="8" stroke="currentColor" r={r} cx="50" cy="50" />
                    <circle
                        className="transition-all duration-1000 ease-out"
                        strokeWidth="8"
                        strokeDasharray={c}
                        strokeDashoffset={dashoffset}
                        strokeLinecap="round"
                        stroke={color}
                        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", filter: `drop-shadow(0 0 4px ${color}60)` }}
                        r={r}
                        cx="50"
                        cy="50"
                    />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-lg font-bold" style={{ color }}>{Math.round(pct)}%</span>
                </div>
            </div>
            <div className="mt-1.5 text-[10px] text-white/40 text-center max-w-[140px]">
                {pct >= 80 ? "Excellent accuracy" : pct >= 50 ? "Good — keep practicing" : "Needs improvement"}
            </div>
        </div>
    )
}

function TimeAnalytics({ papers }: { papers: any[] }) {
    const avgSpeed = useMemo(() => {
        if (!papers || papers.length === 0) return 0
        let totalSec = 0
        let totalQ = 0
        papers.forEach(p => {
            totalSec += p.totalTimeSeconds || 0
            totalQ += p.total || 0
        })
        if (totalQ === 0) return 0
        return totalSec / totalQ
    }, [papers])

    const speedRating = avgSpeed > 0 && avgSpeed <= 15 ? "Fast" : avgSpeed > 15 && avgSpeed <= 30 ? "Average" : avgSpeed > 30 ? "Slow" : "N/A"

    return (
        <div className="flex flex-col items-center justify-center">
            <div className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Speed</div>
            <div className="text-2xl font-black tabular-nums text-white/90">{avgSpeed > 0 ? `${avgSpeed.toFixed(1)}s` : "—"}</div>
            <div className="text-[10px] text-white/40 mt-0.5">avg per question</div>
            <div className={`mt-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${speedRating === "Fast" ? "text-emerald-400 bg-emerald-500/10" : speedRating === "Average" ? "text-amber-400 bg-amber-500/10" : "text-red-400 bg-red-500/10"}`}>
                {speedRating}
            </div>
        </div>
    )
}

/** AI-powered personal insight that changes every time */
function AIInsightCard({ stats, completedPapers }: { stats: any; completedPapers: any[] }) {
    const [insight, setInsight] = useState<string>("")
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const avg = stats?.averageScore ?? 0
        const quizCount = completedPapers?.length ?? 0

        // Try to get a fresh AI insight
        fetch("/api/ai/explain", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                prompt: `You are a concise learning coach. The student has completed ${quizCount} quizzes with an average score of ${avg}%. Write a unique, 2-sentence motivational insight about their performance. Be specific, encouraging, and suggest one concrete improvement tip. Don't repeat yourself — vary your advice each time. Keep it under 60 words.`,
            }),
        })
            .then((r) => r.json())
            .then((j) => {
                if (j?.data || j?.content || j?.text) {
                    setInsight(String(j.data ?? j.content ?? j.text).trim())
                } else {
                    throw new Error("No content")
                }
            })
            .catch(() => {
                // Fallback: generate a random local insight
                const tips = [
                    `With ${quizCount} quizzes completed and ${avg}% accuracy, you're building solid knowledge. Try focusing on speed — aim to answer within 20 seconds per question.`,
                    `Your ${avg}% average shows consistent effort! To push higher, review incorrect answers after each quiz to spot patterns in your mistakes.`,
                    `${quizCount} quizzes down — impressive dedication! Consider revisiting topics where you scored below 70% to strengthen weak areas.`,
                    `You've maintained ${avg}% accuracy across ${quizCount} quizzes. Challenge yourself with harder categories to unlock your full potential.`,
                    `Great progress! Your ${avg}% score shows strong fundamentals. Try daily practice at the same time to build a habit and improve retention.`,
                ]
                setInsight(tips[Math.floor(Math.random() * tips.length)])
            })
            .finally(() => setLoading(false))
    }, [stats, completedPapers])

    return (
        <div className="rounded-xl border border-indigo-500/15 bg-indigo-500/[0.04] p-3.5">
            <div className="flex items-center gap-1.5 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">AI Personal Insight</span>
            </div>
            {loading ? (
                <div className="h-8 w-full bg-white/5 rounded animate-pulse" />
            ) : (
                <p className="text-xs text-white/60 leading-relaxed">{insight}</p>
            )}
        </div>
    )
}

export default function UserInsights({ completedPapers, stats }: { completedPapers: any[], stats: any }) {
    const mockSkills = useMemo(() => {
        const avg = stats?.averageScore ?? 50
        return [
            { label: "Logical", value: Math.min(100, Math.max(0, avg + (Math.random() * 20 - 5))) },
            { label: "Aptitude", value: Math.min(100, Math.max(0, avg + (Math.random() * 30 - 15))) },
            { label: "General", value: Math.min(100, Math.max(0, avg + (Math.random() * 20 - 10))) },
            { label: "Verbal", value: Math.min(100, Math.max(0, avg + (Math.random() * 25 - 12))) },
            { label: "Current", value: Math.min(100, Math.max(0, avg + (Math.random() * 30 - 15))) },
        ]
    }, [stats])

    return (
        <div className="animate-fade space-y-4">
            {/* AI Insight — changes every visit */}
            <AIInsightCard stats={stats} completedPapers={completedPapers} />

            {/* Compact stats row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="card p-3">
                    <AccuracyGauge percent={stats?.averageScore ?? 0} />
                </div>
                <div className="card p-3">
                    <TimeAnalytics papers={completedPapers} />
                </div>
                <div className="card p-3 md:col-span-3">
                    <SkillRadar skills={mockSkills} />
                </div>
            </div>
        </div>
    )
}
