import { NextResponse } from "next/server"
import { getProfileByEmail } from "@/lib/profiles"
import { rateLimit } from "@/lib/rateLimit"

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

    // Basic Domain Reality Check (MX lookup)
    try {
        const { promisify } = await import("util")
        const dns = await import("dns")
        const resolveMx = promisify(dns.resolveMx)
        const mx = await resolveMx(domain)
        if (!mx || mx.length === 0) {
            return NextResponse.json({ ok: true, available: false, error: "invalid_domain" })
        }
    } catch {
        return NextResponse.json({ ok: true, available: false, error: "invalid_domain" })
    }

    const existing = await getProfileByEmail(email)
    return NextResponse.json({ ok: true, available: !existing })
}
