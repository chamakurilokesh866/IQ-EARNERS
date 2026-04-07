"use client"

import { useEffect, useState } from "react"
import TransitionLink from "./TransitionLink"

export default function NewQuizBanner() {
  const [quiz, setQuiz] = useState<{ id: string; title: string; questionCount: number } | null>(null)

  useEffect(() => {
    fetch("/api/quizzes/newest", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j?.ok && j?.data) setQuiz(j.data)
      })
      .catch(() => {})
  }, [])

  if (!quiz) return null

  return (
    <TransitionLink
      href={`/daily-quiz${quiz.id ? `?quizId=${encodeURIComponent(quiz.id)}` : ""}`}
      className="mt-4 block rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/15 to-accent/10 px-4 py-4 sm:px-5 sm:py-5 hover:border-primary/60 hover:from-primary/20 hover:to-accent/15 transition-all"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="shrink-0 w-10 h-10 rounded-xl bg-primary/30 border border-primary/50 flex items-center justify-center text-lg">✨</span>
          <div className="min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-primary/90 font-semibold">New Quiz</span>
            <p className="font-semibold text-white truncate">{quiz.title}</p>
            <p className="text-xs text-white/60 mt-0.5">
              {quiz.questionCount} questions • Play now
            </p>
          </div>
        </div>
        <span className="shrink-0 text-primary font-semibold">→</span>
      </div>
    </TransitionLink>
  )
}
