/**
 * Shared Cashfree PG webhook HMAC verification + replay protection.
 * @see https://www.cashfree.com/docs/api-reference/payments/webhooks
 */
import crypto from "crypto"

export function verifyCashfreeWebhookSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  secretKey: string
): boolean {
  if (!signature || !timestamp || !secretKey) return false
  try {
    const signedPayload = timestamp + rawBody
    const expected = crypto.createHmac("sha256", secretKey).update(signedPayload).digest("base64")
    const sigBuf = Buffer.from(signature)
    const expBuf = Buffer.from(expected)
    if (sigBuf.length !== expBuf.length) return false
    return crypto.timingSafeEqual(sigBuf, expBuf)
  } catch {
    return false
  }
}

/** Cashfree may send seconds or ms; reject replays outside ±maxSkewSec (default 5m). */
export function isCashfreeWebhookTimestampFresh(ts: string | null, maxSkewSec = 300): boolean {
  if (!ts?.trim()) return false
  let sec = parseInt(ts.trim(), 10)
  if (!Number.isFinite(sec)) return false
  if (sec > 1e12) sec = Math.floor(sec / 1000)
  const now = Math.floor(Date.now() / 1000)
  return Math.abs(now - sec) <= maxSkewSec
}
