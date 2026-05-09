"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "@/context/ThemeContext"
import { isMoreHubOrApiGuidePath } from "@/lib/moreDocsPaths"

const HIDE_ON = ["/intro", "/integration-guide", "/daily-quiz", "/blocked", "/maintenance"]

export default function FloatingActions() {
  const pathname = usePathname() ?? ""
  const { theme, toggleTheme } = useTheme()
  const isOrgRoute = pathname === "/org" || pathname.startsWith("/org/")
  const hidden =
    isMoreHubOrApiGuidePath(pathname) || isOrgRoute || HIDE_ON.some((p) => pathname === p || pathname.startsWith(p + "/"))
  if (hidden) return null

  return (
    <div className="fixed bottom-24 right-4 z-[60] flex flex-col gap-2.5">
      <button
        type="button"
        onClick={toggleTheme}
        className="fab-neon h-11 w-11 rounded-2xl border border-white/20 bg-[#0f172a]/70 text-white shadow-xl backdrop-blur-md"
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        title={theme === "dark" ? "Light mode" : "Dark mode"}
      >
        {theme === "dark" ? "☀" : "☾"}
      </button>
      <Link
        href="/daily-quiz"
        className="fab-neon h-11 w-11 rounded-2xl border border-cyan-300/40 bg-gradient-to-br from-cyan-500/70 to-violet-500/70 text-white shadow-xl backdrop-blur-md flex items-center justify-center"
        aria-label="Start quiz"
        title="Start Quiz"
      >
        ⚡
      </Link>
    </div>
  )
}

