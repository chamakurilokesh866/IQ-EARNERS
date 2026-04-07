import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getProfileByUid } from "@/lib/profiles"
import { startQuizSession } from "@/lib/activeQuizSessions"

async function getAuthenticatedUsername(): Promise<string | null> {
  try {
    const store = await cookies()
    const uid = store.get("uid")?.value ?? ""
    if (uid) {
      const profile = await getProfileByUid(uid)
      if (profile?.username) return profile.username
    }
    const v = store.get("username")?.value
    if (!v) return null
    return decodeURIComponent(v.trim())
  } catch {
    return null
  }
}

/** POST: Acquire single-device lock for tournament quiz. Fails if same user already playing on another device. */
export async function POST(req: Request) {
  const username = await getAuthenticatedUsername()
  if (!username?.trim()) return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const tournamentId = typeof body?.tournamentId === "string" ? body.tournamentId.trim() : null
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : null
  const deviceFingerprint = typeof body?.deviceFingerprint === "string" ? body.deviceFingerprint.trim() : undefined

  if (!tournamentId || !sessionId) {
    return NextResponse.json({ ok: false, error: "tournamentId and sessionId required" }, { status: 400 })
  }

  const result = await startQuizSession({
    username,
    tournamentId,
    sessionId,
    deviceFingerprint
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error ?? "Failed to acquire lock" }, { status: 409 })
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } })
}
