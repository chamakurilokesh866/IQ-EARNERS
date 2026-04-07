import { NextResponse } from "next/server"
import { getProfileByUsername } from "@/lib/profiles"
import { rateLimit } from "@/lib/rateLimit"

export async function POST(req: Request) {
    const rl = await rateLimit(req, "checkUsername")
    if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 })

    const body = await req.json().catch(() => ({}))
    const username = String(body?.username ?? "").trim()

    if (!username) return NextResponse.json({ ok: false, error: "username required" }, { status: 400 })

    // Basic validation to match profile/route.ts
    const allowed = /^[A-Za-z0-9._\-@]{6,20}$/
    if (!allowed.test(username) || !/[A-Z]/.test(username) || !/\d/.test(username) || !/[._\-@]/.test(username)) {
        return NextResponse.json({ ok: true, available: false, error: "invalid_format" })
    }

    const existing = await getProfileByUsername(username)
    return NextResponse.json({ ok: true, available: !existing })
}
