import { NextResponse } from "next/server"
import { getProfileByEmail, getProfileByUsername } from "@/lib/profiles"
import { rateLimit } from "@/lib/rateLimit"
import { validateUsername, verifyForgotOtp, consumeForgotOtp, createResetToken, normalizeForgotOtpInput } from "@/lib/forgotPasswordOtp"
import { isBlocked } from "@/lib/blocked"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** POST: Verify forgot-password OTP. Body: { email or username, otp }. Returns { ok, resetToken }. */
export async function POST(req: Request) {
  const rl = await rateLimit(req, "forgotPasswordVerify")
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    )
  }
  try {
    const body = await req.json().catch(() => ({}))
    const rawIdentity = String(body?.email ?? body?.username ?? "").trim()
    const otpRaw = String(body?.otp ?? "").trim()
    const otp = normalizeForgotOtpInput(otpRaw)
    if (!rawIdentity) return NextResponse.json({ ok: false, error: "Email or username is required" }, { status: 400 })
    if (!otp) return NextResponse.json({ ok: false, error: "Verification code is required" }, { status: 400 })

    const isEmail = EMAIL_REGEX.test(rawIdentity)
    const emailOrUsername = isEmail ? rawIdentity.toLowerCase() : rawIdentity
    const profile = isEmail ? await getProfileByEmail(emailOrUsername) : await getProfileByUsername(emailOrUsername)
    if (!profile) return NextResponse.json({ ok: false, error: "Account not found." }, { status: 404 })
    const username = profile.username
    if (!username || !validateUsername(username)) return NextResponse.json({ ok: false, error: "Invalid account." }, { status: 400 })

    const blocked = await isBlocked(username)
    if (blocked) return NextResponse.json({ ok: false, error: "This account cannot reset password." }, { status: 403 })

    const valid = await verifyForgotOtp(username, otp)
    if (!valid) return NextResponse.json({ ok: false, error: "Invalid or expired code. Request a new one." }, { status: 401 })

    await consumeForgotOtp(username)
    const resetToken = createResetToken(username)
    return NextResponse.json({ ok: true, resetToken })
  } catch {
    return NextResponse.json({ ok: false, error: "Verification failed." }, { status: 500 })
  }
}
