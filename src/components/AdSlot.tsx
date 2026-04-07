"use client"

import { useEffect, useRef, useState } from "react"
type AdSlotData = {
  id: string
  name: string
  size: string
  page: string
  html: string
  enabled: boolean
}

type AdsConfig = {
  enabled: boolean
  adsenseClientId?: string
  adsenseSlotId?: string
  slots: AdSlotData[]
}

let _cachedConfig: AdsConfig | null = null
let _cacheTime = 0
const CACHE_TTL = 10000

async function getAdsConfig(): Promise<AdsConfig | null> {
  if (_cachedConfig && Date.now() - _cacheTime < CACHE_TTL) return _cachedConfig
  try {
    const r = await fetch("/api/ads", { credentials: "include", cache: "no-store" })
    const j = await r.json()
    if (j.ok && j.data) {
      _cachedConfig = j.data
      _cacheTime = Date.now()
      return _cachedConfig
    }
    return null
  } catch {
    return null
  }
}

export function invalidateAdCache() {
  _cachedConfig = null
  _cacheTime = 0
}

/**
 * Single component with fixed hook count so conditional html vs adsense never changes hooks (avoids React #425).
 * Renders either HTML (via AdRenderer) or AdSense ins; same hooks every time.
 */
function AdSlotContent({
  mode,
  html,
  clientId,
  slotId,
  className
}: {
  mode: "html" | "adsense"
  html: string
  clientId: string
  slotId: string
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const insRef = useRef<HTMLModElement>(null)
  const pushedRef = useRef(false)
  const lastHtmlRef = useRef("")

  useEffect(() => {
    if (mode === "html" && html?.trim()) {
      const el = containerRef.current
      if (!el) return
      if (lastHtmlRef.current === html) return
      lastHtmlRef.current = html
      el.innerHTML = ""
      const hasScripts = /<script[\s>]/i.test(html)
      if (hasScripts) {
        try {
          const iframe = document.createElement("iframe")
          iframe.setAttribute("title", "Advertisement")
          iframe.style.cssText = "width:100%;min-height:90px;max-height:600px;border:0;overflow:hidden;display:block;"
          el.appendChild(iframe)
          const doc = iframe.contentDocument || (iframe.contentWindow && (iframe.contentWindow as any).document)
          if (doc) {
            const fixed = html.replace(/src=["'](\/\/[^"']+)["']/gi, (_, u: string) => `src="https:${u}"`)
            doc.open()
            doc.write("<!DOCTYPE html><html><head><base target=\"_top\"></head><body style=\"margin:0;padding:0\">" + fixed + "</body></html>")
            doc.close()
          }
        } catch { }
        return () => { el.innerHTML = ""; lastHtmlRef.current = "" }
      }
      const temp = document.createElement("div")
      temp.innerHTML = html
      const scripts: { src?: string; text: string }[] = []
      temp.querySelectorAll("script").forEach((s) => {
        scripts.push({ src: s.getAttribute("src") || undefined, text: s.textContent || "" })
        s.remove()
      })
      el.innerHTML = temp.innerHTML
      scripts.forEach(({ src, text }) => {
        const script = document.createElement("script")
        if (src) script.src = src.startsWith("//") ? "https:" + src : src
        else if (text) script.textContent = text
        script.async = true
        el.appendChild(script)
      })
      return () => { el.innerHTML = ""; lastHtmlRef.current = "" }
    }
    if (mode === "adsense" && clientId && slotId && insRef.current) {
      if (pushedRef.current) return
      pushedRef.current = true
      try {
        const w = window as any
        w.adsbygoogle = w.adsbygoogle || []
        w.adsbygoogle.push({})
      } catch { }
    }
  }, [mode, html, clientId, slotId])

  if (mode === "html") {
    return <div ref={containerRef} className={className ?? "w-full min-w-0 max-w-full"} />
  }
  return (
    <div className={className ?? "w-full min-w-0 max-w-full"}>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}

export default function AdSlot({ slotId }: { slotId: string }) {
  const [slot, setSlot] = useState<AdSlotData | null>(null)
  const [globalEnabled, setGlobalEnabled] = useState(false)
  const [adsenseCid, setAdsenseCid] = useState("")
  const [adsenseSid, setAdsenseSid] = useState("")
  const tracked = useRef(false)

  useEffect(() => {
    getAdsConfig().then((cfg) => {
      if (!cfg) return
      setGlobalEnabled(!!cfg.enabled)
      setAdsenseCid(cfg.adsenseClientId ?? "")
      setAdsenseSid(cfg.adsenseSlotId ?? "")
      const found = cfg.slots?.find((s) => s.id === slotId)
      if (found) setSlot(found)
    })
  }, [slotId])

  useEffect(() => {
    if (!globalEnabled || !slot?.enabled || tracked.current) return
    if (!slot.html?.trim() && !adsenseCid) return
    tracked.current = true
    fetch("/api/ads/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snippetId: slot.id, type: "impression", page: slot.page })
    }).catch(() => { })
  }, [slot, globalEnabled, adsenseCid])

  if (!globalEnabled || !slot?.enabled) return null
  const hasHtml = !!slot.html?.trim()
  const hasAdsense = !!adsenseCid && !!adsenseSid
  if (!hasHtml && !hasAdsense) return null

  const trackClick = () => {
    fetch("/api/ads/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snippetId: slot.id, type: "click", page: slot.page })
    }).catch(() => { })
  }

  const sizeStr = String(slot.size || "auto")
  const isVertical = sizeStr.includes("×600") || sizeStr.includes("160×") || slot.page === "rail"
  const isSidebar = (slot.size || "").includes("300") || slot.page === "leaderboard" || slot.page === "prizes" || slot.page === "tournaments"
  const minH = sizeStr.includes("×600") ? "min-h-[600px]" : sizeStr.includes("728") ? "min-h-[90px]" : sizeStr.includes("300") ? "min-h-[250px]" : "min-h-[90px]"
  const maxW = isVertical ? "max-w-[180px] w-[160px]" : isSidebar ? "max-w-[336px]" : "max-w-[728px]"
  const wrapClass = isVertical
    ? "ad-slot-wrap ad-slot-vertical my-0 w-full shrink-0"
    : isSidebar
      ? "ad-slot-wrap my-4 w-full shrink-0"
      : "ad-slot-wrap my-6 w-full flex justify-center shrink-0"
  const innerClass = isVertical ? `w-full ${maxW} mx-auto` : isSidebar ? `w-full ${maxW} mx-auto` : `w-full ${maxW} mx-auto`
  const mode: "html" | "adsense" = hasHtml ? "html" : "adsense"

  return (
    <div
      className={`${wrapClass} opacity-50 hover:opacity-100 transition-opacity duration-500`}
      onClick={trackClick}
      style={{ isolation: "isolate" }}
    >
      <div className={`${innerClass} relative group rounded-2xl border border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent backdrop-blur-sm overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-all duration-300 hover:border-white/10`}>
        {/* Subtle glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/5 to-accent/5 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />

        <div className="relative flex items-center justify-between px-4 py-2 bg-white/[0.01] border-b border-white/5">
          <span className="text-[10px] font-bold text-navy-500 uppercase tracking-[0.2em]">Partner Content</span>
          <div className="flex gap-1">
            <div className="w-1 h-1 rounded-full bg-white/20" />
            <div className="w-1 h-1 rounded-full bg-white/20" />
          </div>
        </div>

        <div className={`relative p-4 flex justify-center items-center ${minH} [&_.ad-content]:w-full [&_.ad-content]:min-w-0`}>
          <AdSlotContent
            mode={mode}
            html={slot.html ?? ""}
            clientId={adsenseCid}
            slotId={adsenseSid}
            className="ad-content w-full min-w-0 max-w-full [&_img]:max-w-full [&_iframe]:max-w-full [&_img]:rounded-lg [&_img]:mx-auto"
          />
        </div>

        {/* Anti-adblock message placeholder? Nah, keep it clean. */}
      </div>
    </div>
  )
}
