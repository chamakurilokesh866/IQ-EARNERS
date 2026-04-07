import { cookies } from "next/headers"

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
