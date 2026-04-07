"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { getBootstrapUrl } from "@/lib/bootstrapFetch"

const NAV_LAYOUT_KEY = "iq_nav_layout"

export type BootstrapData = {
  username: string | null
  country: string | null
  paid: boolean
  entryFee: number
  blocked?: boolean
  blockKey?: string
  blockReason?: string
  blockUsername?: string
  enrollment?: { tournamentId: string; tournamentTitle: string } | null
  progressPct?: number
  targetAudience?: number
  memberId?: string
  navbarLayout?: "horizontal" | "vertical"
  vipModalEnabled?: boolean
  vipModalImage?: string
  vipModalLink?: string
  vipModalTitle?: string
  vipModalButtonText?: string
}

type BootstrapContextValue = {
  data: BootstrapData | null
  loaded: boolean
  refetch: () => void
  /** Instant layout guess from cache (no fetch wait) */
  cachedLayout: "horizontal" | "vertical" | null
}

const BootstrapContext = createContext<BootstrapContextValue | null>(null)

function getCachedLayout(): "horizontal" | "vertical" | null {
  if (typeof window === "undefined") return null
  try {
    const v = sessionStorage.getItem(NAV_LAYOUT_KEY)
    return v === "h" ? "horizontal" : v === "v" ? "vertical" : null
  } catch {
    return null
  }
}

function setCachedLayout(layout: "horizontal" | "vertical") {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(NAV_LAYOUT_KEY, layout === "horizontal" ? "h" : "v")
  } catch { }
}

function loggedOutBootstrapData(): BootstrapData {
  const layout = getCachedLayout() ?? "vertical"
  return {
    username: null,
    country: null,
    paid: false,
    entryFee: 100,
    navbarLayout: layout,
    enrollment: null,
  }
}

export function BootstrapProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<BootstrapData | null>(null)
  const [loaded, setLoaded] = useState(false)

  const fetchBootstrap = useCallback(() => {
    const run = (attempt: 0 | 1) => {
      fetch(getBootstrapUrl(), { cache: "no-store", credentials: "include" })
        .then(async (r) => {
          const j = await r.json().catch(() => ({} as Record<string, unknown>))
          if (j?.sessionInvalid) {
            if (attempt === 0) {
              const { recoverFromInvalidSession } = await import("@/lib/logout")
              await recoverFromInvalidSession()
              run(1)
              return null
            }
            setData(loggedOutBootstrapData())
            setLoaded(true)
            return null
          }
          return j
        })
        .then((j) => {
          if (!j) return
          const d = (j as { data?: Record<string, unknown> }).data ?? {}
          let localPaid = false
          try {
            localPaid = typeof window !== "undefined" && window.localStorage.getItem("paid") === "1"
          } catch { }
          const layout = d.navbarLayout === "horizontal" ? "horizontal" : "vertical"
          setCachedLayout(layout)
          setData({
            username: (d.username as string | null) ?? null,
            country: (d.country as string | null) ?? null,
            paid: Boolean(d.paid) || localPaid,
            entryFee: Number(d.entryFee ?? 100),
            blocked: (j as { blocked?: boolean }).blocked ?? (d.blocked as boolean | undefined),
            blockKey: (j as { blockKey?: string }).blockKey ?? (d.blockKey as string | undefined),
            blockReason: (j as { blockReason?: string }).blockReason ?? (d.blockReason as string | undefined),
            blockUsername: (j as { blockUsername?: string }).blockUsername ?? (d.blockUsername as string | undefined),
            enrollment: (d.enrollment as BootstrapData["enrollment"]) ?? null,
            progressPct: d.progressPct as number | undefined,
            targetAudience: d.targetAudience as number | undefined,
            memberId: d.memberId as string | undefined,
            navbarLayout: layout,
            vipModalEnabled: Boolean(d.vipModalEnabled),
            vipModalImage: d.vipModalImage as string | undefined,
            vipModalLink: d.vipModalLink as string | undefined,
            vipModalTitle: d.vipModalTitle as string | undefined,
            vipModalButtonText: d.vipModalButtonText as string | undefined
          })
          setLoaded(true)
        })
        .catch(() => {
          setData((prev) => prev ?? loggedOutBootstrapData())
          setLoaded(true)
        })
    }
    run(0)
  }, [])

  useEffect(() => {
    fetchBootstrap()
    const onInvalidate = () => fetchBootstrap()
    window.addEventListener("bootstrap-invalidate", onInvalidate)
    return () => window.removeEventListener("bootstrap-invalidate", onInvalidate)
  }, [fetchBootstrap])

  const value: BootstrapContextValue = {
    data,
    loaded,
    refetch: fetchBootstrap,
    cachedLayout: data?.navbarLayout ?? getCachedLayout()
  }

  return (
    <BootstrapContext.Provider value={value}>
      {children}
    </BootstrapContext.Provider>
  )
}

export function useBootstrapContext(): BootstrapContextValue | null {
  return useContext(BootstrapContext)
}
