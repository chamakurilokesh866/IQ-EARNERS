import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import crypto from "crypto"
import { rateLimit } from "@/lib/rateLimit"
import { cookieOptions, clearCookieOptions } from "@/lib/cookieOptions"

const SESSION_COOKIE = "admin_otp_session"
const LOCK_COOKIE = "admin_otp_lock"
const DEFAULT_OTP = process.env.NODE_ENV === "development" ? "0866" : ""
const LOCK_DURATION_MS = 3 * 60 * 1000
const MAX_ATTEMPTS = 5

function getSecret(): string {
  return (process.env.ADMIN_PASSWORD ?? process.env.PAYMENT_WEBHOOK_SECRET ?? "fallback-secret").trim()
}

function timingSafeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a)
    const bufB = Buffer.from(b)
    if (bufA.length !== bufB.length) return false
    return crypto.timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}

function validateSession(token: string): boolean {
  try {
    const [payloadB64, sig] = token.split(".")
    if (!payloadB64 || !sig) return false
    const expectedSig = crypto.createHmac("sha256", getSecret()).update(payloadB64).digest("base64url")
    if (!timingSafeCompare(sig, expectedSig)) return false
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"))
    return !!(payload?.exp && Date.now() <= payload.exp)
  } catch {
    return false
  }
}

function parseLockCookie(val: string | undefined): { lockedUntil: number; failedAttempts: number } {
  try {
    if (!val) return { lockedUntil: 0, failedAttempts: 0 }
    const [payloadB64, sig] = val.split(".")
    if (!payloadB64 || !sig) return { lockedUntil: 0, failedAttempts: 0 }
    const expectedSig = crypto.createHmac("sha256", getSecret()).update(payloadB64).digest("base64url")
    if (!timingSafeCompare(sig, expectedSig)) return { lockedUntil: 0, failedAttempts: 0 }
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"))
    return {
      lockedUntil: Number(payload?.lockedUntil) || 0,
      failedAttempts: Number(payload?.failedAttempts) || 0
    }
  } catch {
    return { lockedUntil: 0, failedAttempts: 0 }
  }
}

function createLockCookie(lockedUntil: number, failedAttempts: number): string {
  const payload = Buffer.from(JSON.stringify({ lockedUntil, failedAttempts })).toString("base64url")
  const sig = crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url")
  return `${payload}.${sig}`
}

function getExpectedOtp(): string {
  const otp = process.env.ADMIN_OTP ?? DEFAULT_OTP
  return String(otp).trim().slice(0, 4)
}

function clearAdminCookies(res: NextResponse) {
  res.cookies.set("role", "", clearCookieOptions())
  res.cookies.set(SESSION_COOKIE, "", clearCookieOptions())
  res.cookies.set(LOCK_COOKIE, "", clearCookieOptions())
}

export async function POST(req: Request) {
  const rl = await rateLimit(req, "adminLogin")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many attempts", retryAfter: rl.retryAfter }, { status: 429 })
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value
  if (!sessionCookie) {
    return NextResponse.json({ ok: false, error: "Session expired. Please log in with password again." }, { status: 401 })
  }
  if (!validateSession(sessionCookie)) {
    const res = NextResponse.json({ ok: false, error: "Session expired. Please log in with password again." }, { status: 401 })
    clearAdminCookies(res)
    return res
  }

  const body = await req.json().catch(() => ({}))
  const code = String(body?.code ?? "")
    .trim()
    .replace(/\D/g, "")
    .slice(0, 4)
  if (code.length !== 4) {
    return NextResponse.json({ ok: false, error: "Enter 4 digits" }, { status: 400 })
  }

  const now = Date.now()
  const lockCookie = cookieStore.get(LOCK_COOKIE)?.value
  const lock = parseLockCookie(lockCookie)
  if (now < lock.lockedUntil) {
    const res = NextResponse.json(
      { ok: false, error: "Too many failed attempts", locked: true, lockedUntil: lock.lockedUntil },
      { status: 423 }
    )
    clearAdminCookies(res)
    return res
  }

  const expected = getExpectedOtp()
  if (code === expected) {
    const slug = process.env.ADMIN_DASHBOARD_SLUG?.trim() || "admin"
    const redirectTo = `/a/${slug}`
    const res = NextResponse.json({ ok: true, redirectTo })
    res.cookies.set(SESSION_COOKIE, "", clearCookieOptions())
    res.cookies.set(LOCK_COOKIE, "", clearCookieOptions())
    res.cookies.set("role", "admin", cookieOptions({ maxAge: 60 * 60 * 24 }))
    return res
  }

  const newAttempts = lock.failedAttempts + 1
  const newLockedUntil = newAttempts >= MAX_ATTEMPTS ? now + LOCK_DURATION_MS : 0
  const res = NextResponse.json(
    {
      ok: false,
      error: newAttempts >= MAX_ATTEMPTS
        ? "Too many failed attempts. Admin dashboard locked for 3 minutes."
        : "Invalid code",
      remainingAttempts: Math.max(0, MAX_ATTEMPTS - newAttempts),
      locked: newAttempts >= MAX_ATTEMPTS,
      lockedUntil: newLockedUntil
    },
    { status: 401 }
  )
  clearAdminCookies(res)
  res.cookies.set(LOCK_COOKIE, createLockCookie(newLockedUntil, newAttempts >= MAX_ATTEMPTS ? 0 : newAttempts), cookieOptions({ maxAge: 300 }))
  return res
}
