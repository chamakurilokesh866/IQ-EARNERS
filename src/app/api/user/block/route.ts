import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { blockUser, isBlocked } from "@/lib/blocked"
import { rateLimit } from "@/lib/rateLimit"

async function getUsername(): Promise<string | null> {
  try {
    const store = await cookies()
    const v = store.get("username")?.value
    if (!v) return null
    return decodeURIComponent(v.trim())
  } catch {
    return null
  }
}

/** GET: Check if current user is blocked (from database) */
export async function GET() {
  const username = await getUsername()
  if (!username) return NextResponse.json({ ok: true, blocked: false })

  const entry = await isBlocked(username)
  return NextResponse.json({
    ok: true,
    blocked: !!entry,
    blockReason: entry?.reason ?? ""
  })
}

/** POST: Block current user (called when quiz integrity violations exceed limit). Writes to blocked_users table. */
export async function POST(req: Request) {
  const rl = await rateLimit(req, "api")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests", retryAfter: rl.retryAfter }, { status: 429 })
  const username = await getUsername()
  if (!username) return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const reason = String(body?.reason ?? "Switching tabs or exiting fullscreen during quiz exceeded allowed limit (3 warnings).")
  const fullReason = `${reason} Pay ₹50 to unblock.`

  const ok = await blockUser(username.trim(), fullReason)
  if (!ok) return NextResponse.json({ ok: false, error: "Already blocked" }, { status: 400 })

  const res = NextResponse.json({ ok: true, username: username.trim() })
  res.cookies.set("blocked", "B", { path: "/", maxAge: 60 * 60 * 24, httpOnly: false })
  res.cookies.set("blocked_username", encodeURIComponent(username.trim()), { path: "/", maxAge: 60 * 60 * 24, httpOnly: false })
  return res
}
