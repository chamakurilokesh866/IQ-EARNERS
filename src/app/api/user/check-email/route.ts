import { NextResponse } from "next/server"
import dns from "node:dns"
import { getProfileByEmail } from "@/lib/profiles"
import { rateLimit } from "@/lib/rateLimit"
import { getMxCache, setMxCache } from "@/lib/mxDomainCache"

export async function POST(req: Request) {
  const rl = await rateLimit(req, "checkEmail")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 })

  const body = await req.json().catch(() => ({}))
  const email = String(body?.email ?? "").trim().toLowerCase()

  if (!email) return NextResponse.json({ ok: false, error: "email required" }, { status: 400 })

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ ok: true, available: false, error: "invalid_format" })
  }

  const domain = email.split("@")[1]
  const BLOCKED_DOMAINS = ["tempmail.com", "yopmail.com", "guerrillamail.com", "mailinator.com", "10minutemail.com", "temp-mail.org", "throwawaymail.com", "yopmail.fr", "yopmail.net", "dispostable.com", "mailinator.net"]
  if (BLOCKED_DOMAINS.includes(domain)) {
    return NextResponse.json({ ok: true, available: false, error: "temporary_email" })
  }

  const existingEarly = await getProfileByEmail(email)
  if (existingEarly) {
    return NextResponse.json({ ok: true, available: false, error: "already_used" })
  }

  const cached = getMxCache(domain)
  if (cached === false) {
    return NextResponse.json({ ok: true, available: false, error: "invalid_domain" })
  }
  if (cached === true) {
    return NextResponse.json({ ok: true, available: true })
  }

  try {
    const mx = await dns.promises.resolveMx(domain)
    const ok = !!(mx && mx.length > 0)
    setMxCache(domain, ok)
    if (!ok) {
      return NextResponse.json({ ok: true, available: false, error: "invalid_domain" })
    }
  } catch {
    setMxCache(domain, false)
    return NextResponse.json({ ok: true, available: false, error: "invalid_domain" })
  }

  return NextResponse.json({ ok: true, available: true })
}
