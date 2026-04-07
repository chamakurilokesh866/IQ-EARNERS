"use client"

import { useRouter, usePathname } from "next/navigation"
import { useUI } from "@/context/UIContext"
import { withSid } from "@/lib/session"

const PAGE_LABELS: Record<string, string> = {
  "/": "Home",
  "/home": "Home",
  "/intro": "Intro",
  "/leaderboard": "Leaderboard",
  "/tournaments": "Tournaments",
  "/prizes": "Prizes",
  "/daily-quiz": "Daily Quiz",
  "/user": "User",
  "/more": "More",
  "/create-username": "Create Username",
}

function getPageLabel(path: string): string {
  return PAGE_LABELS[path] ?? path.split("/").filter(Boolean).pop() ?? "Page"
}

/**
 * Hook that returns a navigate function which shows the transition overlay
 * before navigating. Use for programmatic redirects (e.g. after login, payment, etc.)
 * so users get the same smooth transition as TransitionLink.
 */
export function useTransitionNavigate() {
  const router = useRouter()
  const pathname = usePathname() ?? "/"
  const { setLoading, setTransition } = useUI()

  const navigate = (href: string, options?: { replace?: boolean }) => {
    const resolved = withSid(href)
    const toPath = typeof resolved === "string" ? resolved.split("?")[0] : "/"
    setLoading(true)
    setTransition(getPageLabel(pathname), getPageLabel(toPath))
    if (options?.replace) {
      router.replace(resolved)
    } else {
      router.push(resolved)
    }
  }

  return { navigate }
}
