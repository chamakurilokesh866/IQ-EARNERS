const SID_COOKIE = "sid"
/** Client-readable cookie set on login so hasAnySession works with httpOnly auth cookies */
const HAS_SESSION_COOKIE = "hs"
const PROTECTED_PREFIXES = ["/home", "/tournaments", "/daily-quiz", "/leaderboard", "/prizes", "/user", "/dashboard", "/more"]
const PUBLIC_PATHS = ["/more/join", "/more/terms", "/more/privacy", "/more/rules", "/more/grievance", "/more/refund", "/more/disclaimer", "/more/cookie-policy", "/more/admin-login", "/intro", "/blocked", "/unblock"]

function isProtectedPath(path: string): boolean {
  const p = path.split("?")[0]
  if (PUBLIC_PATHS.some((pub) => p === pub || p.startsWith(pub + "/"))) return false
  return PROTECTED_PREFIXES.some((pref) => p === pref || p.startsWith(pref + "/"))
}

/** Login sets `hs=1` (non-httpOnly). Use when `sid` is httpOnly so JS can detect a user session. */
export function hasHydratedSessionFlag(): boolean {
  if (typeof document === "undefined") return false
  return /(?:^|; )hs=1(?:;|$)/.test(document.cookie)
}

function hasAnySession(): boolean {
  if (typeof document === "undefined") return false
  // Auth cookies (uid, username, sid) are httpOnly, so document.cookie cannot read them.
  // We set "hs=1" (non-httpOnly) on login so the client can detect session presence.
  if (document.cookie.match(new RegExp(`(?:^|; )${HAS_SESSION_COOKIE}=1(?:;|$)`))) return true
  if (getSid()) return true
  if (document.cookie.match(/uid=[^;]/)) return true
  if (document.cookie.match(/username=[^;]/)) return true
  return false
}

/** True when on a protected path with no session — redirect to intro. */
export function shouldRedirectToIntro(path: string): boolean {
  return isProtectedPath(path) && !hasAnySession()
}

export function getSid(): string {
  if (typeof document === "undefined") return ""
  const m = document.cookie.match(new RegExp("(?:^|; )" + SID_COOKIE + "=([^;]*)"))
  return m ? decodeURIComponent(m[1]) : ""
}

export function withSid(path: string): string {
  if (!path.startsWith("/")) return path
  if (!isProtectedPath(path)) return path
  const sid = getSid()
  if (!sid) return path
  const [base, qs] = path.split("?")
  const params = new URLSearchParams(qs || "")
  params.set("sid", sid)
  return base + "?" + params.toString()
}
