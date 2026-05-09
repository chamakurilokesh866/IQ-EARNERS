"use client"

import { usePathname } from "next/navigation"
import LeftSidebar, { SIDEBAR_WIDTH_PX } from "./LeftSidebar"
import { useBootstrap } from "@/hooks/useBootstrap"
import { isMoreHubOrApiGuidePath } from "@/lib/moreDocsPaths"

const HIDE_SIDEBAR_PATHS = ["/", "/intro", "/maintenance", "/integration-guide", "/more/admin", "/more/admin-dashboard", "/a", "/create-username", "/creator-join", "/creator"]

export default function SidebarGate() {
  const pathname = usePathname() ?? ""
  const { data: bootstrap } = useBootstrap()
  const isOrgRoute = pathname === "/org" || pathname.startsWith("/org/")
  const isCreatorPage = pathname === "/creator-join" || pathname.startsWith("/creator-join/") || pathname === "/creator" || pathname.startsWith("/creator/")
  const hidePaths =
    isMoreHubOrApiGuidePath(pathname) ||
    isOrgRoute ||
    isCreatorPage ||
    HIDE_SIDEBAR_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  const useHorizontal = (bootstrap?.navbarLayout ?? "vertical") === "horizontal"
  if (hidePaths || useHorizontal) return null
  return <LeftSidebar />
}

export { SIDEBAR_WIDTH_PX }
