"use client"

import { useState, useEffect, useCallback, useRef, type MutableRefObject } from "react"
import { adminFetch, fetchAdminPendingPayments } from "@/lib/admin/client"
import type { AdminStatsSnapshot } from "@/components/admin/DashboardOverview"
import type { AdminTab } from "@/components/admin/AdminNavConfig"

export type AdminAccessState = "checking" | "ok" | "denied" | "locked"

export function useAdminDashboardData(tabRef: MutableRefObject<AdminTab>) {
  const [adminAccess, setAdminAccess] = useState<AdminAccessState>("checking")
  const [stats, setStats] = useState<AdminStatsSnapshot | null>(null)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [statsRefreshing, setStatsRefreshing] = useState(false)
  const [blockedCount, setBlockedCount] = useState(0)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [paymentToast, setPaymentToast] = useState<{ amount: number } | null>(null)
  const prevPendingStatsRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/admin/me", { credentials: "include", cache: "no-store" })
      .then((r) => r.json().catch(() => ({})))
      .then((j) => {
        if (cancelled) return
        if (j?.locked) setAdminAccess("locked")
        else if (j?.admin === true) setAdminAccess("ok")
        else setAdminAccess("denied")
      })
      .catch(() => {
        if (!cancelled) setAdminAccess("denied")
      })
    return () => {
      cancelled = true
    }
  }, [])

  const refreshStats = useCallback(async () => {
    setStatsRefreshing(true)
    setStatsError(null)
    try {
      const r = await fetch("/api/stats", { cache: "no-store", credentials: "include" })
      if (r.status === 401 || r.status === 403) {
        setStats(null)
        setStatsError("Not authorized for live stats (admin session required).")
        return
      }
      const j = await r.json().catch(() => null)
      if (!j?.ok) {
        setStatsError(typeof j?.error === "string" ? j.error : `Stats request failed (${r.status})`)
        return
      }
      const data = (j.data ?? null) as AdminStatsSnapshot | null
      setStats(data)
      setLastRefresh(new Date())
      const p = data?.pendingPayments ?? 0
      const prev = prevPendingStatsRef.current
      prevPendingStatsRef.current = p
      if (prev !== null && p > prev && tabRef.current !== "Payments") {
        fetchAdminPendingPayments().then((items) => {
          const amt = items[0]?.amount ?? 0
          setPaymentToast({ amount: amt })
          setTimeout(() => setPaymentToast(null), 5000)
        })
      }
    } catch {
      setStatsError("Network error loading platform stats.")
      setStats(null)
    } finally {
      setStatsRefreshing(false)
    }
  }, [tabRef])

  useEffect(() => {
    if (adminAccess !== "ok") return
    void refreshStats()
    adminFetch("/api/admin/blocked")
      .then((r) => {
        if (r.status === 401 || r.status === 403) return null
        return r.json()
      })
      .then((j) => {
        if (j) setBlockedCount(Array.isArray(j?.data) ? j.data.length : 0)
      })
      .catch(() => {})
    const t = setInterval(() => void refreshStats(), 10000)
    return () => clearInterval(t)
  }, [refreshStats, adminAccess])

  return {
    adminAccess,
    stats,
    statsError,
    statsRefreshing,
    blockedCount,
    lastRefresh,
    paymentToast,
    setPaymentToast,
    refreshStats,
  }
}
