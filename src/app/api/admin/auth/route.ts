import { NextResponse } from "next/server"
import { rateLimit } from "@/lib/rateLimit"
import { validateOrigin } from "@/lib/auth"
import crypto from "crypto"

export async function POST(req: Request) {
  // Rate limit brute-force attacks
  const rl = await rateLimit(req, "adminLogin")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many attempts", retryAfter: rl.retryAfter }, { status: 429 })

  // Origin validation
  const originCheck = validateOrigin(req)
  if (originCheck === false) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const password = String(body?.password ?? "").trim()
  const envPass = (process.env.ADMIN_PASSWORD ?? "").trim()
  if (!envPass) {
    return NextResponse.json({ ok: false, error: "ADMIN_PASSWORD not set" }, { status: 500 })
  }
  // Timing-safe comparison to prevent timing attacks
  const passBuffer = Buffer.from(password)
  const envBuffer = Buffer.from(envPass)
  const lengthMatch = passBuffer.length === envBuffer.length
  const safeTarget = lengthMatch ? envBuffer : passBuffer
  if (!lengthMatch || !crypto.timingSafeEqual(passBuffer, safeTarget)) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set("role", "admin", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    domain: process.env.NODE_ENV === "production" ? ".iqearners.online" : undefined,
    maxAge: 3600 * 12 // 12 hours session
  })
  return res
}
