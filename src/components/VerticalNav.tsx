"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { useReport } from "@/context/ReportContext"
import { 
  UserIcon, 
  RocketIcon, 
  SparklesIcon,
  BotIcon,
  TrophyIcon,
  BellIcon,
  FlagIcon
} from "./AnimatedIcons"

const NAV_ITEMS = [
  { id: 'home', label: 'Home', path: '/home', icon: RocketIcon },
  { id: 'quiz', label: 'Daily Quiz', path: '/daily-quiz', icon: SparklesIcon },
  { id: 'tournaments', label: 'Compete', path: '/tournaments', icon: BotIcon },
  { id: 'leaderboard', label: 'Leaderboard', path: '/leaderboard', icon: TrophyIcon },
  { id: 'notifications', label: 'Alerts', path: '/notifications', icon: BellIcon },
  { id: 'user', label: 'My Dashboard', path: '/user', icon: UserIcon },
]

const HIDE_PATHS = ["/", "/intro", "/maintenance", "/more/admin", "/more/admin-dashboard", "/a", "/create-username", "/payment", "/blocked", "/login", "/creator-join", "/creator"]

export default function VerticalNav() {
  const pathname = usePathname() ?? "/"
  const { openReport } = useReport()
  
  const isOrgRoute = pathname === "/org" || pathname.startsWith("/org/")
  const shouldHide = isOrgRoute || HIDE_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))

  if (shouldHide) return null

  return (
    <nav className="ui-vertical-rail transition-all duration-500 ease-in-out hidden lg:flex">
      <div className="mb-10">
        <Link href="/home" className="block w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-cyan-400 p-0.5 shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
          <div className="w-full h-full rounded-[0.9rem] bg-black flex items-center justify-center text-white font-black text-xl italic selection:bg-transparent">
            IQ
          </div>
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center gap-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/home' && pathname.startsWith(item.path))
          const Icon = item.icon

          return (
            <Link
              key={item.id}
              href={item.path}
              className={`ui-vertical-rail-item ${isActive ? 'active' : ''} group relative`}
              title={item.label}
            >
              <Icon size={24} />
              
              {/* Tooltip */}
              <div className="absolute left-full ml-4 px-3 py-1.5 rounded-lg bg-black/90 text-white text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all pointer-events-none backdrop-blur-xl border border-white/10 whitespace-nowrap z-[110]">
                {item.label}
              </div>

              {isActive && (
                <motion.div
                  layoutId="active-indicator"
                  className="absolute -right-[1px] w-1 h-8 bg-white rounded-l-full shadow-[0_0_15px_rgba(255,255,255,0.8)]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </Link>
          )
        })}
      </div>

      <div className="mt-auto flex flex-col items-center gap-4">
        {/* Report Button */}
        <button
          onClick={openReport}
          className="ui-vertical-rail-item hover:!text-red-500 hover:!bg-red-500/10 group relative"
          title="Report Issue"
        >
          <FlagIcon size={24} className="text-red-400 group-hover:text-red-500 transition-colors" />
          <div className="absolute left-full ml-4 px-3 py-1.5 rounded-lg bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all pointer-events-none shadow-lg shadow-red-900/40 whitespace-nowrap z-[110]">
            Report
          </div>
        </button>

        <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors cursor-pointer">
          <span className="text-[14px]">◈</span>
        </div>
      </div>
    </nav>
  )
}
