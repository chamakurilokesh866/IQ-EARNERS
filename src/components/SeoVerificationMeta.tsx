"use client"

import { useEffect } from "react"

/**
 * Fetches SEO verification codes from admin settings and injects meta tags.
 * Admin adds codes in Dashboard → Settings → SEO Verification; they auto-wire here.
 */
export default function SeoVerificationMeta() {
  useEffect(() => {
    fetch("/api/seo/verification", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { google?: string; bing?: string; yandex?: string }) => {
        if (!data) return
        const head = document.head
        const existing = head.querySelectorAll('meta[name="google-site-verification"], meta[name="msvalidate.01"], meta[name="yandex-verification"]')
        existing.forEach((el) => el.remove())
        if (data.google) {
          const m = document.createElement("meta")
          m.name = "google-site-verification"
          m.content = data.google
          head.appendChild(m)
        }
        if (data.bing) {
          const m = document.createElement("meta")
          m.name = "msvalidate.01"
          m.content = data.bing
          head.appendChild(m)
        }
        if (data.yandex) {
          const m = document.createElement("meta")
          m.name = "yandex-verification"
          m.content = data.yandex
          head.appendChild(m)
        }
      })
      .catch(() => {})
  }, [])
  return null
}
