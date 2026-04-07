"use client"

import { usePathname } from "next/navigation"
import { useReport } from "@/context/ReportContext"
import { useQuizFullscreen } from "@/context/QuizFullscreenContext"


export default function ReportButton() {
  const pathname = usePathname() ?? ""
  const { openReport } = useReport()
  const { isActive: quizFullscreenActive } = useQuizFullscreen()
  if (quizFullscreenActive) return null

  const bottomDesktop = "lg:bottom-12 lg:right-12"

  return (
    <button
      type="button"
      onClick={openReport}
      style={{ left: "auto" }}
      className={`fixed z-[102] hidden lg:flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-red-600/95 text-[18px] leading-none text-white shadow-xl shadow-black/50 backdrop-blur-md transition hover:scale-110 hover:bg-red-500 hover:shadow-red-900/40 active:scale-95 ${bottomDesktop}`}
      aria-label="Report an issue"
      title="Report an issue"
    >
      🚩
    </button>
  )
}
