/**
 * Lightweight device fingerprint for Smart Integrity Engine.
 * Hashes navigator + screen + timezone. No external libs.
 */

function simpleHash(str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i)
    h = ((h << 5) - h) + c
    h = h & h
  }
  return Math.abs(h).toString(36)
}

export function getDeviceFingerprint(): string {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "ssr"
  const parts: string[] = []
  parts.push(navigator.userAgent || "")
  parts.push(String(navigator.language || ""))
  parts.push(String(navigator.languages?.join(",") || ""))
  parts.push(String(screen?.width || 0))
  parts.push(String(screen?.height || 0))
  parts.push(String(screen?.colorDepth || 0))
  try {
    parts.push(String(new Date().getTimezoneOffset()))
  } catch { parts.push("0") }
  parts.push(String(navigator.hardwareConcurrency || 0))
  parts.push(String((navigator as Navigator & { deviceMemory?: number }).deviceMemory || 0))
  const str = parts.join("|")
  return `fp_${simpleHash(str)}`
}
