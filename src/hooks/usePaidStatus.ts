"use client"

import { useEffect, useState } from "react"

export function usePaidStatus() {
  const [paid, setPaid] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch("/api/user/profile", { cache: "no-store", credentials: "include" }).then((r) => r.json()).catch(() => ({ data: null })),
      fetch("/api/user/payments", { cache: "no-store", credentials: "include" }).then((r) => r.json()).catch(() => ({ data: [] }))
    ])
      .then(([prof, pays]) => {
        if (cancelled) return
        const uname = prof?.data?.username
        const arr = Array.isArray(pays?.data) ? pays.data : []
        const metaName = (p: { meta?: Record<string, unknown> }) =>
          String((p?.meta?.username ?? p?.meta?.name ?? p?.meta?.customerName ?? "")).toLowerCase()
        const ok = arr.some((p: { status?: string; type?: string; meta?: Record<string, unknown> }) =>
          p.status === "success" && p.type === "tournament" && uname && metaName(p) === uname.toLowerCase()
        )
        let localPaid = false
        try {
          localPaid = typeof window !== "undefined" && (document.cookie.includes("paid=1") || localStorage?.getItem("paid") === "1")
        } catch {}
        setPaid(ok || localPaid)
      })
      .catch(() => {
        if (!cancelled) setPaid(false)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  return { paid: paid ?? false, loading }
}
