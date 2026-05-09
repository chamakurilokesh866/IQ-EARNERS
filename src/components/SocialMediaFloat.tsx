"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { isMoreHubOrApiGuidePath } from "@/lib/moreDocsPaths"

const HIDE_PATHS = ["/intro", "/maintenance", "/create-username", "/payment", "/login", "/blocked", "/unblock", "/more/admin", "/a"]

type SocialLinks = {
  instagram?: string
  facebook?: string
  twitter?: string
  youtube?: string
  linkedin?: string
}

const ICONS: Record<keyof SocialLinks, { label: string; icon: string; color: string }> = {
  instagram: { label: "Instagram", icon: "📷", color: "hover:bg-gradient-to-br hover:from-purple-600 hover:to-pink-500" },
  facebook: { label: "Facebook", icon: "📘", color: "hover:bg-blue-600" },
  twitter: { label: "X / Twitter", icon: "𝕏", color: "hover:bg-black" },
  youtube: { label: "YouTube", icon: "▶", color: "hover:bg-red-600" },
  linkedin: { label: "LinkedIn", icon: "in", color: "hover:bg-blue-700" }
}

function isValidUrl(s: string | undefined): boolean {
  if (!s || typeof s !== "string") return false
  const t = s.trim()
  return t.length > 5 && (t.startsWith("http://") || t.startsWith("https://"))
}

export default function SocialMediaFloat() {
  const pathname = usePathname() ?? ""
  const [config, setConfig] = useState<{ enabled: boolean; links: SocialLinks } | null>(null)

  useEffect(() => {
    fetch("/api/stats/public", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const enabled = !!j?.data?.socialMediaEnabled
        const links = (j?.data?.socialMediaLinks ?? {}) as SocialLinks
        setConfig({ enabled, links })
      })
      .catch(() => setConfig({ enabled: false, links: {} }))
  }, [])

  const isOrgRoute = pathname === "/org" || pathname.startsWith("/org/")
  const hide = isMoreHubOrApiGuidePath(pathname) || isOrgRoute || HIDE_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  if (hide || !config?.enabled) return null

  const entries = (Object.entries(config.links) as [keyof SocialLinks, string][]).filter(([, url]) => isValidUrl(url))
  if (entries.length === 0) return null

  const instagramUrl = config.links.instagram && isValidUrl(config.links.instagram) ? config.links.instagram : null
  const others = entries.filter(([k]) => k !== "instagram")

  return (
    <div className="fixed bottom-6 left-6 z-[90] flex flex-col gap-2">
      {instagramUrl && (
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-12 h-12 rounded-full bg-navy-800/90 backdrop-blur border border-white/10 flex items-center justify-center text-xl shadow-lg transition-all hover:scale-110 hover:border-pink-500/50 hover:bg-gradient-to-br hover:from-purple-600 hover:to-pink-500"
          aria-label="Instagram"
          title="Instagram"
        >
          📷
        </a>
      )}
      {others.map(([key, url]) => (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`w-10 h-10 rounded-full bg-navy-800/90 backdrop-blur border border-white/10 flex items-center justify-center text-sm font-bold shadow-lg transition-all hover:scale-110 ${ICONS[key]?.color ?? ""}`}
          aria-label={ICONS[key]?.label ?? key}
          title={ICONS[key]?.label ?? key}
        >
          {ICONS[key]?.icon ?? key.slice(0, 1)}
        </a>
      ))}
    </div>
  )
}
