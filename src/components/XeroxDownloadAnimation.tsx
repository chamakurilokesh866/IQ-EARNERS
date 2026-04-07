"use client"

import { useEffect, useState } from "react"

type Phase = "typing" | "feeding" | "processing" | "done"

const TYPING_MS = 350
const FEEDING_MS = 150
const PROCESSING_MS = 200
const DONE_MS = 150
const TOTAL_MS = TYPING_MS + FEEDING_MS + PROCESSING_MS + DONE_MS

export default function XeroxDownloadAnimation({
  onComplete,
  durationMs = TOTAL_MS
}: {
  onComplete?: () => void
  durationMs?: number
}) {
  const [phase, setPhase] = useState<Phase>("typing")
  const [typedLen, setTypedLen] = useState(0)
  const text = "Printing your quiz report..."

  useEffect(() => {
    if (phase === "typing") {
      const interval = Math.max(20, Math.floor(TYPING_MS / text.length))
      const id = setInterval(() => {
        setTypedLen((n) => {
          if (n >= text.length) return n
          return n + 1
        })
      }, interval)
      return () => clearInterval(id)
    }
  }, [phase])

  useEffect(() => {
    const t1 = TYPING_MS
    const t2 = t1 + FEEDING_MS
    const t3 = t2 + PROCESSING_MS
    const t4 = Math.max(TOTAL_MS, durationMs)

    const id1 = setTimeout(() => setPhase("feeding"), t1)
    const id2 = setTimeout(() => setPhase("processing"), t2)
    const id3 = setTimeout(() => {
      setPhase("done")
      onComplete?.()
    }, t4)

    return () => {
      clearTimeout(id1)
      clearTimeout(id2)
      clearTimeout(id3)
    }
  }, [durationMs, onComplete])

  return (
    <div className="xerox-download-animation relative w-full max-w-sm mx-auto">
      <div className="relative h-52 rounded-xl bg-gradient-to-b from-navy-600 to-navy-800 border-2 border-navy-500 overflow-hidden shadow-xl">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[92%] h-3 bg-navy-900 rounded border-2 border-navy-500 z-10" />
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[90%] h-36 bg-navy-700/60 rounded border border-navy-600 overflow-hidden">
          <div
            className={`absolute left-2 right-2 bg-white text-navy-900 rounded shadow-lg p-3 text-xs font-mono transition-all duration-300 ease-in-out ${
              phase === "typing"
                ? "top-2 opacity-100"
                : phase === "feeding"
                ? "top-[-130%] opacity-0 -translate-y-4"
                : phase === "processing"
                ? "opacity-0 scale-90"
                : "top-[130%] opacity-0 translate-y-4"
            }`}
            style={{ minHeight: "90px" }}
          >
            <div className="overflow-hidden">
              <span>{text.slice(0, typedLen)}</span>
              <span className={`inline-block w-0.5 h-4 bg-navy-900 ml-0.5 align-middle ${phase === "typing" ? "animate-typing-cursor" : "opacity-0"}`} />
            </div>
            <div className="mt-2 text-navy-500 text-[10px]">IQ Earners • Daily Quiz Report</div>
          </div>
        </div>
        {phase === "processing" && (
          <div className="absolute inset-x-6 top-12 h-1.5 bg-primary/80 rounded-full xerox-scan-bar" />
        )}
        <div
          className={`absolute bottom-4 right-5 w-4 h-4 rounded-full transition-all duration-300 ${
            phase === "done" ? "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.9)]" : "bg-navy-600"
          }`}
        />
      </div>
      <div className="mt-4 text-center text-sm text-navy-400 font-medium">
        {phase === "typing" && "Printing text on paper..."}
        {phase === "feeding" && "Feeding into xerox machine..."}
        {phase === "processing" && "Scanning & copying..."}
        {phase === "done" && "✓ Download complete!"}
      </div>
    </div>
  )
}
