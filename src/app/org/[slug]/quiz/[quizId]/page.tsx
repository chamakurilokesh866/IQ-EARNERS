"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

type QuizData = {
  id: string; title: string; category: string; difficulty: string;
  questions: { question: string; options: string[]; correct: number; explanation?: string }[]
  timePerQuestion?: number
}

const sendIntegrityEvent = async (
  slug: string,
  quizId: string,
  type: "tab_hidden" | "window_blur" | "fullscreen_exit" | "other",
  message: string,
  meta?: Record<string, unknown>
) => {
  try {
    await fetch(`/api/org/${slug}/integrity`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ quizId, type, message, meta })
    })
  } catch {
    // ignore integrity network failure
  }
}

export default function OrgQuizPage() {
  const { slug, quizId } = useParams<{ slug: string; quizId: string }>()
  const router = useRouter()
  const [quiz, setQuiz] = useState<QuizData | null>(null)
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<{ score: number; total: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [startTime] = useState(Date.now())

  useEffect(() => {
    fetch(`/api/org/${slug}/quizzes/${quizId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setQuiz(j.data)
          setAnswers(new Array(j.data.questions.length).fill(null))
        } else router.replace(`/org/${slug}`)
      })
      .catch(() => router.replace(`/org/${slug}`))
      .finally(() => setLoading(false))
  }, [slug, quizId, router])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        void sendIntegrityEvent(slug, quizId, "tab_hidden", "User switched tab or minimized window")
      }
    }
    const onBlur = () => {
      void sendIntegrityEvent(slug, quizId, "window_blur", "Window lost focus")
    }
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("blur", onBlur)
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("blur", onBlur)
    }
  }, [slug, quizId])

  const selectAnswer = (optIdx: number) => {
    if (submitted) return
    setAnswers((prev) => { const n = [...prev]; n[current] = optIdx; return n })
  }

  const handleSubmit = async () => {
    if (!quiz) return
    setSubmitting(true)
    const timeSeconds = Math.round((Date.now() - startTime) / 1000)
    try {
      const res = await fetch(`/api/org/${slug}/quizzes/${quizId}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answers.map((a) => a ?? -1), timeSeconds })
      })
      const j = await res.json()
      if (j.ok) { setResult(j.data); setSubmitted(true) }
    } catch { /* ignore */ }
    finally { setSubmitting(false) }
  }

  if (loading || !quiz) {
    return <div className="min-h-screen app-page-surface flex items-center justify-center"><div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" /></div>
  }

  const q = quiz.questions[current]
  const total = quiz.questions.length
  const answeredCount = answers.filter((a) => a !== null).length

  if (submitted && result) {
    const pct = Math.round((result.score / result.total) * 100)
    return (
      <div className="min-h-screen app-page-surface flex flex-col items-center justify-center px-4 text-white">
        <div className="w-full max-w-md text-center">
          <div className="text-6xl mb-4">{pct >= 80 ? "🏆" : pct >= 50 ? "👍" : "📖"}</div>
          <h1 className="text-3xl font-black mb-2">{result.score}/{result.total}</h1>
          <p className="text-white/50 text-sm mb-2">{quiz.title}</p>
          <p className="text-lg font-bold mb-8" style={{ color: pct >= 80 ? "#34d399" : pct >= 50 ? "#fbbf24" : "#f87171" }}>
            {pct >= 80 ? "Excellent!" : pct >= 50 ? "Good effort!" : "Keep practicing!"}
          </p>

          <div className="space-y-3 text-left mb-8">
            {quiz.questions.map((question, i) => {
              const userAns = answers[i]
              const isCorrect = userAns === Math.min(Math.max(0, Number(question.correct) || 0), Math.max(0, question.options.length - 1))
              return (
                <div key={i} className={`rounded-xl border p-4 ${isCorrect ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                  <p className="text-xs font-bold mb-1">Q{i + 1}: {question.question}</p>
                  <p className="text-[10px] text-white/50">Your answer: {userAns !== null && userAns >= 0 ? question.options[userAns] : "Skipped"}</p>
                  {!isCorrect && <p className="text-[10px] text-emerald-400">Correct: {question.options[question.correct]}</p>}
                  {question.explanation && <p className="text-[10px] text-white/30 mt-1">{question.explanation}</p>}
                </div>
              )
            })}
          </div>

          <Link href={`/org/${slug}`} className="rounded-xl bg-cyan-500 px-6 py-3 text-sm font-black text-slate-900 hover:bg-cyan-400 transition-colors">
            Back to Portal
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen app-page-surface text-white flex flex-col">
      <header className="border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="font-bold text-sm text-white truncate">{quiz.title}</h1>
          <p className="text-[9px] text-white/40 uppercase tracking-widest">{quiz.category} · {quiz.difficulty}</p>
        </div>
        <div className="text-xs text-white/50 font-bold tabular-nums shrink-0">
          {current + 1} / {total}
        </div>
      </header>

      <div className="w-full h-1 bg-white/5">
        <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${((current + 1) / total) * 100}%` }} />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-2xl mx-auto w-full">
        <h2 className="text-lg sm:text-xl font-black text-center mb-8 leading-relaxed">{q.question}</h2>

        <div className="w-full space-y-3 mb-8">
          {q.options.map((opt, i) => (
            <button key={i} onClick={() => selectAnswer(i)} className={`w-full text-left rounded-xl border p-4 text-sm font-bold transition-all ${answers[current] === i ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-200" : "bg-white/[0.03] border-white/10 text-white/80 hover:border-white/20 hover:bg-white/[0.05]"}`}>
              <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg bg-white/5 text-[10px] font-black mr-3 shrink-0">{String.fromCharCode(65 + i)}</span>
              {opt}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full">
          <button onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0} className="rounded-xl border border-white/10 px-5 py-2.5 text-xs font-bold text-white/50 hover:text-white disabled:opacity-30 transition-all">
            Previous
          </button>
          <div className="flex-1" />
          {current < total - 1 ? (
            <button onClick={() => setCurrent(current + 1)} className="rounded-xl bg-cyan-500 px-5 py-2.5 text-xs font-black text-slate-900">
              Next
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting} className="rounded-xl bg-emerald-500 px-6 py-2.5 text-xs font-black text-slate-900 disabled:opacity-50">
              {submitting ? "Submitting…" : `Submit (${answeredCount}/${total} answered)`}
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
