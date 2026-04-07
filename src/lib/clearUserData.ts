/** Clears blocked-user cookies after successful unblock. */
export function clearBlockedCookies(): void {
  if (typeof document === "undefined") return
  try {
    ;["blocked", "blocked_username"].forEach((c) => {
      document.cookie = `${c}=; path=/; max-age=0`
    })
  } catch {}
}

/**
 * Clears all client-side user data when switching users or logging out.
 * Call before login to ensure no stale data from a previous user.
 */
export function clearAllUserData(): void {
  if (typeof window === "undefined") return
  try {
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k) continue
      if (
        k === "paid" ||
        k === "login_username" ||
        k.startsWith("iq_earners_")
      ) {
        toRemove.push(k)
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k))
    const cookiesToClear = ["uid", "paid", "username", "sid", "role", "hs", "blocked", "blocked_username"]
    cookiesToClear.forEach((c) => {
      document.cookie = `${c}=; path=/; max-age=0`
      document.cookie = `${c}=; path=/; domain=${window.location.hostname}; max-age=0`
    })
    try {
      sessionStorage.removeItem("login_username")
    } catch {}
  } catch {}
}
