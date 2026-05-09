"use client"

import { usePathname } from "next/navigation"
import { useQuizFullscreen } from "@/context/QuizFullscreenContext"
import { useReport } from "@/context/ReportContext"
import { useCallback } from "react"
import TokenLink from "./TokenLink"
import { motion } from "framer-motion"
import { isMoreHubOrApiGuidePath } from "@/lib/moreDocsPaths"

const HIDE_PATHS = ["/", "/intro", "/maintenance", "/integration-guide", "/more/admin", "/more/admin-dashboard", "/a", "/payment", "/blocked", "/create-username", "/login", "/creator-join", "/creator"]

const ICONS = {
  report: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" x2="4" y1="22" y2="15" />
    </svg>
  ),
  home: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  tournaments: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  ),
  quiz: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m16 11 2 2 4-4" />
      <path d="M8 5h12" />
      <path d="M8 10h8" />
      <path d="M8 15h12" />
      <path d="M8 20h8" />
      <path d="M2 10h4" />
      <path d="M2 5h4" />
      <path d="M2 15h4" />
      <path d="M2 20h4" />
    </svg>
  ),
  leaderboard: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20V10" />
      <path d="M18 20V4" />
      <path d="M6 20v-4" />
    </svg>
  ),
  notifications: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  ),
  profile: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
}

const NAV_ITEMS = [
  { href: "/home", label: "Home", icon: "home" as const },
  { href: "/daily-quiz", label: "Quiz", icon: "quiz" as const },
  { href: "/tournaments", label: "Tours", icon: "tournaments" as const },
  { href: "/leaderboard", label: "Stats", icon: "leaderboard" as const },
  { href: "/notifications", label: "Alerts", icon: "notifications" as const },
  { href: "/user", label: "You", icon: "profile" as const },
]

export default function MobileBottomNav() {
  const pathname = usePathname() ?? "/"
  const { isActive: quizFullscreenActive } = useQuizFullscreen()
  const { openReport } = useReport()

  const isOrgRoute = pathname === "/org" || pathname.startsWith("/org/")
  const shouldHide =
    isMoreHubOrApiGuidePath(pathname) ||
    isOrgRoute ||
    HIDE_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    quizFullscreenActive

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
      <div className="fixed bottom-2 left-0 right-0 z-[100] lg:hidden px-2 pointer-events-none flex justify-center pb-safe">
        <nav
          className="ui-mobile-nav-shell pointer-events-auto relative flex w-full max-w-[min(640px,calc(100vw-0.5rem))] items-center gap-0.5 overflow-hidden p-1 sm:gap-1"
          aria-label="Mobile navigation"
        >
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href)
            return (
              <TokenLink
                key={item.href}
                href={item.href}
                className={`relative z-[2] flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center py-1.5 transition-all duration-300 hover:bg-white/[0.03] active:bg-white/[0.06] rounded-2xl group`}
              >
                {active && (
                  <motion.div
                    layoutId="active-pill"
                    className="ui-mobile-nav-active absolute inset-0 z-0 rounded-full"
                    transition={{ type: "spring", bounce: 0.22, duration: 0.55 }}
                  />
                )}

                <div
                  className={`relative z-10 flex max-w-full flex-col items-center gap-0.5 transition-all duration-300 ${active ? "scale-105" : "opacity-40 group-hover:opacity-100"}`}
                >
                  <div
                    className="flex shrink-0 scale-[0.88] items-center justify-center text-white"
                  >
                    {ICONS[item.icon as keyof typeof ICONS]}
                  </div>
                  {active && (
                    <motion.span
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="max-w-[3.5rem] truncate text-center text-[8px] font-black uppercase leading-tight tracking-wide sm:text-[9px] text-white/95"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </div>
              </TokenLink>
            )
          })}

          {/* Report Button (Red Flag) */}
          <button
            type="button"
            onClick={openReport}
            aria-label="Report"
            className="relative z-[2] flex min-h-[44px] min-w-0 flex-[0.7] flex-col items-center justify-center py-1.5 opacity-40 transition-all duration-300 hover:opacity-100 hover:bg-red-500/5 active:bg-red-500/10 rounded-2xl"
          >
            <div className="flex shrink-0 scale-[0.88] items-center justify-center text-red-500">{ICONS.report}</div>
          </button>
        </nav>
      </div>
    </>
  )
}
