"use client"

import { useEffect } from "react"

const APP_ORIGIN = typeof window !== "undefined" ? new URL(process.env.NEXT_PUBLIC_BASE_URL || window.location.origin).origin : ""

function isSameOrigin(href: string): boolean {
  if (!href || href.startsWith("#") || href.startsWith("javascript:")) return true
  try {
    const url = new URL(href, window.location.origin)
    return url.origin === window.location.origin || url.origin === APP_ORIGIN
  } catch {
    return true
  }
}

function performLogout() {
  try {
    fetch("/api/user/logout", { method: "POST", credentials: "include" }).catch(() => {})
  } catch {}
  try {
    window.localStorage?.removeItem("paid")
    ;["uid", "paid", "username", "sid", "role"].forEach((c) => {
      document.cookie = `${c}=; path=/; max-age=0`
    })
  } catch {}
}

function hasSession(): boolean {
  if (typeof document === "undefined") return false
  return !!document.cookie.match(/sid=|uid=/)
}

export default function DomainGuard() {
  useEffect(() => {
    if (typeof window === "undefined" || !hasSession()) return
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as Element)?.closest("a")
      if (!target?.href) return
      if (target.target === "_blank") return
      if (!isSameOrigin(target.href) && hasSession()) {
        performLogout()
      }
    }
    document.addEventListener("click", handleClick, true)
    return () => document.removeEventListener("click", handleClick, true)
  }, [])
  return null
}
