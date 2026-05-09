import { NextResponse } from "next/server"
import { rateLimit } from "@/lib/rateLimit"
import { validateOrigin } from "@/lib/auth"
import crypto from "crypto"
import { cookieOptions } from "@/lib/cookieOptions"
import { getAdminRoleFromEnv } from "@/lib/auth"
import { isAdminTotpEnabled, getAdminTotpSecret, verifyAdminTotpToken } from "@/lib/adminTotp"

export async function POST(req: Request) {
  // Rate limit brute-force attacks
  const rl = await rateLimit(req, "adminLogin")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many attempts", retryAfter: rl.retryAfter }, { status: 429 })

  // Origin validation
  const originCheck = validateOrigin(req)
  if (originCheck === false) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const username = String(body?.username ?? "").trim()
  const password = String(body?.password ?? "").trim()
  const code = String(body?.code ?? "").trim().replace(/\D/g, "").slice(0, 6)
  const envUser = (process.env.ADMIN_USERNAME ?? "").trim()
  const envPass = (process.env.ADMIN_PASSWORD ?? "").trim()
  if (!envUser || !envPass) {
    return NextResponse.json({ ok: false, error: "Admin is not configured" }, { status: 500 })
  }
  if (!isAdminTotpEnabled()) {
    return NextResponse.json({ ok: false, error: "ADMIN_TOTP_SECRET not configured" }, { status: 500 })
  }
  // Timing-safe comparison to prevent timing attacks
  const passBuffer = Buffer.from(password)
  const envBuffer = Buffer.from(envPass)
  const lengthMatch = passBuffer.length === envBuffer.length
  const safeTarget = lengthMatch ? envBuffer : passBuffer
  const userOk = username.toLowerCase() === envUser.toLowerCase()
  if (!userOk || !lengthMatch || !crypto.timingSafeEqual(passBuffer, safeTarget)) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  if (code.length !== 6) {
    return NextResponse.json({ ok: false, error: "Enter 6-digit authenticator code" }, { status: 400 })
  }
  const secret = getAdminTotpSecret()
  if (!verifyAdminTotpToken(code, secret)) {
    return NextResponse.json({ ok: false, error: "Invalid authenticator code" }, { status: 401 })
  }

  const slug = process.env.ADMIN_DASHBOARD_SLUG?.trim() || "admin"
  const res = NextResponse.json({ ok: true, redirectTo: `/a/${slug}` })
  res.cookies.set("role", "admin", cookieOptions({ maxAge: 60 * 60 * 24 }))
  res.cookies.set("admin_role", getAdminRoleFromEnv(), cookieOptions({ maxAge: 60 * 60 * 24 }))
  res.cookies.set("admin_auth_at", String(Date.now()), cookieOptions({ maxAge: 60 * 60 * 24 }))
  return res
}
