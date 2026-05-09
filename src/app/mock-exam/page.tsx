"use client"

import { useEffect, useState, useRef } from "react"
import Navbar from "@/components/Navbar"
import TransitionLink from "@/components/TransitionLink"
import InspectGuard from "@/components/InspectGuard"
import SingleTabEnforcer from "@/components/SingleTabEnforcer"
import PaidGate from "@/components/PaidGate"

function formatTime(secs: number) {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60

    if (h > 0) return `${h}h ${m}m ${s}s`
    return `${m}m ${s}s`
}

type Course = { id: string; name: string; modules: { name: string; count: number }[]; totalQuestions: number }
type Module = { name: string; questions: { id: number; question: string; options: string[] }[] }

export default function MockExamPage() {
    const [courses, setCourses] = useState<Course[]>([])
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
    const [questions, setQuestions] = useState<any[]>([])
    const [modules, setModules] = useState<Module[] | null>(null)
    const [answers, setAnswers] = useState<Record<number, number>>({})
    const [loading, setLoading] = useState(true)
    const [timeLeft, setTimeLeft] = useState(3 * 60 * 60)
    const [submitting, setSubmitting] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [started, setStarted] = useState(false)
    const [currentIdx, setCurrentIdx] = useState(0)
    const [totalDuration, setTotalDuration] = useState(3 * 60 * 60)

    useEffect(() => {
        fetch("/api/stats/public")
            .then(r => r.ok ? r.json() : null)
            .then(j => { if (!j) return
                if (j?.data) {
                    const dur = Number(j.data.mockExamDuration || 180)
                    setTimeLeft(dur * 60)
                    setTotalDuration(dur * 60)
                }
            })
            .catch(() => { })

        fetch("/api/mock-exam/courses")
            .then(r => r.ok ? r.json() : null)
            .then(j => { if (!j) { setLoading(false); return }
                if (j.ok && Array.isArray(j.courses) && j.courses.length > 0) {
                    setCourses(j.courses)
                    if (j.courses.length === 1) setSelectedCourse(j.courses[0])
                }
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [])

    useEffect(() => {
        if (!selectedCourse) return
        setLoading(true)
        fetch(`/api/mock-exam/questions?course=${encodeURIComponent(selectedCourse.id)}`)
            .then(r => r.ok ? r.json() : null)
            .then(j => { if (!j) { setLoading(false); return }
                if (j.ok) {
                    setQuestions(j.data || [])
                    setModules(j.modules || null)
                }
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [selectedCourse?.id])

    useEffect(() => {
        if (!started || result || timeLeft <= 0) return
        const id = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) {
                    submitExam(answers)
                    return 0
                }
                return t - 1
            })
        }, 1000)
        return () => clearInterval(id)
    }, [started, result, timeLeft, answers])

    const submitExam = async (finalAnswers: Record<number, number>) => {
        setSubmitting(true)
        try {
            const res = await fetch("/api/mock-exam/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    answers: finalAnswers,
                    timeTaken: totalDuration - timeLeft,
                    course: selectedCourse?.id || "main"
                })
            })
            const j = await res.json()
            if (j.ok) {
                setResult(j)
            } else {
                alert("Failed to save results. Refresh to try again.")
            }
        } catch {
            alert("Error submitting exam.")
        }
        setSubmitting(false)
    }

    if (loading && courses.length === 0) {
        return <PaidGate><div className="min-h-screen flex items-center justify-center app-page-surface text-white"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div></PaidGate>
    }

    if (courses.length === 0) {
        return (
            <PaidGate>
            <main className="min-h-screen app-page-surface text-white mock-premium-shell">
                <Navbar />
                <div className="max-w-2xl mx-auto mt-20 p-8 text-center bg-navy-800 rounded-2xl">
                    <h2 className="text-2xl font-bold mb-4">Mock Exam not available</h2>
                    <p className="text-navy-300 mb-6">The administrator has not uploaded the mock exam questions yet.</p>
                    <TransitionLink href="/user" className="admin-btn admin-btn-primary mx-auto">Back to Dashboard</TransitionLink>
                </div>
            </main>
            </PaidGate>
        )
    }

    if (selectedCourse && (loading || questions.length === 0)) {
        return <div className="min-h-screen flex items-center justify-center app-page-surface text-white"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
    }

    if (courses.length > 1 && !selectedCourse) {
        return (
            <main className="min-h-screen app-page-surface text-white mock-premium-shell">
                <Navbar />
                <div className="max-w-3xl mx-auto mt-10 p-6 md:p-10 mb-20">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center text-4xl">🎓</div>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">TS/AP EAMCET Mock Exam</h1>
                    <p className="text-center text-navy-300 mb-8">Select your course to start the mock exam.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {courses.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => setSelectedCourse(c)}
                                className="p-6 rounded-2xl bg-navy-800 border border-navy-600 hover:border-emerald-500/50 hover:bg-navy-700/80 text-left transition-all"
                            >
                                <div className="font-bold text-lg mb-1">{c.name}</div>
                                <div className="text-sm text-navy-400">
                                    {c.modules.map((m) => `${m.name}: ${m.count}`).join(" • ")}
                                </div>
                                <div className="text-xs text-emerald-400 mt-2">{c.totalQuestions} questions total</div>
                            </button>
                        ))}
                    </div>
                </div>
            </main>
        )
    }

    const currentModuleName = modules && questions[currentIdx]
        ? (() => {
            const qId = questions[currentIdx]?.id
            for (const m of modules) {
                if (m.questions.some((q) => q.id === qId)) return m.name
            }
            return null
        })()
        : null

    if (!started) {
        return (
            <main className="min-h-screen app-page-surface text-white mock-premium-shell">
                <Navbar />
                <div className="max-w-3xl mx-auto mt-10 p-6 md:p-10 mb-20 bg-navy-800 rounded-3xl border border-emerald-500/20 shadow-2xl">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center text-4xl shadow-[0_0_20px_rgba(34,197,94,0.3)]">🎓</div>
                    </div>
                    <h1 className="text-3xl font-bold text-center mb-2">TS/AP EAMCET Mock Exam</h1>
                    {selectedCourse && (
                        <p className="text-center text-emerald-400 font-semibold mb-2">{selectedCourse.name}</p>
                    )}
                    <p className="text-center text-navy-300 mb-8 max-w-xl mx-auto">
                        Based on previous year exam patterns. Prepare as if you are in the actual examination hall.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                        <div className="bg-navy-700/50 p-4 rounded-2xl flex flex-col items-center">
                            <span className="text-2xl mb-2">⏱️</span>
                            <span className="font-bold text-lg">{Math.floor(totalDuration / 60)} min</span>
                            <span className="text-xs text-navy-400">Total Duration</span>
                        </div>
                        <div className="bg-navy-700/50 p-4 rounded-2xl flex flex-col items-center">
                            <span className="text-2xl mb-2">📝</span>
                            <span className="font-bold text-lg">{questions.length}</span>
                            <span className="text-xs text-navy-400">Questions</span>
                        </div>
                        <div className="bg-navy-700/50 p-4 rounded-2xl flex flex-col items-center">
                            <span className="text-2xl mb-2">🛡️</span>
                            <span className="font-bold text-lg">Anti-Cheat</span>
                            <span className="text-xs text-navy-400">Enabled</span>
                        </div>
                    </div>

                    <div className="bg-navy-900/50 p-5 rounded-2xl mb-8 border border-white/5 space-y-3">
                        <h3 className="font-bold flex items-center gap-2"><span>⚠️</span> Important Rules</h3>
                        <ul className="text-sm text-navy-200 space-y-2 list-disc pl-5 marker:text-emerald-500">
                            <li>Do not leave the tab or switch windows. Doing so may immediately terminate the exam.</li>
                            <li>Wait until you have completed all questions before clicking submit.</li>
                            <li>Calculators and external aids are strictly prohibited.</li>
                            <li>This exam outcome will securely log to your profile history, but not affect your public leaderboard score.</li>
                        </ul>
                    </div>

                    <button
                        onClick={() => setStarted(true)}
                        className="w-full py-5 rounded-xl font-bold text-xl text-black hover:-translate-y-1 transition-transform shadow-[0_0_30px_rgba(34,197,94,0.4)]"
                        style={{ background: "linear-gradient(135deg, #10b981 0%, #34d399 100%)" }}
                    >
                        Start the Exam Now
                    </button>
                </div>
            </main>
        )
    }

    if (result) {
        return (
            <main className="min-h-screen app-page-surface text-white pb-20 mock-premium-shell">
                <Navbar />
                <div className="max-w-4xl mx-auto mt-10 p-6">
                    <div className="bg-navy-800 rounded-3xl p-8 border border-white/10 text-center mb-10">
                        <div className="w-24 h-24 rounded-full bg-emerald-500/20 mx-auto mb-4 flex items-center justify-center text-5xl">
                            {result.score / result.total > 0.8 ? "🏆" : result.score / result.total > 0.5 ? "👍" : "📚"}
                        </div>
                        <h2 className="text-3xl font-bold mb-2">Exam Completed!</h2>
                        <div className="text-6xl font-black tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-primary mb-2">
                            {result.score} <span className="text-3xl text-navy-400 font-bold">/ {result.total}</span>
                        </div>
                        <p className="text-navy-300">Detailed performance report saved to your dashboard.</p>

                        <div className="mt-8 flex justify-center gap-4">
                            <TransitionLink href="/user" className="px-8 py-3 rounded-xl bg-navy-700 hover:bg-navy-600 font-bold">Close Exam</TransitionLink>
                        </div>
                    </div>

                    <h3 className="text-xl font-bold mb-4">Detailed Report</h3>
                    <div className="space-y-6">
                        {result.results.map((r: any, i: number) => (
                            <div key={i} className={`p-6 rounded-2xl border ${r.isCorrect ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                                <div className="font-bold mb-3 flex items-start gap-3">
                                    <span className="w-8 h-8 rounded-full bg-navy-800 flex shrink-0 items-center justify-center text-sm">{i + 1}</span>
                                    <span className="pt-1">{r.question}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-11">
                                    {r.options.map((opt: string, optIdx: number) => {
                                        const isCorrect = r.correct === optIdx
                                        const isSelected = r.userAnswer === optIdx

                                        let bg = "bg-navy-800 border border-navy-700"
                                        let status = ""
                                        if (isCorrect) {
                                            bg = "bg-emerald-500/20 border border-emerald-500 text-emerald-100"
                                            status = "✓ Correct"
                                        } else if (isSelected && !isCorrect) {
                                            bg = "bg-red-500/20 border border-red-500 text-red-100"
                                            status = "✗ Your Answer"
                                        }

                                        return (
                                            <div key={optIdx} className={`p-3 rounded-xl flex items-center gap-3 ${bg}`}>
                                                <span className="font-mono text-xs opacity-50">{String.fromCharCode(65 + optIdx)}</span>
                                                <span>{opt}</span>
                                                {status && <span className="ml-auto text-xs font-bold opacity-80">{status}</span>}
                                            </div>
                                        )
                                    })}
                                </div>
                                {r.explanation && (
                                    <div className="mt-4 pl-11">
                                        <div className="p-3 rounded-xl bg-navy-900 border border-navy-800 text-sm flex gap-2">
                                            <span>💡</span>
                                            <span className="text-navy-300">{r.explanation}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        )
    }

    const answeredCount = Object.keys(answers).length
    const q = questions[currentIdx]

    return (
        <main className="min-h-screen app-page-surface text-white flex flex-col h-screen overflow-hidden select-none mock-premium-shell">
            <InspectGuard />
            <SingleTabEnforcer />

            {/* Top Bar fixed */}
            <div className="bg-navy-950 border-b border-white/5 px-6 py-4 flex items-center justify-between shrink-0 shadow-lg">
                <div className="flex items-center gap-3">
                    <span className="text-xl">🎓</span>
                    <span className="font-bold hidden sm:inline text-lg">TS/AP Mock Exam</span>
                </div>

                <div className="flex items-center gap-8">
                    <div className="text-center">
                        <div className="text-[10px] text-navy-400 uppercase tracking-widest font-bold mb-0.5">Time Remaining</div>
                        <div className={`font-mono font-bold text-xl tabular-nums ${timeLeft < 300 ? "text-red-400 animate-pulse" : "text-emerald-400"}`}>
                            {formatTime(timeLeft)}
                        </div>
                    </div>

                    <div className="text-center hidden sm:block">
                        <div className="text-[10px] text-navy-400 uppercase tracking-widest font-bold mb-0.5">Progress</div>
                        <div className="font-bold text-lg"><span className="text-primary">{answeredCount}</span> / {questions.length}</div>
                    </div>

                    <button
                        onClick={() => {
                            if (confirm("Are you sure you want to completely finish and submit the exam?")) submitExam(answers)
                        }}
                        disabled={submitting}
                        className="px-6 py-2.5 rounded-xl bg-primary text-black font-bold hover:scale-105 active:scale-95 transition-all text-sm"
                    >
                        {submitting ? "Submitting..." : "Submit Exam"}
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Main viewing area */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-10 hide-scrollbar">
                    <div className="max-w-3xl mx-auto">
                        <div className="mb-8">
                            {currentModuleName && (
                                <div className="text-emerald-400 font-semibold text-sm uppercase tracking-wider mb-2">
                                    Section: {currentModuleName}
                                </div>
                            )}
                            <span className="inline-block px-3 py-1 rounded-full bg-navy-800 text-primary text-sm font-bold mb-4">
                                Question {currentIdx + 1} of {questions.length}
                            </span>
                            <h2 className="text-2xl font-semibold leading-relaxed">
                                {q?.question}
                            </h2>
                        </div>

                        <div className="space-y-4">
                            {q?.options?.map((opt: string, optIdx: number) => {
                                const selected = answers[currentIdx] === optIdx
                                return (
                                    <button
                                        key={optIdx}
                                        onClick={() => setAnswers(prev => ({ ...prev, [currentIdx]: optIdx }))}
                                        className={`block w-full text-left p-5 rounded-2xl border transition-all duration-200 text-lg ${selected
                                            ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(124,58,237,0.2)]"
                                            : "border-navy-700 bg-navy-800 hover:border-navy-500 hover:bg-navy-700"
                                            }`}
                                    >
                                        <div className="flex gap-4">
                                            <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold ${selected ? "bg-primary text-black" : "bg-navy-800 border border-navy-600 text-navy-400"
                                                }`}>
                                                {String.fromCharCode(65 + optIdx)}
                                            </span>
                                            <span className="pt-0.5">{opt}</span>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        <div className="mt-12 flex items-center justify-between border-t border-navy-800 pt-6">
                            <button
                                onClick={() => setCurrentIdx(p => Math.max(0, p - 1))}
                                disabled={currentIdx === 0}
                                className="px-6 py-3 rounded-xl bg-navy-800 hover:bg-navy-700 disabled:opacity-30 disabled:pointer-events-none font-bold transition-all"
                            >
                                ← Previous
                            </button>

                            <button
                                onClick={() => setCurrentIdx(p => Math.min(questions.length - 1, p + 1))}
                                disabled={currentIdx === questions.length - 1}
                                className="px-8 py-3 rounded-xl bg-navy-700 hover:bg-navy-600 disabled:opacity-30 disabled:pointer-events-none font-bold transition-all"
                            >
                                Next →
                            </button>
                        </div>
                    </div>
                </div>

                {/* OMR Right Panel (Question Grid) */}
                <div className="w-64 bg-navy-950 border-l border-white/5 flex flex-col hidden lg:flex">
                    <div className="p-4 border-b border-white/5">
                        <h3 className="font-bold text-sm uppercase tracking-widest text-navy-300">Question Grid</h3>
                    </div>
                    <div className="p-4 grid grid-cols-5 gap-2 overflow-y-auto content-start flex-1 hide-scrollbar">
                        {questions.map((_, i) => {
                            const isAnswered = answers[i] !== undefined
                            const isCurrent = currentIdx === i

                            let bg = "bg-navy-800 text-navy-400 border-transparent hover:border-navy-500"
                            if (isCurrent) bg = "bg-primary text-black font-bold shadow-lg scale-110 z-10 border-black/20"
                            else if (isAnswered) bg = "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"

                            return (
                                <button
                                    key={i}
                                    onClick={() => setCurrentIdx(i)}
                                    className={`aspect-square rounded-lg border text-xs flex items-center justify-center transition-all ${bg}`}
                                >
                                    {i + 1}
                                </button>
                            )
                        })}
                    </div>
                    <div className="p-4 border-t border-white/5 text-xs text-navy-400 flex flex-col gap-2">
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/50" /> Answered</div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-navy-800" /> Unanswered</div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-primary" /> Current</div>
                    </div>
                </div>
            </div>
        </main>
    )
}
