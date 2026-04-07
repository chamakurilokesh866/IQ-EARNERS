import { NextResponse } from "next/server"
import { getSettings } from "@/lib/settings"
import { verifyUsernameToken } from "@/lib/usernameToken"
import { findPayment } from "@/lib/payments"
import { storeOtp, validateToken } from "@/lib/createUsernameOtp"
import { sendEmail } from "@/lib/email"
import { rateLimit } from "@/lib/rateLimit"
import crypto from "crypto"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmail(s: string): boolean {
  return typeof s === "string" && s.trim().length > 0 && EMAIL_REGEX.test(s.trim())
}

/** Cryptographically secure random OTP (no modulo bias). */
function randomOtp(length: 4 | 6): string {
  let out = ""
  for (let i = 0; i < length; i++) {
    out += crypto.randomInt(0, 10).toString()
  }
  return out
}

/** POST: Request OTP for create-username. Body: { createUsernameToken, email }. Sends OTP to email via Resend. Returns { ok, length } (OTP not in response). */
export async function POST(req: Request) {
  const rl = await rateLimit(req, "createUsernameRequestOtp")
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many OTP requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    )
  }
  try {
    const body = await req.json().catch(() => ({}))
    const token = String(body?.createUsernameToken ?? "").trim()
    const email = String(body?.email ?? "").trim()
    if (!token) return NextResponse.json({ ok: false, error: "Token required" }, { status: 400 })
    if (!isValidEmail(email)) return NextResponse.json({ ok: false, error: "Valid email is required" }, { status: 400 })
    if (!validateToken(token)) {
      return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 400 })
    }

    const payload = verifyUsernameToken(token)
    if (!payload) return NextResponse.json({ ok: false, error: "Invalid or expired token" }, { status: 403 })

    const payment = payload.p
      ? await findPayment({ paymentId: payload.p })
      : await findPayment({ orderId: payload.o })
    if (!payment || payment.status !== "success" || payment.profileId) {
      return NextResponse.json({ ok: false, error: "Payment not valid for username creation" }, { status: 403 })
    }

    const settings = await getSettings()
    const length: 4 | 6 = (settings.createUsernameOtpLength === 4 || settings.createUsernameOtpLength === 6)
      ? settings.createUsernameOtpLength
      : 4

    const otp = randomOtp(length)
    await storeOtp(token, otp, length)

    const { getEmailTemplate } = await import("@/lib/emailTheme")
    const htmlTemplate = getEmailTemplate({
      title: "IQ Earners",
      subtitle: "Identity Verification",
      content: "You're nearly there! Use the secure verification code below to complete your global username registration and secure your account.",
      highlightContent: otp,
      footerText: "This code expires in 5 minutes. If you didn't request this, please ignore this transmission.",
      theme: "paper"
    })

    const sent = await sendEmail({
      to: email,
      subject: "IQ Earners Verification Code",
      html: htmlTemplate,
      text: `Your verification code is: ${otp}. Enter this code to create your username. Code expires in 5 minutes.`
    })

    // When email fails (no Resend key, networker, etc.), return error to user so they know email failed
    if (!sent.ok) {
      return NextResponse.json({ ok: false, error: "Failed to send email. Check your connection or contact support." })
    }

    return NextResponse.json({ ok: true, length, emailSent: true })
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to generate OTP" }, { status: 500 })
  }
}
