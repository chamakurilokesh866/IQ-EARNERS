/**
 * Secure signed token for one-time username creation after payment.
 * Uses HMAC-SHA256. Works on Vercel and Supabase.
 */
import crypto from "crypto"

const TOKEN_SECRET = process.env.USERNAME_TOKEN_SECRET ?? process.env.TOKEN_SECRET ?? ""
const EXPIRY_MINUTES = 30

export type TokenPayload = { o: string; p?: string; exp: number }

function base64UrlEncode(str: string): string {
  return Buffer.from(str, "utf8").toString("base64url")
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, "base64url").toString("utf8")
}

export function signUsernameToken(orderId?: string, paymentId?: string): string | null {
  if (!TOKEN_SECRET || (!orderId && !paymentId)) return null
  const exp = Date.now() + EXPIRY_MINUTES * 60 * 1000
  const payload: TokenPayload = { o: orderId ?? "", p: paymentId, exp }
  const payloadStr = JSON.stringify(payload)
  const encoded = base64UrlEncode(payloadStr)
  const sig = crypto.createHmac("sha256", TOKEN_SECRET).update(payloadStr).digest("hex")
  return `${encoded}.${sig}`
}

export function verifyUsernameToken(token: string): TokenPayload | null {
  if (!TOKEN_SECRET || !token || typeof token !== "string") return null
  const parts = token.trim().split(".")
  if (parts.length !== 2) return null
  const [encoded, sig] = parts
  let payload: TokenPayload
  try {
    payload = JSON.parse(base64UrlDecode(encoded)) as TokenPayload
  } catch {
    return null
  }
  if (!payload || typeof payload.exp !== "number" || (!payload.o && !payload.p)) return null
  if (payload.exp < Date.now()) return null
  const payloadStr = JSON.stringify(payload)
  const expected = crypto.createHmac("sha256", TOKEN_SECRET).update(payloadStr).digest("hex")
  if (!crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) return null
  return payload
}
