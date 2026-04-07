import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { touchSession, isUserSessionValid } from "@/lib/activeSessions"

/** Extends idle window while the tab is in use. Never 401 if the session is still valid but touch failed (DB noise). */
export async function POST() {
  const cookieStore = await cookies()
  const uid = cookieStore.get("uid")?.value ?? ""
  const sid = cookieStore.get("sid")?.value ?? ""
  // No session cookies → not an error (avoids 401 spam from idle timers); client treats as noop
  if (!uid || !sid) {
    return NextResponse.json({ ok: true, noop: true })
  }
  const touched = await touchSession(uid, sid)
  if (touched) return NextResponse.json({ ok: true })

  const stillValid = await isUserSessionValid(uid, sid)
  if (stillValid) {
    return NextResponse.json({ ok: true, bumped: false })
  }
  return NextResponse.json({ ok: false, reason: "invalid_session" }, { status: 401 })
}
