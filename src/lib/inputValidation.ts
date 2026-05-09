const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(String(value ?? "").trim().toLowerCase())
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(String(value ?? "").trim())
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}

export function isValidUrlOrPath(value: string): boolean {
  const v = String(value ?? "").trim()
  if (!v) return true
  if (v.startsWith("/")) return true
  return isValidHttpUrl(v)
}

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}
