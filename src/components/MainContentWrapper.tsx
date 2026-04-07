"use client"

import { usePathname } from "next/navigation"
import { ReactNode } from "react"
import { useBootstrap } from "@/hooks/useBootstrap"
import AppAmbientBackground from "@/components/AppAmbientBackground"

const HIDE_SIDEBAR_PATHS = ["/", "/intro", "/maintenance", "/more/admin", "/more/admin-dashboard", "/a", "/create-username"]
const HIDE_BOTTOM_NAV_PATHS = ["/", "/intro", "/maintenance", "/more/admin", "/payment", "/blocked", "/create-username", "/login"]

export default function MainContentWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? ""
  const { data: bootstrap } = useBootstrap()
  const isCreatorPage = pathname === "/creator-join" || pathname.startsWith("/creator-join/") || pathname === "/creator" || pathname.startsWith("/creator/")
  const hideSidebar = isCreatorPage || HIDE_SIDEBAR_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  const hideBottomNav = isCreatorPage || HIDE_BOTTOM_NAV_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  const useHorizontal = (bootstrap?.navbarLayout ?? "vertical") === "horizontal"
  const showSidebar = !hideSidebar && !useHorizontal
  const showBottomNavPadding = !hideBottomNav
  return (
    <div
      id="main-content"
      data-vertical-sidebar={showSidebar ? "true" : undefined}
      tabIndex={-1}
      className={`outline-none isolate flex w-full max-w-full min-w-0 flex-col items-stretch justify-start relative overflow-x-hidden min-h-0 bg-transparent ${showSidebar ? "lg:pl-[calc(1rem+72px+0.75rem)]" : ""} ${showBottomNavPadding ? "pb-24 lg:pb-0" : ""}`}
    >
      <AppAmbientBackground />
      {children}
    </div>
  )
}
