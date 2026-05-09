import { NextResponse } from "next/server"
import { rateLimitByAccount } from "@/lib/rateLimit"
import { createAdminSession, setAdminSessionCookie } from "@/lib/adminSession"
import { verifyTurnstile } from "@/lib/turnstile"
import { audit } from "@/lib/audit"
import { isAdminTotpEnabled } from "@/lib/adminTotp"

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const username = String(body?.username ?? "").trim()
  const rl = await rateLimitByAccount(req, "adminLogin", username || "admin")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many attempts", retryAfter: rl.retryAfter }, { status: 429 })
  const password = String(body?.password ?? "").trim()
  const turnstileToken = typeof body?.turnstileToken === "string" ? body.turnstileToken.trim() : ""
  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "").split(",")[0] || null

  const turnstileResult = await verifyTurnstile(turnstileToken, ip)
  if (!turnstileResult.success) {
    return NextResponse.json({ ok: false, error: "Verification failed. Please try again." }, { status: 400 })
  }

  const adminUsername = (process.env.ADMIN_USERNAME ?? "").trim()
  const envPass = (process.env.ADMIN_PASSWORD ?? "").trim()

  if (!adminUsername || !envPass) {
    return NextResponse.json({ ok: false, error: "Admin not configured" }, { status: 500 })
  }
  if (!isAdminTotpEnabled()) {
    return NextResponse.json({ ok: false, error: "ADMIN_TOTP_SECRET not configured" }, { status: 500 })
  }
  if (process.env.NODE_ENV === "production" && envPass === "your-strong-password") {
    return NextResponse.json({ ok: false, error: "Invalid admin password configuration" }, { status: 500 })
  }

  if (username.toLowerCase() !== adminUsername.toLowerCase()) {
    void audit(req, "admin_login_failed", { reason: "wrong_username", attempted: username })
    void import("@/lib/adminLoginHistory").then(({ saveAdminLogin }) =>
      saveAdminLogin({ ip: ip || "unknown", userAgent: req.headers.get("user-agent") || "unknown", username, success: false, reason: "wrong_username" })
    ).catch(() => {})
    return NextResponse.json({ ok: false, error: "Invalid username or password" }, { status: 401 })
  }
  if (password !== envPass) {
    void audit(req, "admin_login_failed", { reason: "wrong_password", attempted: username })
    void import("@/lib/adminLoginHistory").then(({ saveAdminLogin }) =>
      saveAdminLogin({ ip: ip || "unknown", userAgent: req.headers.get("user-agent") || "unknown", username, success: false, reason: "wrong_password" })
    ).catch(() => {})
    void import("@/lib/push").then(({ sendPushNotification }) =>
      sendPushNotification({
        title: "⚠️ Failed Admin Login Attempt",
        body: `IP: ${ip || "unknown"}\nUsername tried: ${username}`,
        url: "/more/admin-dashboard?tab=Reports"
      })
    ).catch(() => {})
    return NextResponse.json({ ok: false, error: "Invalid username or password" }, { status: 401 })
  }

  const userAgent = req.headers.get("user-agent") || "unknown"
  void audit(req, "admin_login_success", { username, ip, userAgent })
  void import("@/lib/adminLoginHistory").then(({ saveAdminLogin }) =>
    saveAdminLogin({ ip: ip || "unknown", userAgent, username })
  ).catch(() => {})

  const signed = createAdminSession()
  const res = NextResponse.json({
    ok: true,
    step: "otp",
    otpDigits: 6,
    otpMode: "totp"
  })
  setAdminSessionCookie(res, signed)
  return res
}
