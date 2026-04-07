"use client"

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

import { useAdminDashboardData } from "@/hooks/useAdminDashboardData"
import AdminWorkspaceShell from "@/components/admin/AdminWorkspaceShell"
import { AdminTabContent } from "@/components/admin/AdminTabContent"
import {
  ADMIN_NAV_ITEMS,
  LS_SIDEBAR_COMPACT,
  parseTabParam,
  type AdminTab,
} from "@/components/admin/AdminNavConfig"

function useNowString() {
  const [t, setT] = useState("")
  useEffect(() => {
    const tick = () =>
      setT(
        new Date().toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      )
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return t
}

function PaymentToast({
  toast,
  onDismiss,
  onReviewPayments,
}: {
  toast: { amount: number } | null
  onDismiss: () => void
  onReviewPayments: () => void
}) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -16, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: -12, x: "-50%" }}
          className="fixed top-20 left-1/2 z-[200] max-w-sm w-[90%]"
        >
          <div className="rounded-2xl bg-gradient-to-r from-primary via-violet-500 to-accent px-5 py-3.5 text-sm font-black text-white shadow-[0_0_40px_rgba(124,58,237,0.45)] border border-white/25 flex items-center justify-between gap-3">
            <span>💰 New payment · ₹{toast.amount.toLocaleString()}</span>
            <button
              type="button"
              className="text-xs underline font-bold opacity-90 hover:opacity-100"
              onClick={() => {
                onDismiss()
                onReviewPayments()
              }}
            >
              Review
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function AdminDashboardInner() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<AdminTab>("Overview")
  const [searchQuery, setSearchQuery] = useState("")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [sidebarCompact, setSidebarCompact] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const tabRef = useRef<AdminTab>(tab)
  const clock = useNowString()

  const {
    adminAccess,
    stats,
    statsError,
    statsRefreshing,
    blockedCount,
    lastRefresh,
    paymentToast,
    setPaymentToast,
    refreshStats,
  } = useAdminDashboardData(tabRef)

  useEffect(() => {
    tabRef.current = tab
  }, [tab])

  useEffect(() => {
    try {
      setSidebarCompact(localStorage.getItem(LS_SIDEBAR_COMPACT) === "1")
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    const parsed = parseTabParam(searchParams.get("tab"))
    setTab(parsed ?? "Overview")
  }, [searchParams])

  useEffect(() => {
    if (adminAccess !== "denied") return
    router.replace("/intro?msg=admin-required")
  }, [adminAccess, router])

  const navigateToTab = useCallback(
    (next: AdminTab) => {
      setTab(next)
      setIsMobileMenuOpen(false)
      const params = new URLSearchParams(searchParams.toString())
      if (next === "Overview") params.delete("tab")
      else params.set("tab", next)
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const copyContextToClipboard = useCallback(() => {
    const context = {
      timestamp: new Date().toISOString(),
      currentTab: tab,
      platformStats: stats || {},
      systemStatus: { blockedUsers: blockedCount, pendingPayments: stats?.pendingPayments || 0 },
    }
    navigator.clipboard.writeText(JSON.stringify(context, null, 2)).then(() => {
      const btn = document.getElementById("copy-admin-context-btn")
      if (btn) {
        const orig = btn.textContent
        btn.textContent = "Copied"
        setTimeout(() => {
          if (btn) btn.textContent = orig
        }, 2000)
      }
    })
  }, [tab, stats, blockedCount])

  const filteredNavItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return ADMIN_NAV_ITEMS
    return ADMIN_NAV_ITEMS.filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        n.key.toLowerCase().includes(q) ||
        n.section.toLowerCase().includes(q) ||
        n.keywords?.some((k) => k.toLowerCase().includes(q))
    )
  }, [searchQuery])

  const sidebarNavOrdered = useMemo(() => {
    const allowed = new Set(filteredNavItems.map((n) => n.key))
    return ADMIN_NAV_ITEMS.filter((n) => allowed.has(n.key))
  }, [filteredNavItems])

  const currentNavItem = ADMIN_NAV_ITEMS.find((n) => n.key === tab)
  const pendingCount = stats?.pendingPayments ?? 0

  if (adminAccess === "checking") {
    return (
      <div className="min-h-screen app-page-surface flex flex-col items-center justify-center gap-3 text-slate-400 text-sm font-semibold px-6">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-accent rounded-full animate-spin" />
        Verifying admin session…
      </div>
    )
  }

  if (adminAccess === "locked") {
    return (
      <div className="min-h-screen app-page-surface flex flex-col items-center justify-center gap-4 text-center px-6 max-w-md mx-auto">
        <p className="text-amber-400 font-black text-lg">Admin access temporarily locked</p>
        <p className="text-slate-400 text-sm">Too many failed attempts. Try again later or from another network.</p>
        <Link href="/intro" className="text-accent font-bold underline">
          Back to site
        </Link>
      </div>
    )
  }

  if (adminAccess !== "ok") {
    return (
      <div className="min-h-screen app-page-surface flex items-center justify-center text-slate-500 text-sm">
        Redirecting…
      </div>
    )
  }

  return (
    <>
      <PaymentToast
        toast={paymentToast}
        onDismiss={() => setPaymentToast(null)}
        onReviewPayments={() => navigateToTab("Payments")}
      />
      <AdminWorkspaceShell
        sidebarCompact={sidebarCompact}
        setSidebarCompact={setSidebarCompact}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchRef={searchRef}
        tab={tab}
        navigateToTab={navigateToTab}
        sidebarNavOrdered={sidebarNavOrdered}
        pendingCount={pendingCount}
        blockedCount={blockedCount}
        stats={stats}
        lastRefresh={lastRefresh}
        statsError={statsError}
        statsRefreshing={statsRefreshing}
        clock={clock}
        currentNavItem={currentNavItem}
        onRefreshStats={refreshStats}
        onCopyContext={copyContextToClipboard}
      >
        <AdminTabContent tab={tab} navigateToTab={navigateToTab} stats={stats} />
      </AdminWorkspaceShell>
    </>
  )
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen app-page-surface flex items-center justify-center text-slate-400 text-sm font-semibold">
          Loading admin…
        </div>
      }
    >
      <AdminDashboardInner />
    </Suspense>
  )
}
