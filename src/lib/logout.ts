/**
 * Centralized logout: clears session, opens intro in new tab, replaces current (no back history).
 */
import { clearAllUserData } from "./clearUserData"
import { resetBootstrapBust } from "./bootstrapFetch"

const INTRO_URL = "/intro"
const INTRO_AFTER_LOGOUT = "/intro?from=logout"

/**
 * Clears server + client session when bootstrap reports `sessionInvalid`, without opening tabs.
 * Avoids `location.replace` loops on `/intro` when cookies failed to clear previously.
 */
export async function recoverFromInvalidSession(): Promise<void> {
  try {
    resetBootstrapBust()
    await fetch("/api/user/logout", { method: "POST", credentials: "include" })
  } catch { }
  try {
    clearAllUserData()
  } catch { }
  if (typeof window === "undefined") return
  if (!window.location.pathname.startsWith("/intro")) return
  try {
    const u = new URL(window.location.href)
    u.searchParams.delete("from")
    const q = u.searchParams.toString()
    window.history.replaceState(null, "", u.pathname + (q ? `?${q}` : ""))
  } catch { }
}

export async function performLogout(): Promise<void> {
  try {
    resetBootstrapBust()
    await fetch("/api/user/logout", { method: "POST", credentials: "include" })
  } catch { }
  try {
    clearAllUserData()
  } catch { }
  if (typeof window === "undefined") return
  const w = window.open(INTRO_AFTER_LOGOUT, "_blank", "noopener,noreferrer")
  if (w) w.focus()

  // Custom event to trigger transition in layout
  if (typeof window !== "undefined") {
    (window as any).transitionLogout = true
  }

  window.location.replace(INTRO_AFTER_LOGOUT)
}

/**
 * Called on internal errors: logout, close tab, open intro in new tab.
 */
export function performErrorLogout(): void {
  performLogout().then(() => {
    try {
      window.close()
    } catch { }
  })
}
