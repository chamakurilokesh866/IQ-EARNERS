import { NextResponse } from "next/server"
import { rateLimit } from "@/lib/rateLimit"
import { validateCsrf } from "@/lib/csrf"
import { peekPostSignupEntry, randomOtp, updatePostSignupOtp } from "@/lib/postSignupOtp"
import { getSettings } from "@/lib/settings"
import { sendEmail } from "@/lib/email"

/** POST: Resend post-signup email OTP. Body: { sessionToken } */
export async function POST(req: Request) {
  const csrfOk = await validateCsrf(req)
  if (!csrfOk) return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 403 })
  const rl = await rateLimit(req, "createUsernameRequestOtp")
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    )
  }

  try {
    const body = await req.json().catch(() => ({}))
    const sessionToken = String(body?.sessionToken ?? "").trim()
    if (!sessionToken) return NextResponse.json({ ok: false, error: "Session required" }, { status: 400 })

    const pending = await peekPostSignupEntry(sessionToken)
    if (!pending) {
      return NextResponse.json({ ok: false, error: "Session expired. Start signup again from payment." }, { status: 400 })
    }

    const settings = await getSettings()
    const len: 4 | 6 = settings.createUsernameOtpLength === 6 ? 6 : 4
    const otp = randomOtp(len)
    const updated = await updatePostSignupOtp(sessionToken, otp, len)
    if (!updated) return NextResponse.json({ ok: false, error: "Could not refresh code" }, { status: 400 })

    const { getEmailTemplate } = await import("@/lib/emailTheme")
    const htmlTemplate = getEmailTemplate({
      title: "IQ Earners",
      subtitle: "New verification code",
      content: "Use this new code to confirm your email and finish signup.",
      highlightContent: otp,
      footerText: "This code expires in 5 minutes.",
      theme: "paper"
    })

    const sent = await sendEmail({
      to: pending.email,
      subject: "IQ Earners — new email verification code",
      html: htmlTemplate,
      text: `Your new verification code is: ${otp}. Expires in 5 minutes.`
    })

    if (!sent.ok) {
      return NextResponse.json({ ok: false, error: sent.error || "Failed to send email" }, { status: 500 })
    }

    return NextResponse.json({ ok: true, length: len })
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to resend" }, { status: 500 })
  }
}
