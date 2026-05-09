import crypto from "crypto"
import { getClientIp } from "@/lib/inspectSecurity"

export function getRequestId(req: Request): string {
  const h = req.headers.get("x-request-id") || req.headers.get("x-vercel-id") || req.headers.get("cf-ray")
  if (h) return h.slice(0, 120)
  return crypto.randomUUID()
}

/** Lightweight structured log for API forensics (server-only). */
export function logApiSecurity(
  req: Request,
  level: "info" | "warn",
  message: string,
  extra?: Record<string, unknown>
): void {
  if (process.env.NODE_ENV === "test") return
  const ip = getClientIp(req)
  const rid = getRequestId(req)
  const url = (() => {
    try {
      return new URL(req.url).pathname
    } catch {
      return ""
    }
  })()
  const line = JSON.stringify({
    t: new Date().toISOString(),
    rid,
    level,
    msg: message,
    path: url,
    ip,
    ...extra
  })
  if (level === "warn") console.warn("[security]", line)
  else console.info("[security]", line)
}
