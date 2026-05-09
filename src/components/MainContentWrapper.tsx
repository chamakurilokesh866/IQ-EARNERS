"use client"

import { usePathname } from "next/navigation"
import { ReactNode } from "react"
import { useBootstrap } from "@/hooks/useBootstrap"
import AppAmbientBackground from "@/components/AppAmbientBackground"
import { isMoreHubOrApiGuidePath } from "@/lib/moreDocsPaths"

const HIDE_SIDEBAR_PATHS = ["/", "/intro", "/maintenance", "/integration-guide", "/more/admin", "/more/admin-dashboard", "/a", "/create-username", "/login", "/payment", "/blocked", "/creator-join", "/creator"]
const HIDE_BOTTOM_NAV_PATHS = ["/", "/intro", "/maintenance", "/integration-guide", "/more/admin", "/payment", "/blocked", "/create-username", "/login", "/creator-join", "/creator"]

export default function MainContentWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? ""
  const { data: bootstrap } = useBootstrap()
  const isOrgRoute = pathname === "/org" || pathname.startsWith("/org/")
  const isCreatorPage = pathname === "/creator-join" || pathname.startsWith("/creator-join/") || pathname === "/creator" || pathname.startsWith("/creator/")
  const docMinimal = isMoreHubOrApiGuidePath(pathname)
  const hideSidebar = docMinimal || isOrgRoute || isCreatorPage || HIDE_SIDEBAR_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  const hideBottomNav = docMinimal || isOrgRoute || isCreatorPage || HIDE_BOTTOM_NAV_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  const useHorizontal = (bootstrap?.navbarLayout ?? "vertical") === "horizontal"
  const showSidebar = !hideSidebar && !useHorizontal
  const showBottomNavPadding = !hideBottomNav
  return (
    <div
      id="main-content"
      data-vertical-sidebar={showSidebar ? "true" : undefined}
      tabIndex={-1}
      className={`outline-none isolate flex w-full max-w-full min-w-0 flex-col items-stretch justify-start relative overflow-x-hidden min-h-0 bg-transparent ${showBottomNavPadding ? "pb-24 lg:pb-0" : ""}`}
    >
      <AppAmbientBackground />
      {children}
    </div>
  )
}
