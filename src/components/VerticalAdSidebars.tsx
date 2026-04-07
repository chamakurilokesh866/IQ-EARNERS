"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import AdSlot from "./AdSlot"
import { useBootstrap } from "@/hooks/useBootstrap"

const RAIL_HIDE_PATHS = ["/payment", "/create-username", "/login", "/maintenance", "/blocked", "/unblock", "/more/admin", "/intro", "/"]
const RAIL_SHOW_PATHS = ["/home"]
const SIDEBAR_PATHS = ["/home", "/tournaments", "/leaderboard", "/prizes", "/daily-quiz", "/user", "/more", "/unblock", "/blocked"]

function shouldShowRails(path: string): boolean {
  if (!path) return false
  if (RAIL_HIDE_PATHS.some((p) => path === p || (p !== "/" && path.startsWith(p + "/")))) return false
  return RAIL_SHOW_PATHS.some((p) => path === p || (p !== "/" && path.startsWith(p + "/")))
}

export default function VerticalAdSidebars() {
  const pathname = usePathname() ?? ""
  const [mounted, setMounted] = useState(false)
  const { data: bootstrap } = useBootstrap()
  useEffect(() => setMounted(true), [])

  if (!mounted) return null
  if (!shouldShowRails(pathname)) return null

  const useVerticalNav = bootstrap?.navbarLayout !== "horizontal"
  const hasSidebar = useVerticalNav && SIDEBAR_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))

  return (
    <>
      {/* Left rail - fixed, only on xl screens; offset by sidebar (88px) when sidebar is shown */}
      <aside
        className={`hidden xl:block fixed top-24 z-30 w-[180px] pointer-events-auto ${hasSidebar ? "left-[calc(1rem+72px+0.75rem)]" : "left-2"}`}
        aria-label="Advertisement"
      >
        <div className="ad-rail-vertical sticky top-24">
          <AdSlot slotId="left_rail" />
        </div>
      </aside>
      {/* Right rail - fixed, only on xl screens */}
      <aside
        className="hidden xl:block fixed right-2 top-24 z-30 w-[180px] pointer-events-auto"
        aria-label="Advertisement"
      >
        <div className="ad-rail-vertical sticky top-24">
          <AdSlot slotId="right_rail" />
        </div>
      </aside>
    </>
  )
}
