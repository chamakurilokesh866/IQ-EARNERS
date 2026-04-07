import { NextResponse } from "next/server"
import { getProfileByUsername, upsertProfile } from "@/lib/profiles"
import { hashPassword } from "@/lib/password"
import { rateLimit } from "@/lib/rateLimit"
import { verifyAndConsumeResetToken } from "@/lib/forgotPasswordOtp"

const PASSWORD_RULES = {
  minLength: 6,
  hasUpper: /[A-Z]/,
  hasNumber: /\d/,
  hasSpecial: /[._\-@!?#$%&*]/,
}

function validateNewPassword(password: string): { ok: boolean; error?: string } {
  if (typeof password !== "string" || password.length < PASSWORD_RULES.minLength) {
    return { ok: false, error: "Password must be at least 6 characters" }
  }
  if (!PASSWORD_RULES.hasUpper.test(password)) {
    return { ok: false, error: "Password must contain at least one capital letter" }
  }
  if (!PASSWORD_RULES.hasNumber.test(password)) {
    return { ok: false, error: "Password must contain at least one number" }
  }
  if (!PASSWORD_RULES.hasSpecial.test(password)) {
    return { ok: false, error: "Password must contain at least one special character (. _ - @ ! ? # $ % & *)" }
  }
  return { ok: true }
}

/** POST: Reset password with one-time token. Body: { resetToken, newPassword, confirmPassword }. */
export async function POST(req: Request) {
  const rl = await rateLimit(req, "forgotPasswordReset")
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    )
  }
  try {
    const body = await req.json().catch(() => ({}))
    const resetToken = String(body?.resetToken ?? "").trim()
    const newPassword = String(body?.newPassword ?? "").trim()
    const confirmPassword = String(body?.confirmPassword ?? "").trim()

    if (!resetToken) return NextResponse.json({ ok: false, error: "Reset session expired. Please start again." }, { status: 400 })
    if (!newPassword) return NextResponse.json({ ok: false, error: "New password is required" }, { status: 400 })
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ ok: false, error: "Passwords do not match" }, { status: 400 })
    }

    const validation = validateNewPassword(newPassword)
    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 })
    }

    const usernameLower = await verifyAndConsumeResetToken(resetToken)
    if (!usernameLower) {
      return NextResponse.json({ ok: false, error: "Reset session expired or invalid. Please request a new code." }, { status: 401 })
    }

    const profile = await getProfileByUsername(usernameLower)
    if (!profile) {
      return NextResponse.json({ ok: false, error: "Account not found." }, { status: 404 })
    }

    const newHash = hashPassword(newPassword)
    const updated = { ...profile, passwordHash: newHash }
    const ok = await upsertProfile(updated)
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Failed to update password." }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to reset password." }, { status: 500 })
  }
}
