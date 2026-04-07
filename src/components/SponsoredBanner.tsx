"use client"

import { useEffect, useRef, useState } from "react"
import AdRenderer from "./AdRenderer"

type AdSlotData = { id: string; html: string; enabled: boolean }
type AdsConfig = { enabled: boolean; adsenseClientId?: string; adsenseSlotId?: string; slots: AdSlotData[] }

function AdsenseUnit({ clientId, slotId }: { clientId: string; slotId: string }) {
  const ref = useRef<HTMLModElement>(null)
  const pushed = useRef(false)
  useEffect(() => {
    if (!ref.current || pushed.current) return
    pushed.current = true
    try {
      const w = window as any
      w.adsbygoogle = w.adsbygoogle || []
      w.adsbygoogle.push({})
    } catch {}
  }, [])
  return (
    <ins ref={ref} className="adsbygoogle" style={{ display: "block" }}
      data-ad-client={clientId}
      data-ad-slot={slotId}
      data-ad-format="auto"
      data-full-width-responsive="true" />
  )
}

export default function SponsoredBanner() {
  const [cfg, setCfg] = useState<AdsConfig | null>(null)
  const [mounted, setMounted] = useState(false)
  const tracked = useRef(false)

  useEffect(() => {
    setMounted(true)
    fetch("/api/ads", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setCfg(j.data ?? null))
      .catch(() => {})
  }, [])

  const slot = cfg?.slots?.find((s) => s.id === "footer_banner" && s.enabled)
  const hasHtml = !!slot?.html?.trim()
  const hasAdsense = !!cfg?.adsenseClientId && !!cfg?.adsenseSlotId

  useEffect(() => {
    if (!slot || !cfg?.enabled || tracked.current || (!hasHtml && !hasAdsense)) return
    tracked.current = true
    fetch("/api/ads/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ snippetId: "footer_banner", type: "impression", page: "footer" }) }).catch(() => {})
  }, [slot, cfg, hasHtml, hasAdsense])

  if (!mounted || !cfg?.enabled || !slot?.enabled) return null
  if (!hasHtml && !hasAdsense) return null

  return (
    <div className="w-full border-t border-navy-700/50 bg-navy-900/95 backdrop-blur-sm overflow-hidden" onClick={() => {
      fetch("/api/ads/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ snippetId: "footer_banner", type: "click", page: "footer" }) }).catch(() => {})
    }}>
      <div className="mx-auto max-w-7xl px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[9px] font-semibold text-navy-500 uppercase tracking-widest">Ad</span>
        </div>
        <div className="w-full overflow-x-auto overflow-y-hidden">
          {hasHtml ? (
            <AdRenderer html={slot.html} className="w-full min-w-0 [&_img]:max-w-full [&_img]:h-auto [&_iframe]:max-w-full [&_iframe]:border-0 [&_*]:max-w-full [&_ins]:block [&_ins]:w-full" />
          ) : hasAdsense ? (
            <AdsenseUnit clientId={cfg.adsenseClientId!} slotId={cfg.adsenseSlotId!} />
          ) : null}
        </div>
      </div>
    </div>
  )
}
