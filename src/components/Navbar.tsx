"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect } from "react"
import NotificationToast from "./NotificationToast"
import NotificationBell from "./NotificationBell"
import ErrorReporter from "./ErrorReporter"
import Image from "next/image"
import logoPng from "../app/prizes/icon.png"
import TokenLink from "./TokenLink"
import { withSid } from "../lib/session"
import { useBootstrap } from "@/hooks/useBootstrap"
import TransitionLink from "./TransitionLink"
import NavShellBackground from "./NavShellBackground"

type MenuItem = { href: string; label: string; icon: string; children?: { href: string; label: string }[] }

const MENU_ITEMS: MenuItem[] = [
  { href: "/home", label: "Home", icon: "⌂" },
  { href: "/tournaments", label: "Tournaments", icon: "◉", children: [{ href: "/tournaments", label: "Browse" }] },
  { href: "/daily-quiz", label: "Daily Quiz", icon: "◎" },
  { href: "/leaderboard", label: "Leaderboard", icon: "▤", children: [{ href: "/leaderboard", label: "Overall" }, { href: "/leaderboard?tab=Tournament", label: "By Tournament" }] },
  { href: "/prizes", label: "Prizes", icon: "◇" },
  { href: "/user", label: "Profile", icon: "○", children: [{ href: "/user", label: "Overview" }, { href: "/user?tab=Achievements", label: "Achievements" }, { href: "/user?tab=Certificates", label: "Certificates" }, { href: "/user?tab=Payments", label: "Payments" }, { href: "/user?tab=Referrals", label: "Referrals" }] }
]

export default function Navbar() {
  const pathname = usePathname()
  const { data: bootstrap, loaded: bootstrapLoaded, cachedLayout } = useBootstrap()
  const username = bootstrap?.username ?? null
  const paid = bootstrap?.paid ?? false
  const useHorizontalNav = (cachedLayout ?? bootstrap?.navbarLayout ?? "vertical") === "horizontal"

  useEffect(() => {
    fetch("/api/leaderboard").catch(() => { })
    fetch("/api/prizes").catch(() => { })
    fetch("/api/tournaments").catch(() => { })
    fetch("/api/stats/public").catch(() => { })
  }, [])

  const isActive = (href: string) => {
    const base = href.split("?")[0]
    return pathname === base || pathname.startsWith(base + "/")
  }

  return (
    <>
      {(true) && (
        <header
          className={`ui-chrome-header ui-chrome-nav relative overflow-hidden sticky top-0 z-40 mx-0 sm:mx-6 rounded-none sm:rounded-[1.75rem] border-b border-white/[0.12] bg-[#0a0618]/80 shadow-xl shadow-black/40 backdrop-blur-xl supports-[backdrop-filter]:bg-[#0a0618]/72 sm:border sm:border-primary/20 ${!useHorizontalNav ? "lg:!hidden" : ""}`}
        >
          <NavShellBackground variant="dark" />
          <div className="relative z-[3] mx-auto max-w-7xl w-full min-w-0 px-3 sm:px-8 py-3 flex items-center justify-between gap-2 sm:gap-6">
            <Link href={withSid("/home")} prefetch={false} aria-label="IQ Earners" className="shrink-0 flex items-center gap-3 transition-transform hover:scale-105 active:scale-95">
              <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden shadow-sm border border-white/[0.15] bg-white/[0.08]">
                <Image
                  src={logoPng}
                  alt="IQ Earners"
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                  sizes="(max-width: 640px) 32px, 40px"
                />
              </div>
              <span className="text-base sm:text-xl font-black uppercase tracking-tighter drop-shadow-sm leading-tight text-white">
                IQ <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Earners</span>
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              {MENU_ITEMS.map((i) => (
                <TransitionLink 
                  key={i.href}
                  href={i.href}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    isActive(i.href)
                      ? "text-[#7eb6ff] bg-white/15 shadow-inner"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {i.label}
                </TransitionLink>
              ))}
            </nav>

            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <NotificationBell />
              {bootstrapLoaded && !paid ? (
                <Link
                  href="/intro"
                  prefetch={false}
                  className="liquid-glass-hit inline-flex items-center justify-center px-3 sm:px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-focus text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-[0.2em] shadow-lg shadow-primary/35 hover:brightness-110 transition-all active:scale-95 whitespace-nowrap"
                >
                  Sign In
                </Link>
              ) : null}
            </div>
          </div>
        </header>
      )}
      <NotificationToast username={username} />
      <ErrorReporter />
    </>
  )
}
