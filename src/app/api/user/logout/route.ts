import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { clearAuthCookiesOnResponse } from "@/lib/cookieOptions"
import { endSession } from "@/lib/activeSessions"
import { rateLimit } from "@/lib/rateLimit"

export async function POST(req: Request) {
  const rl = await rateLimit(req, "api")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 })
  const cookieStore = await cookies()
  const uid = cookieStore.get("uid")?.value ?? ""
  const sid = cookieStore.get("sid")?.value ?? ""

  if (uid && sid) {
    await endSession(uid, sid)
  }

  const res = NextResponse.json({ ok: true })
  clearAuthCookiesOnResponse(res)
  return res
}
