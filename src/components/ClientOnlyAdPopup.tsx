"use client"

import { useEffect, useState } from "react"
import AdPopup from "./AdPopup"

/** Renders AdPopup only after client mount to avoid hydration mismatch and hook-order issues. */
export default function ClientOnlyAdPopup() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return <AdPopup />
}
