import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { isUserSessionValid } from "@/lib/activeSessions"

/** Used by middleware and clients to verify uid/sid is still the active session (single device + idle). */
export async function GET() {
  const cookieStore = await cookies()
  const uid = cookieStore.get("uid")?.value ?? ""
  const sid = cookieStore.get("sid")?.value ?? ""
  if (!uid || !sid) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  const valid = await isUserSessionValid(uid, sid)
  if (!valid) {
    return NextResponse.json({ ok: false, reason: "invalid_session" }, { status: 401 })
  }
  return NextResponse.json({ ok: true })
}
