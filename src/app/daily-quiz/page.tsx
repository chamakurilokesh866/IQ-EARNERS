"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import Navbar from "../../components/Navbar"
import DailyQuiz from "../../components/DailyQuiz"
import AdSlot from "../../components/AdSlot"
import { QuizErrorBoundary } from "../../components/QuizErrorBoundary"
import { useQuizFullscreen } from "@/context/QuizFullscreenContext"
import PaidGate from "../../components/PaidGate"

export default function Page() {
  const quizFullscreenRef = useRef<HTMLDivElement>(null)
  const [quizFullscreenActive, setQuizFullscreenActive] = useState(false)
  const { setActive } = useQuizFullscreen()
  const onFullscreenChange = useCallback((active: boolean) => {
    setQuizFullscreenActive(active)
  }, [])
  useEffect(() => {
    setActive(quizFullscreenActive)
    return () => setActive(false)
  }, [quizFullscreenActive, setActive])
  useEffect(() => {
    if (typeof document === "undefined") return
    if (quizFullscreenActive) document.body.classList.add("quiz-fullscreen-active")
    else document.body.classList.remove("quiz-fullscreen-active")
    return () => document.body.classList.remove("quiz-fullscreen-active")
  }, [quizFullscreenActive])
  return (
    <PaidGate>
      <main className="flex min-h-screen flex-col app-page-surface text-slate-900 dark:text-slate-100">
        {!quizFullscreenActive && <Navbar />}
        <div
          ref={quizFullscreenRef}
          className={`quiz-fullscreen-target ${quizFullscreenActive ? "min-h-screen" : "min-h-[calc(100dvh-4rem)] lg:min-h-0 lg:flex-1"} flex flex-col`}
        >
          <section className="mx-auto w-full max-w-2xl px-4 sm:px-6 pt-2 lg:pt-1 flex flex-1 flex-col">
            {!quizFullscreenActive && <AdSlot slotId="quiz_between" />}
            <QuizErrorBoundary>
              <DailyQuiz fullscreenContainerRef={quizFullscreenRef} onFullscreenChange={onFullscreenChange} />
            </QuizErrorBoundary>
            {!quizFullscreenActive && <AdSlot slotId="quiz_bottom" />}
          </section>
        </div>
      </main>
    </PaidGate>
  )
}
