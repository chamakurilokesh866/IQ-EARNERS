"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

const STORAGE_KEY = "iq_earners_active_tab"
const TAB_ID_KEY = "iq_earners_tab_id"
const WARNING_DISMISSED_KEY = "iq_earners_tab_warning_dismissed"
const HEARTBEAT_MS = 25000
const STALE_MS = 90000

function getTabId(): string {
  if (typeof window === "undefined") return ""
  try {
    let id = sessionStorage.getItem(TAB_ID_KEY)
    if (!id) {
      id = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
      sessionStorage.setItem(TAB_ID_KEY, id)
    }
    return id
  } catch {
    return ""
  }
}

function readActiveTab(): { tabId: string; updatedAt: number } | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { tabId?: string; updatedAt?: number }
    if (parsed?.tabId && typeof parsed.updatedAt === "number") return { tabId: parsed.tabId, updatedAt: parsed.updatedAt }
  } catch {}
  return null
}

function writeActiveTab(tabId: string) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tabId, updatedAt: Date.now() }))
  } catch {}
}

export default function SingleTabEnforcer() {
  const searchParams = useSearchParams()
  const [showWarning, setShowWarning] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return

    const tabId = getTabId()
    if (!tabId) return

    const hasRef = !!searchParams.get("ref")
    if (hasRef) {
      writeActiveTab(tabId)
      return
    }

    const check = () => {
      const active = readActiveTab()
      const now = Date.now()

      if (!active) {
        writeActiveTab(tabId)
        return
      }

      if (active.tabId === tabId) {
        writeActiveTab(tabId)
        return
      }

      if (now - active.updatedAt >= STALE_MS) {
        writeActiveTab(tabId)
        try { sessionStorage.removeItem(WARNING_DISMISSED_KEY) } catch {}
        return
      }

      const dismissed = sessionStorage.getItem(WARNING_DISMISSED_KEY)
      if (!dismissed) setShowWarning(true)
    }

    check()
    const heartbeat = setInterval(() => {
      const active = readActiveTab()
      if (active?.tabId === tabId) writeActiveTab(tabId)
      else check()
    }, HEARTBEAT_MS)

    return () => clearInterval(heartbeat)
  }, [mounted, searchParams])

  const dismissWarning = () => {
    setShowWarning(false)
    try { sessionStorage.setItem(WARNING_DISMISSED_KEY, "1") } catch {}
  }

  if (!showWarning) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-[9998] animate-slide-up">
      <div className="rounded-xl border border-amber-500/60 bg-[#0a0c10] px-4 py-3 flex items-start gap-3 shadow-2xl shadow-black/80">
        <span className="text-2xl shrink-0">⚠️</span>
        <div className="flex-1 min-w-0">
          <p className="font-black text-amber-400 uppercase tracking-tight text-sm">Another tab is using this account</p>
          <p className="text-sm text-slate-300 mt-1 leading-relaxed">Use only one tab per browser until you log out. Multiple tabs may cause data conflicts.</p>
          <button
            type="button"
            onClick={dismissWarning}
            className="mt-3 text-xs font-bold text-amber-500 hover:text-amber-400 underline decoration-amber-500/30 underline-offset-4 tracking-wide uppercase"
          >
            Dismiss System Warning
          </button>
        </div>
        <button
          type="button"
          onClick={dismissWarning}
          className="shrink-0 rounded-lg p-1.5 hover:bg-white/5 text-slate-500 hover:text-white transition-colors"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
