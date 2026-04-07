/**
 * Secure cookie options for production.
 */

import type { NextResponse } from "next/server"

const isProd = process.env.NODE_ENV === "production"

export function cookieOptions(overrides: {
  path?: string
  maxAge?: number
  httpOnly?: boolean
  sameSite?: "lax" | "strict" | "none"
  secure?: boolean
} = {}) {
  return {
    path: overrides.path ?? "/",
    maxAge: overrides.maxAge,
    httpOnly: overrides.httpOnly ?? true,
    sameSite: (overrides.sameSite ?? "lax") as "lax" | "strict" | "none",
    secure: isProd,
    domain: isProd ? ".iqearners.online" : undefined,
    ...overrides,
  }
}

/** Max-age 0 — must mirror `cookieOptions()` domain/path/secure or browsers keep the session cookies. */
export function clearCookieOptions(path = "/") {
  return {
    path,
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    ...(isProd ? { domain: ".iqearners.online" as const } : {}),
  }
}

/**
 * Emit Set-Cookie clears for both host-only and `.domain` (prod), so stale cookies never survive logout.
 */
export function clearAuthCookiesOnResponse(res: NextResponse) {
  const namesHttpOnly = ["uid", "sid", "username", "paid", "role"] as const
  const base = { path: "/", maxAge: 0, sameSite: "lax" as const, secure: isProd }
  for (const name of namesHttpOnly) {
    res.cookies.set(name, "", { ...base, httpOnly: true })
    if (isProd) {
      res.cookies.set(name, "", { ...base, httpOnly: true, domain: ".iqearners.online" })
    }
  }
  res.cookies.set("hs", "", { ...base, httpOnly: false })
  if (isProd) {
    res.cookies.set("hs", "", { ...base, httpOnly: false, domain: ".iqearners.online" })
  }
}
