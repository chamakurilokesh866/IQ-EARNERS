/**
 * HMAC-signed cookie proving the browser initiated a Cashfree order (session-bound verify-order).
 */
import crypto from "crypto"
import type { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { cookieOptions } from "@/lib/cookieOptions"
import { findPayment } from "@/lib/payments"

function decodeUsername(raw: string): string {
  try {
    return decodeURIComponent(raw.trim())
  } catch {
    return raw.trim()
  }
}

const COOKIE_NAME = "cf_order_prf"
const TTL_MS = 60 * 60 * 1000

export function getOrderProofSecret(): string {
  return (process.env.CASHFREE_ORDER_COOKIE_SECRET || process.env.USERNAME_TOKEN_SECRET || process.env.TOKEN_SECRET || "").trim()
}

export function orderProofConfigured(): boolean {
  return getOrderProofSecret().length > 0
}

export function setOrderProofCookieOnResponse(res: NextResponse, orderId: string): void {
  const secret = getOrderProofSecret()
  if (!secret || !orderId) return
  const exp = Date.now() + TTL_MS
  const payload = `${orderId}:${exp}`
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex")
  const value = Buffer.from(JSON.stringify({ o: orderId, e: exp, s: sig }), "utf8").toString("base64url")
  res.cookies.set(COOKIE_NAME, value, cookieOptions({ maxAge: Math.floor(TTL_MS / 1000), httpOnly: true, sameSite: "lax", path: "/" }))
}

export async function verifyOrderProofCookieMatches(orderId: string): Promise<boolean> {
  const secret = getOrderProofSecret()
  if (!secret) return false
  const store = await cookies()
  const raw = store.get(COOKIE_NAME)?.value
  if (!raw) return false
  try {
    const j = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as { o: string; e: number; s: string }
    if (j.o !== orderId) return false
    if (Date.now() > j.e) return false
    const payload = `${j.o}:${j.e}`
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex")
    const a = Buffer.from(j.s, "hex")
    const b = Buffer.from(expected, "hex")
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

/** Admin, HMAC cookie from create-order, or session matches pending payment (profile / username in meta). */
export async function isAuthorizedToVerifyOrder(orderId: string): Promise<boolean> {
  const store = await cookies()
  if (store.get("role")?.value === "admin") return true
  if (await verifyOrderProofCookieMatches(orderId)) return true

  const payment = await findPayment({ orderId })
  const uid = store.get("uid")?.value ?? ""
  const username = decodeUsername(store.get("username")?.value ?? "")

  if (payment) {
    if (uid && payment.profileId && payment.profileId === uid) return true
    const meta = (payment.meta ?? {}) as Record<string, unknown>
    const metaUser = String(meta.username ?? meta.name ?? meta.customerName ?? "").trim().toLowerCase()
    if (username && metaUser && metaUser === username.toLowerCase()) return true
  }

  return false
}
