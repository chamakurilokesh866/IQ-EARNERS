"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useRef, useState } from "react"
import { useBootstrap } from "@/hooks/useBootstrap"
import TransitionLink from "./TransitionLink"
import NotificationBell from "./NotificationBell"
import { performLogout } from "@/lib/logout"
import { withSid } from "@/lib/session"
import FlagImg from "./FlagImg"
import logoPng from "../app/prizes/icon.png"
import NavShellBackground from "./NavShellBackground"

const SIDEBAR_WIDTH = 82

const ICONS = {
  home: (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  tournament: (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  ),
  quiz: (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  ),
  leaderboard: (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20V10" />
      <path d="M18 20V4" />
      <path d="M6 20v-4" />
    </svg>
  ),
  gift: (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect width="20" height="5" x="2" y="7" />
      <line x1="12" x2="12" y1="22" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  ),
  user: (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
}

const PRIMARY_ITEMS = [
  { href: "/home", label: "Home", icon: "home" as const },
  { href: "/tournaments", label: "Tournaments", icon: "tournament" as const },
  { href: "/daily-quiz", label: "Daily Quiz", icon: "quiz" as const },
  { href: "/leaderboard", label: "Leaderboard", icon: "leaderboard" as const },
  { href: "/prizes", label: "Prizes", icon: "gift" as const },
]

export const SIDEBAR_WIDTH_PX = SIDEBAR_WIDTH

export default function LeftSidebar() {
  const pathname = usePathname() ?? "/"
  const { data: bootstrap } = useBootstrap()
  const username = bootstrap?.username ?? null
  const country = bootstrap?.country ?? null

  const isActive = (href: string) => {
    const base = href.split("?")[0]
    if (base === "/user") return pathname === "/user" || pathname.startsWith("/user?")
    if (base === "/leaderboard") return pathname === "/leaderboard" || pathname.startsWith("/leaderboard")
    if (base === "/more") return pathname === "/more" || pathname.startsWith("/more/")
    return pathname === base || pathname.startsWith(base + "/")
  }

  function LoginLinkWithGlass() {
    const ref = useRef<HTMLDivElement>(null)
    const [pos, setPos] = useState({ x: 50, y: 50 })
    const [hover, setHover] = useState(false)
    const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      setPos({ x, y })
      setHover(true)
    }
    const onMouseLeave = () => setHover(false)
    return (
      <div
        ref={ref}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        className="sidebar-neon-item sidebar-neon-login relative flex flex-col items-center justify-center gap-0.5 py-2 px-1.5 rounded-xl overflow-hidden bg-primary/25 text-primary border border-primary/40 w-full transition-colors hover:bg-primary/30"
      >
        {hover && (
          <div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              background: `radial-gradient(circle 80px at ${pos.x}% ${pos.y}%, rgba(255,255,255,0.25), transparent 70%)`,
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            aria-hidden
          />
        )}
        <TransitionLink href="/intro" className="relative z-10 flex flex-col items-center gap-0.5 w-full" aria-label="Log in">
          <span className="scale-90">{ICONS.user}</span>
          <span className="text-[9px] font-medium">Log in</span>
        </TransitionLink>
      </div>
    )
  }

  function LogoutButtonWithGlass() {
    const ref = useRef<HTMLButtonElement>(null)
    const [pos, setPos] = useState({ x: 50, y: 50 })
    const [hover, setHover] = useState(false)
    const onMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      setPos({ x, y })
      setHover(true)
    }
    const onMouseLeave = () => setHover(false)
    return (
      <button
        ref={ref}
        type="button"
        onClick={() => performLogout()}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        className="sidebar-neon-item sidebar-neon-logout relative flex flex-col items-center gap-1 py-2 px-2 rounded-xl overflow-hidden transition-colors w-full text-white/50 hover:text-red-400"
        aria-label="Log out"
      >
        {hover && (
          <div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              background: `radial-gradient(circle 80px at ${pos.x}% ${pos.y}%, rgba(239,68,68,0.15), transparent 70%)`,
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            aria-hidden
          />
        )}
        <span className="relative z-10">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" x2="9" y1="12" y2="12" />
          </svg>
        </span>
        <span className="relative z-10 text-[9px]">Log out</span>
      </button>
    )
  }

  function ProfileLinkWithGlass({
    href,
    active,
    icon,
    label,
    username,
    country,
  }: {
    href: string
    active: boolean
    icon: React.ReactNode
    label: string
    username: string
    country?: string | null
  }) {
    const ref = useRef<HTMLDivElement>(null)
    const [pos, setPos] = useState({ x: 50, y: 50 })
    const [hover, setHover] = useState(false)
    const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      setPos({ x, y })
      setHover(true)
    }
    const onMouseLeave = () => setHover(false)
    return (
      <div
        ref={ref}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        className={`sidebar-neon-item ${active ? "sidebar-neon-item-active" : ""} relative flex flex-col items-center justify-center gap-0.5 py-2 px-1.5 rounded-xl overflow-hidden w-full transition-colors duration-200 ${
          active ? "text-primary" : "text-white/65 hover:text-white"
        }`}
      >
        {active && (
          <div
            className="absolute inset-0 rounded-xl shadow-lg shadow-primary/10 bg-white/15"
            aria-hidden
          />
        )}
        {hover && !active && (
          <div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              background: `radial-gradient(circle 80px at ${pos.x}% ${pos.y}%, rgba(255,255,255,0.18), transparent 70%)`,
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            aria-hidden
          />
        )}
        <TransitionLink href={withSid(href)} className="relative z-10 flex flex-col items-center gap-0.5 w-full" aria-label={label}>
          <span className="inline-flex items-center justify-center relative scale-90">
            {icon}
            {country && (
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-navy-800 overflow-hidden border border-white/30">
                <FlagImg code={country} size={12} />
              </span>
            )}
          </span>
          <span className="text-[9px] font-medium truncate max-w-[56px]">{username}</span>
        </TransitionLink>
      </div>
    )
  }

  function NavItemWithGlass({
    href,
    label,
    iconKey,
    active,
  }: {
    href: string
    label: string
    iconKey: keyof typeof ICONS
    active: boolean
  }) {
    const ref = useRef<HTMLDivElement>(null)
    const [pos, setPos] = useState({ x: 50, y: 50 })
    const [hover, setHover] = useState(false)
    const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      setPos({ x, y })
      setHover(true)
    }
    const onMouseLeave = () => setHover(false)
    return (
      <div
        ref={ref}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        className={`sidebar-neon-item ${active ? "sidebar-neon-item-active" : ""} relative flex flex-col items-center justify-center gap-0.5 py-2 px-1.5 rounded-xl overflow-hidden transition-colors duration-200 ${
          active ? "text-primary" : "text-white/65 hover:text-white"
        }`}
      >
        {active && (
          <div
            className="absolute inset-0 rounded-xl shadow-lg shadow-primary/10 bg-white/15"
            aria-hidden
          />
        )}
        {hover && !active && (
          <div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              background: `radial-gradient(circle 80px at ${pos.x}% ${pos.y}%, rgba(255,255,255,0.18), transparent 70%)`,
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            aria-hidden
          />
        )}
        <TransitionLink href={withSid(href)} className="relative z-10 flex flex-col items-center justify-center gap-0.5 w-full" aria-label={label}>
          <span className="scale-90">{ICONS[iconKey]}</span>
          <span className="text-[9px] font-medium leading-tight">{label}</span>
        </TransitionLink>
      </div>
    )
  }

  return (
    <aside
      className="ui-chrome-sidebar sidebar-neon-shell fixed hidden lg:flex flex-col left-4 top-4 bottom-4 w-[82px] z-30 rounded-2xl border border-white/[0.12] bg-[#060a14]/78 py-3 items-center gap-1.5 overflow-hidden shadow-2xl shadow-black/40 backdrop-blur-xl supports-[backdrop-filter]:bg-[#060a14]/65"
      aria-label="Main navigation"
    >
      <NavShellBackground variant="dark" />

      {/* Logo */}
      <Link
        href={withSid("/home")}
        className="relative z-10 shrink-0 w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center mb-1.5 transition-colors bg-white/[0.08] border border-white/[0.12] hover:bg-white/[0.12]"
        aria-label="IQ Earners Home"
      >
        <Image src={logoPng} alt="" width={28} height={28} className="h-7 w-7 object-contain" sizes="28px" />
      </Link>

      {/* Primary nav – no flex-1 so bell stays close to Prizes */}
      <nav className="flex flex-col items-center gap-1 overflow-y-auto overflow-x-hidden sidebar-nav-scroll shrink-0">
        {PRIMARY_ITEMS.map((item) => (
          <div key={item.href} className="w-full flex justify-center px-2">
            <NavItemWithGlass href={item.href} label={item.label} iconKey={item.icon} active={isActive(item.href)} />
          </div>
        ))}
      </nav>

      {/* Notifications – outside nav so dropdown isn't clipped by overflow-x-hidden */}
      <div className="shrink-0 mt-2 flex flex-col items-center gap-2">
        <NotificationBell />
      </div>

      {/* Profile (merged with Dashboard) / Log in at bottom */}
      <div
        className="shrink-0 pt-1.5 w-full flex flex-col items-center gap-1.5 border-t border-white/[0.08]"
      >
        {username ? (
          <>
            <div className="w-full flex justify-center px-2">
              <ProfileLinkWithGlass href="/user" active={isActive("/user")} icon={ICONS.user} label="Profile" username={username} country={country} />
            </div>
            <div className="w-full flex justify-center px-2">
              <LogoutButtonWithGlass />
            </div>
          </>
        ) : (
          <div className="w-full flex justify-center px-2">
            <LoginLinkWithGlass />
          </div>
        )}
      </div>
    </aside>
  )
}
