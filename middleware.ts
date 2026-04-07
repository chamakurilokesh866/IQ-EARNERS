import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import crypto from "crypto"
import { cookieOptions } from "@/lib/cookieOptions"

const SID_COOKIE = "sid"
const SID_MAX_AGE = 60 * 60 * 24 * 7

function genSid(): string {
  return crypto.randomBytes(12).toString("hex")
}

/** Match login API cookie flags so we never shadow the session id with a host-only cookie. */
function setSidCookie(res: NextResponse, value: string) {
  const o = cookieOptions({ maxAge: SID_MAX_AGE })
  res.cookies.set(SID_COOKIE, value, {
    path: o.path ?? "/",
    maxAge: o.maxAge,
    sameSite: (o.sameSite ?? "lax") as "lax" | "strict" | "none",
    secure: Boolean(o.secure),
    httpOnly: o.httpOnly !== false,
    ...(o.domain ? { domain: o.domain } : {})
  })
}

function getSidFromReq(req: NextRequest): string {
  return req.cookies.get(SID_COOKIE)?.value ?? ""
}

function isProtectedPath(pathname: string): boolean {
  const pub = ["/intro", "/more/admin-login", "/more/join", "/more/terms", "/more/privacy"]
  if (pub.some((p) => pathname === p || pathname.startsWith(p + "/"))) return false
  const prot = ["/home", "/tournaments", "/daily-quiz", "/leaderboard", "/prizes", "/user", "/dashboard", "/more"]
  return prot.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

function getSecurityHeaders(): [string, string][] {
  const isProd = process.env.NODE_ENV === "production"
  const base: [string, string][] = [
    ["X-Content-Type-Options", "nosniff"],
    ["Referrer-Policy", "strict-origin-when-cross-origin"],
    ["Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()"],
    ["X-DNS-Prefetch-Control", "off"],
    ["Cross-Origin-Opener-Policy", "same-origin"],
    ["Cross-Origin-Resource-Policy", "same-origin"],
  ]
  if (isProd) {
    base.unshift(
      ["X-Frame-Options", "DENY"],
      ["Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload"],
      ["Content-Security-Policy",
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://challenges.cloudflare.com https://sdk.cashfree.com https://*.googlesyndication.com https://*.google.com https://*.doubleclick.net https://*.adtrafficquality.google https://*.google-analytics.com https://*.google; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com data:; " +
        "img-src 'self' data: blob: https:; " +
        "media-src 'self' https: http: blob:; " +
        "connect-src 'self' https: wss: https://api.cashfree.com https://challenges.cloudflare.com https://*.supabase.co https://integrate.api.nvidia.com https://*.adtrafficquality.google; " +
        "frame-src 'self' https://challenges.cloudflare.com https://sdk.cashfree.com https://*.google.com https://*.doubleclick.net https://*.adtrafficquality.google https://*.google; " +
        "worker-src 'self' blob:; " +
        "child-src 'self' https://challenges.cloudflare.com; " +
        "object-src 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self' https://api.cashfree.com https://sandbox.api.cashfree.com; " +
        "upgrade-insecure-requests"
      ],
    )
  }
  return base
}

const PUBLIC_PATHS = ["/intro", "/blocked", "/unblock", "/more/admin-login", "/more/join", "/more/terms", "/more/privacy", "/payment/callback", "/create-username", "/creator-join", "/creator"]

const USER_APP_PATHS = ["/home", "/tournaments", "/daily-quiz", "/leaderboard", "/prizes", "/dashboard", "/user", "/mock-exam", "/contact"]
const USER_APP_PREFIX = "/more"
const USER_SEGMENTS = ["home", "tournaments", "daily-quiz", "leaderboard", "prizes", "more", "dashboard", "mock-exam", "contact"]

function decodeCookieUsername(raw: string): string {
  try {
    return decodeURIComponent(raw.trim())
  } catch {
    return raw.trim()
  }
}

export async function middleware(req: NextRequest) {
  try {
    const { pathname } = req.nextUrl
    if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.startsWith("/payment") || pathname === "/create-username") {
      const res = NextResponse.next()
      getSecurityHeaders().forEach(([k, v]) => res.headers.set(k, v))
      return res
    }
    if (pathname === "/maintenance") {
      const res = NextResponse.next()
      getSecurityHeaders().forEach(([k, v]) => res.headers.set(k, v))
      return res
    }
    if (pathname === "/blocked" || pathname.startsWith("/blocked/") || pathname === "/unblock" || pathname.startsWith("/unblock/")) {
      const res = NextResponse.next()
      getSecurityHeaders().forEach(([k, v]) => res.headers.set(k, v))
      return res
    }
    if (pathname === "/more/admin-login" || pathname.startsWith("/more/admin-login/")) {
      const res = NextResponse.next()
      getSecurityHeaders().forEach(([k, v]) => res.headers.set(k, v))
      return res
    }
    const isAdmin = req.cookies.get("role")?.value === "admin"
    const adminSlug = process.env.ADMIN_DASHBOARD_SLUG?.trim() || "admin"
    const isEncodedAdminPath = pathname.startsWith("/a/")
    const slug = isEncodedAdminPath ? pathname.slice(3).replace(/\/.*$/, "") : ""
    const encodedAdminAllowed = isEncodedAdminPath && slug === adminSlug && isAdmin

    // 🛡️ SECURITY: Global IP Block Check (DevTools/Abuse Detection)
    // Run this BEFORE isAdmin to ensure the block is absolute if desired, 
    // OR AFTER isAdmin to protect admins. The user seems to be an admin testing this.
    // For now, let's keep it for everyone BUT allow admins to bypass if explicitly whitelisted.
    if (pathname !== "/blocked" && pathname !== "/unblock" && !pathname.startsWith("/api") && !pathname.startsWith("/_next") && !pathname.includes("favicon")) {
      try {
        const { isIpBlocked, getClientIp } = await import("@/lib/inspectSecurity")
        const currentIp = req.ip || getClientIp(req)

        const blocked = await isIpBlocked(currentIp)
        if (blocked) {
          console.log(`[Middleware Security] IP BLOCKED ACCESS: ${currentIp} for ${pathname}`)
          const url = req.nextUrl.clone()
          url.pathname = "/blocked"
          url.searchParams.set("ip", currentIp)
          url.searchParams.set("reason", "ip_blacklist")
          const res = NextResponse.redirect(url)
          getSecurityHeaders().forEach(([k, v]) => res.headers.set(k, v))
          return res
        }
      } catch (err) {
        console.error("Middleware Block Check Error:", err)
      }
    }

    if (encodedAdminAllowed) {
      const res = NextResponse.next()
      getSecurityHeaders().forEach(([k, v]) => res.headers.set(k, v))
      return res
    }
    if (!isAdmin) {
      try {
        const origin = req.nextUrl.origin
        const rm = await fetch(`${origin}/api/maintenance?t=${Date.now()}`, { cache: "no-store", headers: { "Cache-Control": "no-cache" } })
        const jm = await rm.json().catch(() => ({}))
        if (jm?.maintenance === true) {
          const url = req.nextUrl.clone()
          url.pathname = "/maintenance"
          const res = NextResponse.redirect(url)
          getSecurityHeaders().forEach(([k, v]) => res.headers.set(k, v))
          return res
        }
      } catch { }
    }
    const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
    const paid = req.cookies.get("paid")?.value === "1"
    const usernameCookie = req.cookies.get("username")?.value ?? ""
    const username = decodeCookieUsername(usernameCookie)

    if (pathname === "/" && paid && (username || isAdmin)) {
      const url = req.nextUrl.clone()
      if (isAdmin) {
        url.pathname = `/a/${adminSlug}`
      } else {
        let sid = getSidFromReq(req)
        const uidCookie = req.cookies.get("uid")?.value ?? ""
        if (!sid) {
          if (uidCookie) {
            const urlIntro = req.nextUrl.clone()
            urlIntro.pathname = "/intro"
            urlIntro.searchParams.set("msg", "auth-required")
            const resIntro = NextResponse.redirect(urlIntro)
            getSecurityHeaders().forEach(([k, v]) => resIntro.headers.set(k, v))
            return resIntro
          }
          sid = genSid()
        }
        url.pathname = "/home"
        url.searchParams.set("sid", sid)
        const res = NextResponse.redirect(url)
        setSidCookie(res, sid)
        getSecurityHeaders().forEach(([k, v]) => res.headers.set(k, v))
        return res
      }
      const res = NextResponse.redirect(url)
      getSecurityHeaders().forEach(([k, v]) => res.headers.set(k, v))
      return res
    }

    const firstSegment = pathname.slice(1).split("/")[0]
    const secondSegment = pathname.slice(1).split("/")[1]
    const isOldSlugPath = firstSegment && USER_SEGMENTS.includes(secondSegment) && pathname.startsWith("/" + firstSegment + "/")
    if (isOldSlugPath && firstSegment !== "a") {
      const url = req.nextUrl.clone()
      url.pathname = pathname.replace(/^\/[^/]+/, "") || "/home"
      const res = NextResponse.redirect(url)
      getSecurityHeaders().forEach(([k, v]) => res.headers.set(k, v))
      return res
    }

    if (pathname === "/more/admin-dashboard" || pathname.startsWith("/more/admin-dashboard/")) {
      const url = req.nextUrl.clone()
      url.pathname = "/intro"
      const res = NextResponse.redirect(url)
      getSecurityHeaders().forEach(([k, v]) => res.headers.set(k, v))
      return res
    }

    const isUserAppPath =
      USER_APP_PATHS.some((p) => pathname === p) ||
      pathname.startsWith(USER_APP_PREFIX + "/") ||
      pathname === USER_APP_PREFIX

    let allowed =
      isPublic ||
      encodedAdminAllowed ||
      (isUserAppPath && paid && username) ||
      (pathname === "/" && paid && (username || isAdmin))

    if (allowed && isUserAppPath && paid && username && !encodedAdminAllowed) {
      const urlSid = req.nextUrl.searchParams.get("sid")
      let cookieSid = getSidFromReq(req)
      const uidCookie = req.cookies.get("uid")?.value ?? ""

      if (!cookieSid) {
        if (uidCookie) {
          allowed = false
        } else {
          cookieSid = genSid()
          const url = req.nextUrl.clone()
          url.searchParams.set("sid", cookieSid)
          const res = NextResponse.redirect(url)
          setSidCookie(res, cookieSid)
          getSecurityHeaders().forEach(([k, v]) => res.headers.set(k, v))
          return res
        }
      } else if (!urlSid) {
        const url = req.nextUrl.clone()
        url.searchParams.set("sid", cookieSid)
        const res = NextResponse.redirect(url)
        getSecurityHeaders().forEach(([k, v]) => res.headers.set(k, v))
        return res
      } else if (urlSid !== cookieSid) {
        const url = req.nextUrl.clone()
        url.searchParams.set("sid", cookieSid)
        const res = NextResponse.redirect(url)
        getSecurityHeaders().forEach(([k, v]) => res.headers.set(k, v))
        return res
      }
    }

    let res: NextResponse
    if (allowed) {
      res = NextResponse.next()
      const ref = req.nextUrl.searchParams.get("ref")
      if (ref && (pathname === "/" || pathname === "/intro")) {
        res.cookies.set("refcode", ref, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" })
      }
    } else {
      const url = req.nextUrl.clone()
      url.pathname = "/intro"
      url.searchParams.set("msg", "auth-required")
      const ref = url.searchParams.get("ref")
      res = NextResponse.redirect(url)
      if (ref) res.cookies.set("refcode", ref, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" })
    }
    getSecurityHeaders().forEach(([key, value]) => res.headers.set(key, value))
    return res
  } catch (e) {
    const fallback = NextResponse.next()
    getSecurityHeaders().forEach(([k, v]) => fallback.headers.set(k, v))
    return fallback
  }
}

export const config = {
  matcher: [
    "/",
    "/maintenance",
    "/blocked",
    "/unblock",
    "/home",
    "/intro",
    "/create-username",
    "/tournaments",
    "/daily-quiz",
    "/leaderboard",
    "/prizes",
    "/user",
    "/dashboard",
    "/mock-exam",
    "/mock-exam/:path*",
    "/more/:path*",
    "/a/:path*",
    "/payment/:path*",
    "/creator-join",
    "/creator/:path*",
    "/verify/:path*",
    "/contact"
  ]
}
