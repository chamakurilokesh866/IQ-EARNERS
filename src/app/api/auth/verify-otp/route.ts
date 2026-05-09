import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import crypto from "crypto"
import { rateLimitByAccount } from "@/lib/rateLimit"
import { cookieOptions, clearCookieOptions } from "@/lib/cookieOptions"
import { getAdminTotpSecret, isAdminTotpEnabled, verifyAdminTotpToken } from "@/lib/adminTotp"
import { getAdminRoleFromEnv } from "@/lib/auth"

const SESSION_COOKIE = "admin_otp_session"
const LOCK_COOKIE = "admin_otp_lock"
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

function clearAdminCookies(res: NextResponse) {
  res.cookies.set("role", "", clearCookieOptions())
  res.cookies.set("admin_role", "", clearCookieOptions())
  res.cookies.set("admin_auth_at", "", clearCookieOptions())
  res.cookies.set(SESSION_COOKIE, "", clearCookieOptions())
  res.cookies.set(LOCK_COOKIE, "", clearCookieOptions())
}

export async function POST(req: Request) {
  const rl = await rateLimitByAccount(req, "adminLogin", "admin-otp")
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
  const raw = String(body?.code ?? "")
    .trim()
    .replace(/\D/g, "")
  if (!isAdminTotpEnabled()) {
    return NextResponse.json({ ok: false, error: "ADMIN_TOTP_SECRET not configured" }, { status: 500 })
  }
  const code = raw.slice(0, 6)
  if (code.length !== 6) {
    return NextResponse.json({ ok: false, error: "Enter 6-digit authenticator code" }, { status: 400 })
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

  const secret = getAdminTotpSecret()
  if (verifyAdminTotpToken(code, secret)) {
    const slug = process.env.ADMIN_DASHBOARD_SLUG?.trim() || "admin"
    const redirectTo = `/a/${slug}`
    const res = NextResponse.json({ ok: true, redirectTo })
    res.cookies.set(SESSION_COOKIE, "", clearCookieOptions())
    res.cookies.set(LOCK_COOKIE, "", clearCookieOptions())
    res.cookies.set("role", "admin", cookieOptions({ maxAge: 60 * 60 * 24 }))
    res.cookies.set("admin_role", getAdminRoleFromEnv(), cookieOptions({ maxAge: 60 * 60 * 24 }))
    res.cookies.set("admin_auth_at", String(Date.now()), cookieOptions({ maxAge: 60 * 60 * 24 }))
    return res
  }

  const newAttemptsFail = lock.failedAttempts + 1
  const newLockedUntilFail = newAttemptsFail >= MAX_ATTEMPTS ? now + LOCK_DURATION_MS : 0
  const resFail = NextResponse.json(
    {
      ok: false,
      error: newAttemptsFail >= MAX_ATTEMPTS
        ? "Too many failed attempts. Admin dashboard locked for 3 minutes."
        : "Invalid authenticator code",
      remainingAttempts: Math.max(0, MAX_ATTEMPTS - newAttemptsFail),
      locked: newAttemptsFail >= MAX_ATTEMPTS,
      lockedUntil: newLockedUntilFail
    },
    { status: 401 }
  )
  clearAdminCookies(resFail)
  resFail.cookies.set(LOCK_COOKIE, createLockCookie(newLockedUntilFail, newAttemptsFail >= MAX_ATTEMPTS ? 0 : newAttemptsFail), cookieOptions({ maxAge: 300 }))
  return resFail
}
