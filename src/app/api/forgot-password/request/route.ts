import { NextResponse } from "next/server"
import { getProfileByUsername, getProfileByEmail } from "@/lib/profiles"
import { rateLimit } from "@/lib/rateLimit"
import { validateUsername, storeForgotOtp, generateForgotOtp } from "@/lib/forgotPasswordOtp"
import { isBlocked } from "@/lib/blocked"
import { sendEmail } from "@/lib/email"
import { verifyTurnstile } from "@/lib/turnstile"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** POST: Request forgot-password OTP. Body: { email or username }. Returns { ok, usernameHint? }. */
export async function POST(req: Request) {
  const rl = await rateLimit(req, "forgotPasswordRequest")
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    )
  }
  try {
    const body = await req.json().catch(() => ({}))
    const turnstileToken = typeof body?.turnstileToken === "string" ? body.turnstileToken.trim() : ""
    const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "").split(",")[0] || null

    const turnstileResult = await verifyTurnstile(turnstileToken, ip)
    if (!turnstileResult.success) {
      return NextResponse.json({ ok: false, error: "Verification failed. Please try again." }, { status: 400 })
    }

    const rawIdentity = String(body?.email ?? body?.username ?? "").trim()
    if (!rawIdentity) return NextResponse.json({ ok: false, error: "Email or username is required" }, { status: 400 })

    const isEmail = EMAIL_REGEX.test(rawIdentity)
    const emailOrUsername = isEmail ? rawIdentity.toLowerCase() : rawIdentity
    const profile = isEmail
      ? await getProfileByEmail(emailOrUsername)
      : await getProfileByUsername(emailOrUsername)
    if (!profile) {
      return NextResponse.json({ ok: false, error: "No account found with this email or username." }, { status: 404 })
    }
    const username = profile.username
    if (!username) return NextResponse.json({ ok: false, error: "Account has no username." }, { status: 400 })
    if (!validateUsername(username)) return NextResponse.json({ ok: false, error: "Invalid account." }, { status: 400 })

    const blocked = await isBlocked(username)
    if (blocked) return NextResponse.json({ ok: false, error: "This account cannot reset password." }, { status: 403 })
    if (!profile.passwordHash) {
      return NextResponse.json({
        ok: false,
        error: "This account has no password set. Use the link sent after payment to create your account."
      }, { status: 400 })
    }
    const toEmail = typeof profile.email === "string" && profile.email.trim() ? profile.email.trim() : null
    if (!toEmail) return NextResponse.json({ ok: false, error: "No email on file for this account. Contact support." }, { status: 400 })

    const otp = generateForgotOtp()
    await storeForgotOtp(username, otp)

    const { getEmailTemplate } = await import("@/lib/emailTheme")
    const htmlTemplate = getEmailTemplate({
      title: "IQ Earners",
      subtitle: "Reset Your Password",
      content: "Use the secure code below to set a new password for your account. This code expires in 10 minutes.",
      highlightContent: otp,
      footerText: "If you didn't request a password reset, your account is still secure. No action is needed."
    })

    const sent = await sendEmail({
      to: toEmail,
      subject: "IQ Earners – Password reset code",
      html: htmlTemplate,
      text: `Your password reset code is: ${otp}. Enter this code to set a new password. Code expires in 10 minutes.`
    })

    if (!sent.ok) {
      return NextResponse.json(
        { ok: false, error: sent.error || "Could not send email. Check configuration or try again later." },
        { status: 500 }
      )
    }

    const mask = (e: string) => {
      const t = e.trim()
      const at = t.indexOf("@")
      if (at < 1) return "your email"
      const u = t.slice(0, at)
      const d = t.slice(at + 1)
      const head = u.slice(0, Math.min(2, u.length))
      return `${head}•••@${d}`
    }

    return NextResponse.json({
      ok: true,
      usernameHint: username,
      emailMasked: mask(toEmail)
    })
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to send code." }, { status: 500 })
  }
}
