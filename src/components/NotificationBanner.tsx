"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface Notice {
    id: string
    title: string
    message: string
    type: "quiz" | "tournament" | "admin"
    link?: string
}

export default function NotificationBanner() {
    const [notices, setNotices] = useState<Notice[]>([])
    const [currentIdx, setCurrentIdx] = useState(0)

    useEffect(() => {
        const fetchNotices = async () => {
            try {
                const safeFetch = (url: string) => fetch(url, { cache: "no-store" }).then(r => r.ok ? r.json() : null).catch(() => null)
                const [quizzes, tourns, adminNotices, settings] = await Promise.all([
                    safeFetch("/api/quizzes"),
                    safeFetch("/api/tournaments"),
                    safeFetch("/api/notices/public").then(j => j ?? { data: [] }),
                    safeFetch("/api/settings").then(j => j ?? {})
                ])

                const newNotices: Notice[] = []

                // Admin Notices (High Priority)
                if (Array.isArray(adminNotices?.data)) {
                    adminNotices.data.forEach((n: any) => {
                        newNotices.push({
                            id: `a-${n.id}`,
                            title: n.title,
                            message: n.message,
                            type: "admin",
                            link: n.link
                        })
                    })
                }

                // New Quiz Notice (last 24h)
                const recentQuiz = (quizzes?.data || []).filter((q: any) =>
                    q.created_at && (Date.now() - new Date(q.created_at).getTime() < 86400000)
                )
                if (recentQuiz.length > 0) {
                    newNotices.push({
                        id: `q-${recentQuiz[0].id}`,
                        title: "New Quiz!",
                        message: recentQuiz[0].title || "A fresh quiz is ready for you.",
                        type: "quiz",
                        link: "/daily-quiz"
                    })
                } else if (settings?.data?.showDemoQuestions) {
                    newNotices.push({
                        id: "demo-questions",
                        title: "Demo Questions",
                        message: "Get ready! Practice with our free demo questions.",
                        type: "quiz",
                        link: "/daily-quiz"
                    })
                }

                // Active Tournament Notice
                const activeTourn = (tourns?.data || []).filter((t: any) =>
                    t.endTime && (new Date(t.endTime).getTime() > Date.now())
                )
                if (activeTourn.length > 0) {
                    newNotices.push({
                        id: `t-${activeTourn[0].id}`,
                        title: "Live Tournament",
                        message: activeTourn[0].title || "Join now to win big prizes!",
                        type: "tournament",
                        link: "/home#tournaments"
                    })
                }

                setNotices(newNotices)
            } catch (err) {
                console.error("Failed to fetch notices:", err)
            }
        }

        fetchNotices()
        const interval = setInterval(fetchNotices, 300000) // 5 min
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        if (notices.length <= 1) return
        const interval = setInterval(() => {
            setCurrentIdx((prev) => (prev + 1) % notices.length)
        }, 6000)
        return () => clearInterval(interval)
    }, [notices])

    if (notices.length === 0) return null

    const current = notices[currentIdx]

    return (
        <div className="relative z-40 px-4 pt-4 pb-2 max-w-7xl mx-auto w-full">
            <AnimatePresence mode="wait">
                <motion.div
                    key={current.id}
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={`
            relative overflow-hidden p-3 sm:p-4 rounded-2xl border shadow-sm
            ${current.type === "quiz" ? "bg-[#eef3fe] border-[#7c3aed]/20 shadow-[#7c3aed]/10" :
                            current.type === "tournament" ? "bg-[#fff7ed] border-[#f97316]/20 shadow-[#f97316]/10" :
                                "bg-white border-[#e8eaf0] shadow-slate-100"}
          `}
                >
                    {/* Decorative background glow */}
                    <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-[40px] opacity-10 ${current.type === "quiz" ? "bg-[#7c3aed]" : "bg-[#f97316]"
                        }`} />

                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className={`
                w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 font-black
                ${current.type === "quiz" ? "bg-[#7c3aed]/10 text-[#7c3aed]" : "bg-[#f97316]/10 text-[#f97316]"}
              `}>
                                {current.type === "quiz" ? "Q" : current.type === "tournament" ? "T" : "N"}
                            </div>
                            <div>
                                <div className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${current.type === "quiz" ? "text-[#7c3aed]" : "text-[#64748b]"}`}>{current.title}</div>
                                <div className="text-sm sm:text-base font-black text-[#1a2340] line-clamp-1">{current.message}</div>
                            </div>
                        </div>

                        <a
                            href={current.link}
                            className={`
                px-5 py-2.5 rounded-xl font-black text-sm transition-all whitespace-nowrap uppercase tracking-widest
                ${current.type === "quiz" ? "bg-[#7c3aed] text-white hover:scale-105 shadow-[#7c3aed]/20" : "bg-[#f97316] text-white hover:scale-105 shadow-[#f97316]/20"}
                shadow-xl
              `}
                        >
                            Play Now →
                        </a>
                    </div>

                    {/* Progress bar for auto-cycling */}
                    {notices.length > 1 && (
                        <div className="absolute bottom-0 left-0 h-0.5 bg-[#f1f5f9] w-full overflow-hidden">
                            <motion.div
                                key={currentIdx}
                                initial={{ width: 0 }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 6, ease: "linear" }}
                                className={`h-full ${current.type === "quiz" ? "bg-[#7c3aed]" : "bg-[#f97316]"}`}
                            />
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    )
}
