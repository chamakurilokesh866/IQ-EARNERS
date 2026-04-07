"use client"

import { useState } from "react"
import { countryToFlag } from "../utils/countries"

/** Renders flag as image for reliable display (emoji can show as letters on some systems) */
export default function FlagImg({ code, size = 24, className = "" }: { code?: string; size?: number; className?: string }) {
  const [imgError, setImgError] = useState(false)
  if (!code || code === "OTHER") {
    return (
      <span className={`inline-flex items-center justify-center rounded-full bg-navy-600 text-xl ${className}`} style={{ width: size, height: size, fontSize: size * 0.5 }} title="Global">
        🌍
      </span>
    )
  }
  const c = code.toUpperCase()
  if (c.length !== 2 || imgError) {
    return (
      <span className={`inline-flex items-center justify-center rounded-full bg-navy-600 overflow-hidden ${className}`} style={{ width: size, height: size, fontSize: size * 0.6 }} title={code}>
        {countryToFlag(code)}
      </span>
    )
  }
  const src = `https://flagcdn.com/w80/${c.toLowerCase()}.png`
  return (
    <img
      src={src}
      alt={code}
      width={size}
      height={size}
      className={`rounded-full object-cover shrink-0 ${className}`}
      style={{ width: size, height: size }}
      onError={() => setImgError(true)}
    />
  )
}
