import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getProfileByUid } from "@/lib/profiles"
import { endQuizSession } from "@/lib/activeQuizSessions"

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

/** POST: Release single-device lock when quiz ends or user leaves. */
export async function POST(req: Request) {
  const username = await getAuthenticatedUsername()
  if (!username?.trim()) return NextResponse.json({ ok: true })

  const body = await req.json().catch(() => ({}))
  const tournamentId = typeof body?.tournamentId === "string" ? body.tournamentId.trim() : null
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : null

  if (tournamentId && sessionId) {
    await endQuizSession(username, tournamentId, sessionId)
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } })
}
