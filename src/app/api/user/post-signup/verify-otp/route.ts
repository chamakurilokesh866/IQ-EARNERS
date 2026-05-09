import { NextResponse } from "next/server"
import { rateLimit } from "@/lib/rateLimit"
import { validateCsrf } from "@/lib/csrf"
import { verifyPostSignupOtp } from "@/lib/postSignupOtp"
import { getProfileByUid } from "@/lib/profiles"
import { sendEmail, getLoginUrl } from "@/lib/email"
import { PARENT_COMPANY_NAME } from "@/lib/seo"

/** POST: After payment-proof signup, verify email OTP. No session cookies — client redirects to login. */
export async function POST(req: Request) {
  const csrfOk = await validateCsrf(req)
  if (!csrfOk) return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 403 })
  const rl = await rateLimit(req, "api")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many attempts", retryAfter: rl.retryAfter }, { status: 429 })

  try {
    const body = await req.json().catch(() => ({}))
    const sessionToken = String(body?.sessionToken ?? "").trim()
    const otp = String(body?.otp ?? "").trim()
    if (!sessionToken || !otp) {
      return NextResponse.json({ ok: false, error: "Session and code are required" }, { status: 400 })
    }

    const result = await verifyPostSignupOtp(sessionToken, otp)
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: "Invalid or expired code" }, { status: 401 })
    }

    const profile = await getProfileByUid(result.uid)
    const username = profile?.username?.trim()
    if (!username) {
      return NextResponse.json({ ok: false, error: "Account not found" }, { status: 404 })
    }

    const loginUrl = getLoginUrl()
    const { getEmailTemplate } = await import("@/lib/emailTheme")
    const htmlTemplate = getEmailTemplate({
      title: "IQ Earners",
      subtitle: `Welcome, ${username}!`,
      content:
        "Your email is verified. Sign in with your username and the password you created to access quizzes, tournaments, and rewards.",
      highlightLabel: "Your login username",
      highlightContent: username,
      buttonLink: loginUrl,
      buttonText: "Open login",
      footerText: `IQ Earners · ${PARENT_COMPANY_NAME}`,
      theme: "celebration"
    })
    sendEmail({
      to: result.email,
      subject: `You're all set — sign in to IQ Earners, @${username}`,
      html: htmlTemplate,
      text: `Hi! Your email is verified.\n\nUsername: ${username}\nLog in: ${loginUrl}\n\n— IQ Earners · ${PARENT_COMPANY_NAME}`
    }).catch((e) => console.error("post-signup welcome email failed", e))

    return NextResponse.json({ ok: true, verified: true, username })
  } catch (e: unknown) {
    console.error("post-signup verify-otp", e)
    return NextResponse.json({ ok: false, error: "Verification failed" }, { status: 500 })
  }
}
