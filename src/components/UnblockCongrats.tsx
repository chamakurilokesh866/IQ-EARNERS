"use client"

import { useEffect, useState } from "react"
import { SparklesIcon } from "./AnimatedIcons"

const COLORS = ["#22c55e", "#f59e0b", "#3b82f6", "#a855f7", "#ec4899"]
const PAPER_COUNT = 24

function PaperPiece({ i }: { i: number }) {
  const color = COLORS[i % COLORS.length]
  const left = `${(i * 7 + 13) % 100}%`
  const delay = (i * 0.08) % 1.2
  const duration = 2.2 + (i % 3) * 0.4
  const w = 8 + (i % 4) * 2
  const h = 4 + (i % 3)

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left,
        top: "-16px",
        width: w,
        height: h,
        backgroundColor: color,
        borderRadius: 1,
        animation: `paperFall ${duration}s ease-in ${delay}s forwards`,
        opacity: 0.95,
        boxShadow: "0 1px 2px rgba(0,0,0,0.2)"
      }}
    />
  )
}

export default function UnblockCongrats({ username, onContinue }: { username: string; onContinue?: () => void }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <div className="relative overflow-hidden rounded-xl bg-[#fefcf3] border border-amber-200/80 p-6 sm:p-8 text-center shadow-inner">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400" />
      {mounted && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: PAPER_COUNT }, (_, i) => (
            <PaperPiece key={i} i={i} />
          ))}
        </div>
      )}
      <div className="relative z-10 flex flex-col items-center">
        <SparklesIcon size={48} className="text-amber-500 mb-3 animate-bounce" />
        <div className="text-2xl font-bold text-emerald-700">Congratulations!</div>
        <p className="mt-2 text-lg font-semibold text-white">
          @{username} unblocked
        </p>
        <p className="mt-1 text-sm text-white/70">Your account has been successfully unblocked. You can now log in and continue.</p>
        {onContinue && (
          <button
            type="button"
            onClick={onContinue}
            className="mt-6 w-full rounded-xl bg-emerald-600 text-white px-6 py-3 font-semibold hover:bg-emerald-500 transition-colors"
          >
            Continue to login
          </button>
        )}
      </div>
    </div>
  )
}
