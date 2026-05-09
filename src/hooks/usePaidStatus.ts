"use client"

import { useEffect, useState } from "react"
import { getBootstrapUrl } from "@/lib/bootstrapFetch"

export function usePaidStatus() {
  const [paid, setPaid] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch(getBootstrapUrl(), { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return
        setPaid(Boolean(j?.data?.paid))
      })
      .catch(() => {
        if (!cancelled) setPaid(false)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { paid: paid ?? false, loading }
}
