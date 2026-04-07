"use client"

import { useEffect, useRef } from "react"

/** AdSense loader: single global script in `app/layout.tsx` — do not inject a second copy here. */

/** Detect if HTML contains script tags (Adsterra, PropellerAds, etc. use document.write) */
function hasScriptTags(html: string): boolean {
  return /<script[\s>]/i.test(html)
}

/**
 * Renders ad HTML. Script-based ads (Adsterra, PropellerAds) use document.write
 * and must run inside an iframe. Other ads use direct DOM injection.
 */
export default function AdRenderer({ html, className }: { html: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const lastHtml = useRef("")

  useEffect(() => {
    const el = containerRef.current
    if (!el || !html?.trim()) {
      if (el) el.innerHTML = ""
      lastHtml.current = ""
      return
    }

    if (lastHtml.current === html) return
    lastHtml.current = html

    el.innerHTML = ""

    if (hasScriptTags(html)) {
      const iframe = document.createElement("iframe")
      iframe.setAttribute("title", "Advertisement")
      iframe.style.cssText = "width:100%;min-height:90px;max-height:600px;border:0;overflow:hidden;display:block;"
      iframe.className = className ?? ""
      el.appendChild(iframe)
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document
        if (doc) {
          const fixed = html.replace(/src=["'](\/\/[^"']+)["']/gi, (_, url) => `src="https:${url}"`)
          const full = `<!DOCTYPE html><html><head><base target="_top"></head><body style="margin:0;padding:0">${fixed}</body></html>`
          doc.open()
          doc.write(full)
          doc.close()
        }
      } catch (err) {
        console.warn("[AdRenderer] iframe write failed:", err)
      }
      return () => {
        el.innerHTML = ""
        lastHtml.current = ""
      }
    }

    const temp = document.createElement("div")
    temp.innerHTML = html

    const scripts: { src?: string; text: string; attrs: Array<[string, string]> }[] = []
    temp.querySelectorAll("script").forEach((s) => {
      const attrs: Array<[string, string]> = []
      for (let i = 0; i < s.attributes.length; i++) {
        const a = s.attributes[i]
        if (a.name !== "src") attrs.push([a.name, a.value])
      }
      scripts.push({
        src: s.getAttribute("src") || undefined,
        text: s.textContent || "",
        attrs,
      })
      s.remove()
    })

    el.innerHTML = temp.innerHTML

    scripts.forEach(({ src, text, attrs }) => {
      const script = document.createElement("script")
      attrs.forEach(([k, v]) => script.setAttribute(k, v))
      if (src) {
        let finalSrc = src
        if (finalSrc.startsWith("//")) finalSrc = "https:" + finalSrc
        script.src = finalSrc
        script.async = true
      } else if (text) {
        script.textContent = text
      }
      el.appendChild(script)
    })

    const adsenseEls = el.querySelectorAll("ins.adsbygoogle")
    if (adsenseEls.length > 0) {
      try {
        const w = window as any
        w.adsbygoogle = w.adsbygoogle || []
        adsenseEls.forEach(() => w.adsbygoogle.push({}))
      } catch {}
    }

    return () => {
      if (el) el.innerHTML = ""
      lastHtml.current = ""
    }
  }, [html, className])

  return <div ref={containerRef} className={`w-full max-w-full box-border ${className ?? ""}`} />
}
