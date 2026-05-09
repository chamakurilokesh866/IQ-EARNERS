import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { promises as fs } from "fs"
import path from "path"
import { getLeaderboard } from "@/lib/leaderboard"
import { getProfileByUid } from "@/lib/profiles"
import { getTournaments } from "@/lib/tournaments"
import { getSettings } from "@/lib/settings"
import { getPayments } from "@/lib/payments"

const DATA_DIR = path.join(process.cwd(), "src", "data")

type Entry = { id?: string; name: string; score: number; totalTimeSeconds?: number; tournamentId?: string }

function sortAndRank(entries: Entry[]): (Entry & { rank: number })[] {
  const sorted = [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const ta = a.totalTimeSeconds ?? Infinity
    const tb = b.totalTimeSeconds ?? Infinity
    return ta - tb
  })
  return sorted.map((e, i) => ({ ...e, rank: i + 1 }))
}

export async function GET() {
  const cookieStore = await cookies()
  const uid = cookieStore.get("uid")?.value ?? ""
  let username = ""
  if (uid) {
    const profile = await getProfileByUid(uid)
    username = profile?.username ?? ""
  }
  if (!username) {
    try {
      username = decodeURIComponent(cookieStore.get("username")?.value ?? "")
    } catch {}
  }
  if (!username) return NextResponse.json({ ok: true, data: [] })
  const profile = uid ? await getProfileByUid(uid) : null
  const isPaidMember = profile?.paid === "P" || profile?.paid === "A"
  if (!isPaidMember) return NextResponse.json({ ok: true, data: [] })

  const payments = await getPayments()
  const hasApprovedPayment = payments.some((p) => {
    if (p.status !== "success") return false
    if (uid && p.profileId === uid) return true
    const metaUsername = String((p.meta as Record<string, unknown> | undefined)?.username ?? "").trim().toLowerCase()
    return metaUsername === username.toLowerCase()
  })
  if (!hasApprovedPayment) return NextResponse.json({ ok: true, data: [] })

  const [leaderboard, tournaments, settings] = await Promise.all([
    getLeaderboard(),
    getTournaments(),
    getSettings()
  ])
  const round = Number(settings.round ?? 1)

  const nameLower = username.toLowerCase()

  const groups = new Map<string, Entry[]>()
  for (const e of leaderboard) {
    const tid = e.tournamentId ?? ""
    if (!groups.has(tid)) groups.set(tid, [])
    groups.get(tid)!.push(e)
  }

  const certificates: { tournamentId: string; tournamentTitle: string; score: number; total?: number; type: "1st" | "runner_up" | "participation" }[] = []

  const manualTxt = await fs.readFile(path.join(DATA_DIR, "certificates.json"), "utf-8").catch(() => "[]")
  const manual: { username?: string; type?: string; tournamentTitle?: string; approved?: boolean }[] = JSON.parse(manualTxt || "[]")
  for (const m of manual) {
    if (String(m?.username ?? "").toLowerCase() !== nameLower) continue
    if (m.approved === false) continue
    const t = m.type === "runner_up" || m.type === "participation" ? m.type : "1st"
    certificates.push({
      tournamentId: "manual",
      tournamentTitle: m.tournamentTitle ?? "Tournament",
      score: 0,
      type: t as "1st" | "runner_up" | "participation"
    })
  }

  for (const [tid, entries] of groups) {
    const ranked = sortAndRank(entries)
    const first = ranked[0]
    if (!first) continue
    if (String(first.name ?? "").toLowerCase() !== nameLower) continue

    const tournamentTitle = tid ? (tournaments.find((t: any) => t.id === tid)?.title ?? tid) : (round <= 1 ? "Round 1" : "Overall")
    certificates.push({
      tournamentId: tid || "overall",
      tournamentTitle,
      score: first.score,
      total: undefined,
      type: "1st" as const
    })
  }

  return NextResponse.json({ ok: true, data: certificates })
}
