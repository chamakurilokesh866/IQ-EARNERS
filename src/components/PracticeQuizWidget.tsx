"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"

type PracticeQuestion = {
  question: string
  options: string[]
  correct: number
  explanation?: string
}

type QuizState = "idle" | "generating" | "playing" | "result" | "completed"

const CATEGORIES = [
  { label: "🌍 General Knowledge", value: "General Knowledge" },
  { label: "🔬 Basic Science", value: "Basic Science" },
  { label: "🗺️ Geography", value: "World Geography" },
  { label: "⚽ Sports", value: "Sports & Games" },
  { label: "🚀 Space", value: "Space & Planets" },
  { label: "🧮 Logic", value: "Simple Mathematics & Logic" },
]

export default function PracticeQuizWidget({ onPayClick }: { onPayClick: () => void }) {
  const [state, setState] = useState<QuizState>("idle")
  const [questions, setQuestions] = useState<PracticeQuestion[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [score, setScore] = useState(0)
  const [topic, setTopic] = useState("")
  const [error, setError] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [timeLeft, setTimeLeft] = useState(15)
  const [timerActive, setTimerActive] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Timer countdown
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setTimerActive(false)
          // Auto-reveal answer if time runs out
          if (selectedOption === null) {
            setShowAnswer(true)
          }
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [timerActive, timeLeft, selectedOption])

  const generateQuiz = useCallback(async () => {
    setState("generating")
    setError("")
    setQuestions([])
    setCurrentIdx(0)
    setScore(0)
    setSelectedOption(null)
    setShowAnswer(false)

    try {
      const res = await fetch("/api/practice-quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: selectedCategory || undefined })
      })
      const data = await res.json()
      if (!data.ok || !data.questions?.length) {
        setError(data.error || "Failed to generate questions. Try again.")
        setState("idle")
        return
      }
      setQuestions(data.questions)
      setTopic(data.topic || "General Knowledge")
      setState("playing")
      setTimeLeft(15)
      setTimerActive(true)
    } catch {
      setError("Network error. Please check your connection.")
      setState("idle")
    }
  }, [selectedCategory])

  const handleOptionSelect = (optIdx: number) => {
    if (showAnswer || selectedOption !== null) return
    setSelectedOption(optIdx)
    setTimerActive(false)
    setShowAnswer(true)
    if (optIdx === questions[currentIdx].correct) {
      setScore((s) => s + 1)
    }
  }

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1)
      setSelectedOption(null)
      setShowAnswer(false)
      setTimeLeft(15)
      setTimerActive(true)
    } else {
      setState("completed")
      setTimerActive(false)
    }
  }

  const resetQuiz = () => {
    setState("idle")
    setQuestions([])
    setCurrentIdx(0)
    setScore(0)
    setSelectedOption(null)
    setShowAnswer(false)
    setError("")
    setTimeLeft(15)
    setTimerActive(false)
  }

  const currentQ = questions[currentIdx]
  const progress = questions.length > 0 ? ((currentIdx + (showAnswer ? 1 : 0)) / questions.length) * 100 : 0

  return (
    <div ref={containerRef} className="w-full max-w-xl mx-auto">
      <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
        {/* Decorative glows */}
        <div className="absolute top-0 left-0 w-40 h-40 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-cyan-500/8 rounded-full blur-[60px] pointer-events-none" />

        {/* ── IDLE STATE: Slider CTA ── */}
        <AnimatePresence mode="wait">
          {state === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="relative z-10 p-6 sm:p-8"
            >
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-black tracking-[0.3em] text-primary uppercase mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Free Practice Quiz
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Test Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400">Knowledge</span>
                </h3>
                <p className="text-xs text-white/40 mt-2 max-w-xs mx-auto leading-relaxed">
                  Try 5 AI-generated questions. Quick, fun, and free — see how you stack up!
                </p>
              </div>

              {/* Category Selection */}
              <div className="mb-5">
                <div className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-2.5 text-center">Choose a Topic</div>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setSelectedCategory(selectedCategory === cat.value ? "" : cat.value)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all duration-200 border ${
                        selectedCategory === cat.value
                          ? "bg-primary/20 border-primary/40 text-primary shadow-lg shadow-primary/10"
                          : "bg-white/[0.03] border-white/10 text-white/50 hover:text-white hover:border-white/20"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button with Slider Effect */}
              <button
                type="button"
                onClick={generateQuiz}
                className="group relative w-full h-14 rounded-2xl overflow-hidden border border-primary/30 bg-gradient-to-r from-primary/10 to-cyan-500/10 transition-all hover:border-primary/50 active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <div className="relative z-10 flex items-center justify-center gap-3">
                  <span className="text-xl">🧠</span>
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-white">Generate Questions</span>
                  <motion.span
                    animate={{ x: [0, 6, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                    className="text-primary font-bold text-lg"
                  >
                    →
                  </motion.span>
                </div>
              </button>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 text-center text-[10px] text-red-400 font-bold bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5"
                >
                  {error}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── GENERATING STATE ── */}
          {state === "generating" && (
            <motion.div
              key="generating"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 p-8 sm:p-10 flex flex-col items-center justify-center min-h-[280px] gap-6"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <motion.span
                    className="text-3xl"
                    animate={{ rotateY: [0, 360] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    🧠
                  </motion.span>
                </div>
                <motion.div
                  className="absolute -inset-3 rounded-3xl border border-primary/20"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-black text-white uppercase tracking-wider">AI is Thinking...</p>
                <p className="text-[10px] text-white/30 mt-1.5 tracking-widest uppercase">Generating 5 fun questions</p>
              </div>
              <div className="w-48 h-1 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400"
                  initial={{ width: "5%" }}
                  animate={{ width: "90%" }}
                  transition={{ duration: 8, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          )}

          {/* ── PLAYING STATE ── */}
          {(state === "playing" || state === "result") && currentQ && (
            <motion.div
              key={`question-${currentIdx}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35 }}
              className="relative z-10 p-5 sm:p-7"
            >
              {/* Header with progress */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">{topic}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-white/40 tabular-nums">
                    {currentIdx + 1}/{questions.length}
                  </span>
                  {/* Timer */}
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black tabular-nums transition-colors ${
                    timeLeft <= 5 && timerActive ? "border-red-500/40 bg-red-500/10 text-red-400" : "border-white/10 bg-white/5 text-white/60"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${timerActive ? (timeLeft <= 5 ? "bg-red-400 animate-pulse" : "bg-emerald-400") : "bg-white/20"}`} />
                    {timeLeft}s
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1 rounded-full bg-white/5 mb-5 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>

              {/* Score pills */}
              <div className="flex items-center gap-1.5 mb-4">
                {questions.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      i < currentIdx
                        ? "bg-emerald-500/60"
                        : i === currentIdx
                          ? "bg-primary"
                          : "bg-white/10"
                    }`}
                  />
                ))}
              </div>

              {/* Question */}
              <div className="mb-5">
                <h4 className="text-base sm:text-lg font-black text-white leading-snug tracking-tight">
                  {currentQ.question}
                </h4>
              </div>

              {/* Options */}
              <div className="space-y-2.5" role="radiogroup" aria-label="Choose an answer">
                {currentQ.options.map((opt, i) => {
                  const isCorrect = i === currentQ.correct
                  const isSelected = selectedOption === i
                  const isWrong = showAnswer && isSelected && !isCorrect

                  let optClass = "border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20"
                  if (showAnswer) {
                    if (isCorrect) optClass = "border-emerald-500/50 bg-emerald-500/10"
                    else if (isWrong) optClass = "border-red-500/40 bg-red-500/10"
                    else optClass = "border-white/5 bg-white/[0.01] opacity-50"
                  }

                  return (
                    <motion.button
                      key={i}
                      type="button"
                      onClick={() => handleOptionSelect(i)}
                      disabled={showAnswer}
                      role="radio"
                      aria-checked={selectedOption === i}
                      aria-label={`Option ${String.fromCharCode(65 + i)}: ${opt}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.3 }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200 ${optClass} ${
                        !showAnswer ? "cursor-pointer active:scale-[0.98]" : "cursor-default"
                      }`}
                    >
                      <span className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black border transition-all ${
                        showAnswer && isCorrect
                          ? "bg-emerald-500 border-emerald-400 text-white"
                          : showAnswer && isWrong
                            ? "bg-red-500 border-red-400 text-white"
                            : "bg-white/5 border-white/15 text-white/40"
                      }`}>
                        {showAnswer && isCorrect ? "✓" : showAnswer && isWrong ? "✕" : String.fromCharCode(65 + i)}
                      </span>
                      <span className={`text-sm font-semibold ${showAnswer && isCorrect ? "text-emerald-300" : showAnswer && isWrong ? "text-red-300" : "text-white/80"}`}>
                        {opt}
                      </span>
                    </motion.button>
                  )
                })}
              </div>

              {/* Explanation & Next */}
              <AnimatePresence>
                {showAnswer && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    {currentQ.explanation && (
                      <div className="mt-4 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                        <div className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">💡 Explanation</div>
                        <p className="text-xs text-white/60 leading-relaxed">{currentQ.explanation}</p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleNext}
                      className="mt-4 w-full py-3.5 rounded-xl bg-primary/20 border border-primary/30 text-xs font-black uppercase tracking-[0.2em] text-primary hover:bg-primary/30 transition-all active:scale-[0.98]"
                    >
                      {currentIdx < questions.length - 1 ? "Next Question →" : "See Results →"}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── COMPLETED STATE ── */}
          {state === "completed" && (
            <motion.div
              key="completed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 p-6 sm:p-8 text-center"
            >
              {/* Animated score ring */}
              <div className="relative w-28 h-28 mx-auto mb-6">
                <svg width="112" height="112" viewBox="0 0 112 112" className="overflow-visible">
                  <circle cx="56" cy="56" r="48" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                  <motion.circle
                    cx="56" cy="56" r="48" fill="none"
                    stroke={score >= 4 ? "#10b981" : score >= 2 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 48}
                    initial={{ strokeDashoffset: 2 * Math.PI * 48 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 48 * (1 - score / questions.length) }}
                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                    transform="rotate(-90 56 56)"
                    style={{ filter: `drop-shadow(0 0 6px ${score >= 4 ? "#10b981" : score >= 2 ? "#f59e0b" : "#ef4444"}50)` }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-white tabular-nums">{score}/{questions.length}</span>
                  <span className="text-[8px] font-bold text-white/30 uppercase tracking-wider">Score</span>
                </div>
              </div>

              <h3 className="text-xl font-black text-white mb-1.5 tracking-tight">
                {score === questions.length ? "🏆 Perfect Score!" : score >= 3 ? "🎯 Great Job!" : score >= 1 ? "💪 Good Try!" : "📚 Keep Practicing!"}
              </h3>
              <p className="text-xs text-white/40 mb-6 max-w-xs mx-auto leading-relaxed">
                {score >= 3
                  ? "You've got sharp skills! Ready to compete with real players for actual prizes?"
                  : "Practice makes perfect. Join the platform to sharpen your IQ daily!"}
              </p>

              {/* CTA: Join the real quiz */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={onPayClick}
                  className="group relative w-full h-13 py-3.5 rounded-2xl overflow-hidden bg-gradient-to-r from-primary to-cyan-500 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(139,92,246,0.3)] hover:shadow-[0_15px_40px_rgba(139,92,246,0.4)] transition-all active:scale-[0.97]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <span>🚀</span>
                    <span>Join Real Quiz — Win Prizes</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={resetQuiz}
                  className="w-full py-3 rounded-xl border border-white/10 bg-white/[0.03] text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 hover:text-white hover:bg-white/[0.06] transition-all"
                >
                  Try Another Quiz
                </button>
              </div>

              {/* Social proof nudge */}
              <div className="mt-5 flex items-center justify-center gap-2 text-[9px] text-white/25">
                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold uppercase tracking-wider">Join 1000+ active players today</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
