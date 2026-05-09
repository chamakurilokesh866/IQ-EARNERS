import { NextResponse } from "next/server"
import { getProfileByUsername } from "@/lib/profiles"
import { rateLimit } from "@/lib/rateLimit"

export async function POST(req: Request) {
    const rl = await rateLimit(req, "checkUsername")
    if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 })

    const body = await req.json().catch(() => ({}))
    const username = String(body?.username ?? "").trim()

    if (!username) return NextResponse.json({ ok: false, error: "username required" }, { status: 400 })

    // Too short/long: don't hit DB yet (client shows rule hints)
    if (username.length < 6 || username.length > 20) {
      return NextResponse.json({ ok: true, pending: true })
    }

    const charsetOk = /^[A-Za-z0-9._\-@]+$/.test(username)
    if (!charsetOk) {
      return NextResponse.json({ ok: true, available: false, error: "invalid_format" })
    }

    const existing = await getProfileByUsername(username)
    const fullyValid =
      /[A-Z]/.test(username) && /\d/.test(username) && /[._\-@]/.test(username)
    return NextResponse.json({
      ok: true,
      available: !existing,
      ...(existing ? { error: "taken" as const } : {}),
      rulesPending: !fullyValid
    })
}
