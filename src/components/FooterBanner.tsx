"use client"

import { useEffect, useMemo, useState } from "react"
import { sanitizeHtml } from "@/lib/sanitize"

type AdsConfig = {
  enabled: boolean
  placements: string[]
  snippets: Array<{ id: string; name: string; html: string }>
  providerUsername?: string
  providerKey?: string
}

export default function FooterBanner() {
  const [cfg, setCfg] = useState<AdsConfig | null>(null)
  useEffect(() => {
    fetch("/api/ads", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setCfg(j.data ?? null))
      .catch(() => setCfg(null))
  }, [])

  const shouldShow = useMemo(() => {
    if (!cfg?.enabled) return false
    if (!cfg.placements?.includes("banner")) return false
    const html = cfg?.snippets?.[0]?.html || ""
    const hasProvider = !!cfg?.providerUsername && !!cfg?.providerKey
    return !!html || hasProvider
  }, [cfg])

  if (!shouldShow) return null

  const html = cfg?.snippets?.[0]?.html || ""
  const hasProvider = !!cfg?.providerUsername && !!cfg?.providerKey

  return (
    <div className="w-full border-t border-navy-600/50 bg-navy-700/40 py-2 px-3">
      <div className="mx-auto max-w-7xl w-full flex items-center justify-center gap-4 min-h-[36px]">
        <span className="text-[9px] text-navy-500 uppercase tracking-widest shrink-0 font-bold">Advertisement</span>
        {html ? (
          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} className="footer-banner-content flex-1 min-w-0 text-center [&_img]:max-h-8 [&_*]:max-w-full [&_*]:text-xs" />
        ) : hasProvider ? (
          <div className="flex items-center justify-center gap-2 text-xs">
            <span className="text-navy-300 truncate">{cfg?.providerUsername}</span>
            <a href="#" className="pill bg-accent text-black text-xs font-medium shrink-0 py-1 px-2">Explore</a>
          </div>
        ) : null}
      </div>
    </div>
  )
}
