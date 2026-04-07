"use client"

import { usePathname } from "next/navigation"
import { useQuizFullscreen } from "@/context/QuizFullscreenContext"
import { useReport } from "@/context/ReportContext"
import { useCallback } from "react"
import TokenLink from "./TokenLink"
import { motion } from "framer-motion"

const HIDE_PATHS = ["/", "/intro", "/maintenance", "/more/admin", "/more/admin-dashboard", "/a", "/payment", "/blocked", "/create-username", "/login", "/creator-join", "/creator"]

const ICONS = {
  report: (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" x2="4" y1="22" y2="15" />
    </svg>
  ),
  home: (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  tournaments: (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  ),
  quiz: (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M8 13h2" />
      <path d="M8 17h2" />
      <path d="M14 13h2" />
      <path d="M14 17h2" />
    </svg>
  ),
  leaderboard: (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20V10" />
      <path d="M18 20V4" />
      <path d="M6 20v-4" />
    </svg>
  ),
  profile: (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  gift: (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect width="20" height="5" x="2" y="7" />
      <line x1="12" x2="12" y1="22" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  ),
}

const NAV_ITEMS = [
  { href: "/home", label: "Home", icon: "home" as const },
  { href: "/tournaments", label: "Tours", icon: "tournaments" as const },
  { href: "/daily-quiz", label: "Quiz", icon: "quiz" as const },
  { href: "/leaderboard", label: "Stats", icon: "leaderboard" as const },
  { href: "/prizes", label: "Prizes", icon: "gift" as const },
  { href: "/user", label: "You", icon: "profile" as const },
]

export default function MobileBottomNav() {
  const pathname = usePathname() ?? "/"
  const { isActive: quizFullscreenActive } = useQuizFullscreen()
  const { openReport } = useReport()
  
  const shouldHide = HIDE_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) || quizFullscreenActive

  const isActive = useCallback(
    (href: string) => {
      const base = href.split("?")[0]
      if (base === "/user") return pathname === "/user" || pathname.startsWith("/user?")
      if (base === "/leaderboard") return pathname === "/leaderboard" || pathname.startsWith("/leaderboard")
      return pathname === base || pathname.startsWith(base + "/")
    },
    [pathname]
  )

  if (shouldHide) return null

  return (
    <>
      {/* Frosted band under the floating pill: blurs page content in the home-indicator / gap zone */}
      <div
        className="fixed inset-x-0 bottom-0 z-[99] lg:hidden pointer-events-none h-[calc(env(safe-area-inset-bottom,0px)+5rem)] bg-[#06040f]/60 backdrop-blur-2xl supports-[backdrop-filter]:bg-[#06040f]/38 border-t border-white/[0.07] [mask-image:linear-gradient(to_top,black_55%,transparent)]"
        aria-hidden
      />
      <div className="fixed bottom-2.5 left-0 right-0 z-[100] lg:hidden px-2 sm:px-4 pointer-events-none flex justify-center pb-safe sm:bottom-3">
        <nav
          className="ui-mobile-nav-shell pointer-events-auto relative flex w-full max-w-[min(640px,calc(100vw-0.5rem))] items-center gap-0.5 overflow-hidden p-1 sm:gap-1 sm:p-1.5"
          aria-label="Mobile navigation"
        >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <TokenLink
              key={item.href}
              href={item.href}
              className={`relative z-[2] flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center py-1 transition-all duration-300 sm:min-h-[50px] sm:py-1.5`}
            >
              {active && (
                <motion.div
                  layoutId="active-pill"
                  className="ui-mobile-nav-active absolute inset-0 z-0 rounded-full"
                  transition={{ type: "spring", bounce: 0.22, duration: 0.55 }}
                />
              )}

              <div
                className={`relative z-10 flex max-w-full flex-col items-center gap-0.5 transition-all duration-300 sm:gap-1 ${active ? "scale-105 sm:scale-110" : "opacity-40 group-hover:opacity-100"}`}
              >
                <div
                  className="flex shrink-0 scale-[0.92] items-center justify-center sm:scale-100 text-white"
                >
                  {ICONS[item.icon]}
                </div>
                {active && (
                  <motion.span
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-[4.5rem] truncate text-center text-[9px] font-black uppercase leading-tight tracking-wide sm:max-w-none sm:text-[10px] sm:tracking-widest text-white/95"
                  >
                    {item.label}
                  </motion.span>
                )}
              </div>
            </TokenLink>
          )
        })}

        {/* Report Button */}
        <button
          type="button"
          onClick={openReport}
          aria-label="Report"
          className="relative z-[2] flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center py-1 opacity-40 transition-all duration-300 hover:opacity-100 sm:min-h-[50px] sm:py-1.5"
        >
          <div className="flex shrink-0 scale-[0.92] items-center justify-center text-red-400 sm:scale-100">{ICONS.report}</div>
        </button>
        </nav>
      </div>
    </>
  )
}
