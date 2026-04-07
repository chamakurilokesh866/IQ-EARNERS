"use client"

import { useEffect } from "react"

/**
 * Registers the service worker for PWA (install, offline, push).
 * Keeps one registration; NotificationToast may also register when enabling push.
 */
export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        if (process.env.NODE_ENV === "development") {
          console.log("[PWA] Service worker registered", reg.scope)
        }
      })
      .catch(() => {})
  }, [])
  return null
}
