import { NextResponse } from "next/server"
import crypto from "crypto"
import { cookieOptions } from "./cookieOptions"

const SESSION_TTL_MS = 5 * 60 * 1000 // 5 minutes
export const ADMIN_OTP_SESSION_COOKIE = "admin_otp_session"

function getSecret(): string {
  return (process.env.ADMIN_PASSWORD ?? process.env.PAYMENT_WEBHOOK_SECRET ?? "fallback-secret").trim()
}

export function createAdminSession(): string {
  const exp = Date.now() + SESSION_TTL_MS
  const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url")
  const sig = crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url")
  return `${payload}.${sig}`
}

export function verifyAdminSession(token: string): { valid: boolean; expired?: boolean } {
  if (!token || !token.includes(".")) return { valid: false }
  const [payload, sig] = token.split(".")
  if (!payload || !sig) return { valid: false }
  try {
    const expectedSig = crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url")
    const sigBuf = Buffer.from(sig)
    const expectedBuf = Buffer.from(expectedSig)
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return { valid: false }
    }
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString())
    if (typeof decoded.exp !== "number" || decoded.exp < Date.now()) {
      return { valid: false, expired: true }
    }
    return { valid: true }
  } catch {
    return { valid: false }
  }
}

export function setAdminSessionCookie(res: NextResponse, session: string): void {
  res.cookies.set(ADMIN_OTP_SESSION_COOKIE, session, cookieOptions({ maxAge: 300 }))
}
