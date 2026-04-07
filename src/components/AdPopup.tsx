"use client"

import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import AdRenderer from "./AdRenderer"

type AdSlotData = { id: string; html: string; enabled: boolean; page: string }
type AdsConfig = {
  enabled: boolean
  slots: AdSlotData[]
  popupHideOnPaths?: string[]
  popupDelayMs?: number
  popupEnabled?: boolean
}

const STORAGE_KEY = "ad_popup_last"

function pathMatchesHide(pathname: string, hidePaths: string[] | undefined): boolean {
  if (!pathname || !Array.isArray(hidePaths) || hidePaths.length === 0) return false
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`
  return hidePaths.some((p) => {
    const base = p.startsWith("/") ? p : `/${p}`
    return path === base || path.startsWith(`${base}/`)
  })
}

export default function AdPopup() {
  const pathname = usePathname() ?? ""
  const [cfg, setCfg] = useState<AdsConfig | null>(null)
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetch("/api/ads", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setCfg(j.data ?? null))
      .catch(() => setCfg(null))
  }, [])

  const popupSlot = useMemo(() => {
    if (!cfg?.enabled) return null
    if (cfg.popupEnabled === false) return null
    return cfg.slots?.find((s) => s.id === "popup_modal" && s.enabled && s.html?.trim()) ?? null
  }, [cfg])

  // Only use pathname after mount to avoid hydration mismatch (server vs client path)
  const hideOnThisPage = useMemo(
    () => !mounted || pathMatchesHide(pathname, cfg?.popupHideOnPaths),
    [mounted, pathname, cfg?.popupHideOnPaths]
  )
  const delayMs = typeof cfg?.popupDelayMs === "number" ? cfg.popupDelayMs : 5000

  const isQuizFullscreenPath =
    pathname === "/daily-quiz" || pathname.startsWith("/daily-quiz/")

  const shouldShow = useMemo(() => {
    if (!mounted || !popupSlot || hideOnThisPage || isQuizFullscreenPath) return false
    try {
      const last = parseInt(window.localStorage.getItem(STORAGE_KEY) || "0", 10)
      if (Date.now() - last < 60000) return false
    } catch {}
    return true
  }, [mounted, popupSlot, hideOnThisPage, isQuizFullscreenPath])

  useEffect(() => {
    if (!shouldShow || !popupSlot) return
    const t = setTimeout(() => {
      setVisible(true)
      fetch("/api/ads/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snippetId: popupSlot.id, type: "impression", page: "popup" })
      }).catch(() => {})
    }, delayMs)
    return () => clearTimeout(t)
  }, [shouldShow, popupSlot, delayMs])

  const close = () => {
    setVisible(false)
    try { window.localStorage.setItem(STORAGE_KEY, String(Date.now())) } catch {}
  }

  if (!visible || !popupSlot) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/50 animate-fade" onClick={close}>
      <div className="ad-popup-card w-full max-w-[95vw] sm:max-w-2xl md:max-w-3xl max-h-[85vh] flex flex-col rounded-xl sm:rounded-2xl border border-navy-600/50 bg-navy-800 shadow-2xl overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-navy-600/50 bg-navy-700/50 shrink-0">
          <span className="text-[10px] sm:text-xs font-medium text-navy-400 uppercase tracking-wider">Sponsored</span>
          <button onClick={close} className="rounded-lg p-1.5 sm:p-2 hover:bg-navy-600/80 text-navy-400 hover:text-white transition-colors text-lg" aria-label="Close">✕</button>
        </div>
        <div className="p-3 sm:p-6 md:p-8 overflow-y-auto overflow-x-hidden flex-1 min-h-0" onClick={() => {
          fetch("/api/ads/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ snippetId: popupSlot.id, type: "click", page: "popup" }) }).catch(() => {})
        }}>
          <AdRenderer html={popupSlot.html} className="ad-popup-content min-w-0 w-full [&_img]:max-w-full [&_img]:h-auto [&_iframe]:max-w-full [&_iframe]:border-0 [&_*]:max-w-full" />
        </div>
      </div>
    </div>
  )
}
