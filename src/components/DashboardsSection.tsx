"use client"

import { useState } from "react"
import { useTransitionNavigate } from "@/hooks/useTransitionNavigate"
import { performLogout } from "@/lib/logout"

export default function DashboardsSection() {
  const { navigate } = useTransitionNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  const goTo = (path: string) => () => navigate(path)

  const handleLogout = async () => {
    setLoggingOut(true)
    await performLogout()
  }

  return (
    <div className="mt-8">
      <div className="text-xl font-semibold mb-1">Choose dashboard</div>
      <p className="text-sm text-navy-400 mb-4">Select where you want to go.</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={goTo("/user")}
          className="group relative card p-6 text-left rounded-xl border border-navy-700 hover:border-primary/40 hover:bg-navy-800/80 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-navy-900"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-2xl transition-transform duration-300 group-hover:scale-110">
                👤
              </span>
              <div>
                <div className="font-semibold text-white">User Dashboard</div>
                <p className="mt-1 text-sm text-navy-400">Your stats, activity & quick actions</p>
              </div>
            </div>
            <span className="text-navy-400 group-hover:text-primary transition-colors duration-300">→</span>
          </div>
        </button>
      </div>

      <div className="mt-8 flex justify-center">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="text-sm text-navy-400 hover:text-red-400 transition-colors disabled:opacity-50"
        >
          {loggingOut ? "Logging out…" : "Log out"}
        </button>
      </div>
    </div>
  )
}
