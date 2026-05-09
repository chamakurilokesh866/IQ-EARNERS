import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { cookieOptions } from "./cookieOptions"

/**
 * Validates that the request Origin matches the request host (reduces CSRF risk).
 * Returns null if no Origin/Referer (e.g. same-origin fetch), or true if valid, false if suspicious.
 */
export function validateOrigin(req: Request): boolean | null {
  const origin = req.headers.get("origin")
  const referer = req.headers.get("referer")
  if (!origin && !referer) return null
  try {
    const url = new URL(req.url)
    const host = url.origin
    if (origin && origin !== host) return false
    if (referer) {
      const ref = new URL(referer)
      if (ref.origin !== host) return false
    }
  } catch {
    return false
  }
  return true
}

export async function requireAdmin() {
  const store = await cookies()
  if (store.get("role")?.value !== "admin") {
    return { ok: false as const, error: "Forbidden", status: 403 }
  }
  return { ok: true as const }
}

export type AdminPermission =
  | "payment.approve"
  | "payment.deny"
  | "payout.execute"
  | "payout.reject"
  | "security.view"

const ADMIN_ROLE_COOKIE = "admin_role"
const ADMIN_AUTH_AT_COOKIE = "admin_auth_at"
const ROLE_PERMS: Record<string, AdminPermission[]> = {
  super: ["payment.approve", "payment.deny", "payout.execute", "payout.reject", "security.view"],
  finance: ["payment.approve", "payment.deny", "payout.execute", "payout.reject", "security.view"],
  ops: ["payment.approve", "payment.deny", "security.view"],
  support: ["security.view"],
  content: [],
}

export function getAdminRoleFromEnv(): string {
  return (process.env.ADMIN_ACCESS_ROLE ?? "super").trim().toLowerCase()
}

export async function requireAdminPermission(permission: AdminPermission) {
  const base = await requireAdmin()
  if (!base.ok) return base
  const store = await cookies()
  const role = (store.get(ADMIN_ROLE_COOKIE)?.value || "super").toLowerCase()
  const perms = ROLE_PERMS[role] ?? ROLE_PERMS.super
  if (!perms.includes(permission)) {
    return { ok: false as const, error: "Insufficient permission", status: 403 }
  }
  return { ok: true as const, role }
}

/**
 * How long after login/last refresh `admin_auth_at` remains valid for sensitive admin actions.
 * Must stay in sync with login cookie maxAge (24h) so dashboard use does not fail mid-session.
 */
export const ADMIN_SENSITIVE_MAX_AGE_SEC = 24 * 60 * 60

export async function requireRecentAdminAuth(maxAgeSec = ADMIN_SENSITIVE_MAX_AGE_SEC) {
  const base = await requireAdmin()
  if (!base.ok) return base
  const store = await cookies()
  const raw = store.get(ADMIN_AUTH_AT_COOKIE)?.value ?? ""
  const ts = parseInt(raw, 10)
  if (!Number.isFinite(ts)) {
    return { ok: false as const, error: "Recent authentication required", status: 401 }
  }
  if (Date.now() - ts > maxAgeSec * 1000) {
    return { ok: false as const, error: "Session too old for this action", status: 401 }
  }
  return { ok: true as const }
}

/** Slide `admin_auth_at` on successful mutating admin responses so long sessions stay valid. */
export function withRefreshedAdminAuth(res: NextResponse): NextResponse {
  res.cookies.set(ADMIN_AUTH_AT_COOKIE, String(Date.now()), cookieOptions({ maxAge: 60 * 60 * 24 }))
  return res
}

export async function getUid() {
  const store = await cookies()
  return store.get("uid")?.value ?? ""
}

export async function getRole() {
  const store = await cookies()
  return store.get("role")?.value ?? ""
}

/**
 * Validates that the current user is authenticated and has a successful payment.
 * Returns user info if valid, or an error object with status code.
 * Use this for API routes that should only be accessible to paid users.
 */
export async function requirePaidUser(): Promise<
  | { ok: true; uid: string; username: string }
  | { ok: false; error: string; status: number }
> {
  const store = await cookies()
  const uid = store.get("uid")?.value ?? ""
  const paid = store.get("paid")?.value === "1"
  const username = (() => {
    try { return decodeURIComponent(store.get("username")?.value ?? "") } catch { return "" }
  })()
  const role = store.get("role")?.value ?? ""

  if (role === "admin") return { ok: true, uid: uid || "admin", username: username || "admin" }

  if (!uid || !paid || !username) {
    return { ok: false, error: "Authentication required. Please log in.", status: 401 }
  }

  try {
    const { getProfileByUid } = await import("./profiles")
    const profile = await getProfileByUid(uid)
    if (!profile) {
      return { ok: false, error: "User not found", status: 404 }
    }
    if (!profile.paid && !profile.memberId) {
      const { getPayments } = await import("./payments")
      const payments = await getPayments()
      const hasPaid = payments.some(
        (p) => p.status === "success" && (p.profileId === uid ||
          String(p.meta?.username ?? p.meta?.name ?? "").toLowerCase() === username.toLowerCase())
      )
      if (!hasPaid) {
        return { ok: false, error: "Payment required", status: 403 }
      }
    }
  } catch {
    return { ok: false, error: "Unable to verify account. Try again.", status: 503 }
  }

  return { ok: true, uid, username }
}
