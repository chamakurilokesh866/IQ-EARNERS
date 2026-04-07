"use client"

import { useEffect } from "react"

/**
 * Fetches CSRF token on app load so it's available for subsequent requests.
 * The token is stored in a cookie and can be sent via X-CSRF-Token header.
 */
export default function CsrfInit() {
  useEffect(() => {
    fetch("/api/csrf", { credentials: "include" }).catch(() => {})
  }, [])
  return null
}
