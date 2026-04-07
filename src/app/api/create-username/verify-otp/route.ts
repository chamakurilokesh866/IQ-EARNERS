import { NextResponse } from "next/server"
import { verifyUsernameToken } from "@/lib/usernameToken"
import { verifyOtp, validateToken } from "@/lib/createUsernameOtp"
import { rateLimit } from "@/lib/rateLimit"

/** POST: Verify OTP. Body: { createUsernameToken, otp }. Returns { ok: true } if correct. */
export async function POST(req: Request) {
  const rl = await rateLimit(req, "createUsernameVerifyOtp")
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    )
  }
  try {
    const body = await req.json().catch(() => ({}))
    const token = String(body?.createUsernameToken ?? "").trim()
    const otp = String(body?.otp ?? "").trim()
    if (!token) return NextResponse.json({ ok: false, error: "Token required" }, { status: 400 })
    if (!otp) return NextResponse.json({ ok: false, error: "OTP required" }, { status: 400 })
    if (!validateToken(token)) {
      return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 400 })
    }
    const digitsOnly = otp.replace(/\D/g, "")
    if (digitsOnly.length !== 4 && digitsOnly.length !== 6) {
      return NextResponse.json({ ok: false, error: "Invalid or expired OTP" }, { status: 401 })
    }

    const payload = verifyUsernameToken(token)
    if (!payload) return NextResponse.json({ ok: false, error: "Invalid or expired token" }, { status: 403 })

    const valid = await verifyOtp(token, otp)
    if (!valid) {
      return NextResponse.json({ ok: false, error: "Invalid or expired OTP" }, { status: 401 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: "Verification failed" }, { status: 500 })
  }
}
