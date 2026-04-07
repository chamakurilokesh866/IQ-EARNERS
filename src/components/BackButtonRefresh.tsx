"use client"

import { useEffect } from "react"
import { shouldRedirectToIntro } from "@/lib/session"

const INTRO_AFTER_LOGOUT = "/intro?from=logout"

/**
 * 1) On mount: if on protected path with no session (e.g. back nav, direct URL), redirect to intro.
 * 2) On pageshow (bfcache restore): same check, or reload for fresh data.
 * 3) On popstate (back/forward): if on intro?from=logout, prevent back; else if protected with no session, redirect.
 */
export default function BackButtonRefresh() {
  useEffect(() => {
    const path = typeof window !== "undefined" ? window.location.pathname : ""
    if (shouldRedirectToIntro(path)) {
      window.location.replace(INTRO_AFTER_LOGOUT)
      return
    }
    const handler = (e: PageTransitionEvent) => {
      if (!e.persisted) return
      const p = typeof window !== "undefined" ? window.location.pathname : ""
      if (shouldRedirectToIntro(p)) {
        window.location.replace(INTRO_AFTER_LOGOUT)
      }
      // Keep bfcache snapshot when session is valid — avoids full reload and feels faster
    }
    const popHandler = () => {
      const p = typeof window !== "undefined" ? window.location.pathname : ""
      if (shouldRedirectToIntro(p)) {
        window.location.replace(INTRO_AFTER_LOGOUT)
      }
    }
    const visibilityHandler = () => {
      if (document.visibilityState !== "visible") return
      const p = typeof window !== "undefined" ? window.location.pathname : ""
      if (shouldRedirectToIntro(p)) {
        window.location.replace(INTRO_AFTER_LOGOUT)
      }
    }
    window.addEventListener("pageshow", handler)
    window.addEventListener("popstate", popHandler)
    document.addEventListener("visibilitychange", visibilityHandler)
    return () => {
      window.removeEventListener("pageshow", handler)
      window.removeEventListener("popstate", popHandler)
      document.removeEventListener("visibilitychange", visibilityHandler)
    }
  }, [])
  return null
}
