"use client"

import { useBootstrapContext } from "@/context/BootstrapContext"

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

export function useBootstrap() {
  const ctx = useBootstrapContext()
  if (!ctx) {
    return {
      data: null,
      loaded: false,
      refetch: () => { },
      cachedLayout: null as "horizontal" | "vertical" | null
    }
  }
  return { data: ctx.data, loaded: ctx.loaded, refetch: ctx.refetch, cachedLayout: ctx.cachedLayout }
}
