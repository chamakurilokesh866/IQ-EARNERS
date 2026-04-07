"use client"

import { useEffect, useState } from "react"

type AffiliateLink = {
  id: string
  title: string
  description: string
  url: string
  imageUrl?: string
  category: string
  commission?: string
}

export default function AffiliateProducts({ max = 4, limit }: { max?: number; limit?: number }) {
  const count = limit ?? max
  const [links, setLinks] = useState<AffiliateLink[]>([])

  useEffect(() => {
    fetch("/api/affiliate-links", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setLinks(Array.isArray(j.data) ? j.data.slice(0, count) : []))
      .catch(() => {})
  }, [count])

  if (!links.length) return null

  const trackClick = async (link: AffiliateLink) => {
    try {
      await fetch("/api/affiliate-links/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: link.id })
      })
    } catch {}
    window.open(link.url, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="my-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-navy-400 uppercase tracking-widest">Recommended</span>
        <div className="flex-1 h-px bg-navy-700" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {links.map((link) => (
          <button
            key={link.id}
            onClick={() => trackClick(link)}
            className="flex items-start gap-3 p-3 rounded-xl bg-navy-800/80 border border-navy-700/60 hover:border-primary/40 hover:bg-navy-800 transition-all text-left group"
          >
            {link.imageUrl ? (
              <img src={link.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 bg-navy-700" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-lg shrink-0">🔗</div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-white group-hover:text-primary transition-colors truncate">{link.title}</div>
              {link.description && <div className="text-xs text-navy-400 mt-0.5 line-clamp-2">{link.description}</div>}
              <div className="text-[10px] text-navy-500 mt-1 uppercase tracking-wider">Sponsored</div>
            </div>
            <span className="text-navy-500 group-hover:text-primary transition-colors mt-1 shrink-0">→</span>
          </button>
        ))}
      </div>
    </div>
  )
}
