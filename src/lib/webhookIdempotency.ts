import crypto from "crypto"

const seen = new Map<string, number>()
const TTL_MS = 10 * 60 * 1000

function cleanup(now: number) {
  for (const [k, exp] of seen.entries()) {
    if (exp <= now) seen.delete(k)
  }
}

export function buildWebhookIdempotencyKey(path: string, rawBody: string, timestamp: string | null): string {
  const base = `${path}|${timestamp || ""}|${rawBody}`
  const digest = crypto.createHash("sha256").update(base).digest("hex")
  return `wh:${digest}`
}

/** Best-effort replay guard for duplicate deliveries in same runtime window. */
export function markWebhookEventSeen(key: string): boolean {
  const now = Date.now()
  cleanup(now)
  const exp = seen.get(key)
  if (exp && exp > now) return false
  seen.set(key, now + TTL_MS)
  return true
}
