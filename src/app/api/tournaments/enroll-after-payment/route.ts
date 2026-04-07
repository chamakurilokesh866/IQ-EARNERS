import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { promises as fs } from "fs"
import path from "path"
import { getProfiles } from "@/lib/profiles"
import { getTournaments, updateTournament } from "@/lib/tournaments"
import { getLeaderboard, upsertByName } from "@/lib/leaderboard"
import { addEnrollment, isEnrolled } from "@/lib/enrollments"
import { generateEnrollmentCode } from "@/lib/enrollmentCode"

const DATA_DIR = path.join(process.cwd(), "src", "data")

async function readJson<T>(p: string, fallback: T): Promise<T> {
  try {
    const txt = await fs.readFile(p, "utf-8")
    return JSON.parse(txt || "null") ?? fallback
  } catch {
    return fallback
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const tournamentId = body?.tournamentId && String(body.tournamentId).trim()
  if (!tournamentId) return NextResponse.json({ ok: false, error: "tournamentId required" }, { status: 400 })

  const cookieStore = await cookies()
  let username = ""
  try { username = decodeURIComponent(cookieStore.get("username")?.value ?? "") } catch {}
  if (!username) {
    const profiles = await getProfiles()
    const uid = cookieStore.get("uid")?.value ?? ""
    const me = profiles.find((p: any) => p.uid === uid)
    if (me?.username) username = me.username
  }
  if (!username) return NextResponse.json({ ok: false, error: "Username required" }, { status: 401 })

  const tournaments = await getTournaments()
  const tournament = tournaments.find((t: any) => t.id === tournamentId)
  if (!tournament) return NextResponse.json({ ok: false, error: "Tournament not found" }, { status: 404 })

  const taken = await isEnrolled(username, tournamentId)
  if (taken) return NextResponse.json({ ok: true, alreadyEnrolled: true })

  await addEnrollment({ username, tournamentId, paidAt: Date.now(), uniqueCode: generateEnrollmentCode(tournamentId) })

  const existing = await getLeaderboard(tournamentId)
  if (!existing.some((p: any) => String(p?.name).toLowerCase() === username.toLowerCase())) {
    const profiles = await getProfiles()
    const uid = cookieStore.get("uid")?.value ?? ""
    const me = profiles.find((p: any) => p.uid === uid)
    await upsertByName({ name: username, score: 0, country: me?.country || "IN", tournamentId })
  }

  const participants = await readJson<any[]>(path.join(DATA_DIR, "participants.json"), [])
  if (!participants.some((p: any) => String(p?.name).toLowerCase() === username.toLowerCase())) {
    participants.push({ id: String(Date.now()), name: username, joinedAt: Date.now(), status: "Active" })
    await fs.writeFile(path.join(DATA_DIR, "participants.json"), JSON.stringify(participants, null, 2), "utf-8")
  }

  await updateTournament(tournamentId, { enrolled: (tournament.enrolled ?? 0) + 1 })

  return NextResponse.json({ ok: true })
}
