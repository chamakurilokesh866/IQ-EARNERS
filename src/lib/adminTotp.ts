import { verifySync } from "otplib"

/** Base32 secret for any standard TOTP app (Microsoft Authenticator, Google Authenticator, 1Password, etc.); spaces ignored. */
export function getAdminTotpSecret(): string {
  return (process.env.ADMIN_TOTP_SECRET ?? "").trim().replace(/\s/g, "")
}

export function isAdminTotpEnabled(): boolean {
  return getAdminTotpSecret().length > 0
}

/** Verify 6-digit TOTP; ±30s clock skew (one standard period). */
export function verifyAdminTotpToken(token: string, secret: string): boolean {
  const digits = token.replace(/\D/g, "")
  if (digits.length !== 6) return false
  try {
    const r = verifySync({ secret, token: digits, epochTolerance: 30 })
    return r.valid === true
  } catch {
    return false
  }
}
