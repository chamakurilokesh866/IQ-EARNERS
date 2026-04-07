import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { getLeaderboard } from "@/lib/leaderboard"
import { getProfileByUsername } from "@/lib/profiles"
import { getTournaments } from "@/lib/tournaments"
import { rateLimit } from "@/lib/rateLimit"

const USER_STATS_PATH = path.join(process.cwd(), "src", "data", "user-stats.json")

function calcStreak(dates: string[]): number {
  if (!dates.length) return 0
  const sorted = [...new Set(dates)].sort().reverse()
  let streak = 0
  const today = new Date().toISOString().slice(0, 10)
  let expect = today
  for (const d of sorted) {
    if (d === expect) {
      streak++
      const prev = new Date(expect)
      prev.setDate(prev.getDate() - 1)
      expect = prev.toISOString().slice(0, 10)
    } else if (d < expect) break
  }
  return streak
}

export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const rl = await rateLimit(req, "api")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 })
  const { username } = await params
  if (!username?.trim()) return NextResponse.json({ ok: false, error: "Username required" }, { status: 400 })

  const url = new URL(req.url)
  const tournamentId = url.searchParams.get("tournamentId") || undefined
  const key = decodeURIComponent(username).trim().toLowerCase()
  let stats: { streak: number; history: any[]; achievements: string[] } = { streak: 0, history: [], achievements: [] }
  let leaderboardEntry: { score?: number; totalTimeSeconds?: number; rank?: number } | null = null
  let tournamentResults: Array<{ tournamentId: string; tournamentTitle: string; score: number; totalTimeSeconds?: number; rank: number }> = []
  let profile: { country?: string } | null = null

  try {
    const statsTxt = await fs.readFile(USER_STATS_PATH, "utf-8").catch(() => "{}")
    const allStats = JSON.parse(statsTxt || "{}")
    const userStats = allStats[key]
    if (userStats) {
      stats.streak = calcStreak(userStats.completedDates ?? [])
      stats.history = (userStats.history ?? []).slice(-50).reverse()
      stats.achievements = userStats.achievements ?? []
    }
    const [lb, tournaments] = await Promise.all([getLeaderboard(), getTournaments()])
    const tournamentMap = new Map(tournaments.map((t: any) => [t.id, t.title ?? t.id]))

    function rankEntries(entries: any[]) {
      const sorted = [...entries].sort((a: any, b: any) => {
        if (b.score !== a.score) return b.score - a.score
        return (a.totalTimeSeconds ?? Infinity) - (b.totalTimeSeconds ?? Infinity)
      })
      return sorted.map((e: any, i: number) => ({ ...e, rank: i + 1 }))
    }

    const overall = lb.filter((e: any) => !e.tournamentId)
    const rankedOverall = rankEntries(overall)
    const entryOverall = rankedOverall.find((e: any) => String(e?.name ?? "").toLowerCase() === key)

    if (tournamentId) {
      const tournamentLb = lb.filter((e: any) => String(e?.tournamentId) === tournamentId)
      const rankedTournament = rankEntries(tournamentLb)
      const entryTournament = rankedTournament.find((e: any) => String(e?.name ?? "").toLowerCase() === key)
      if (entryTournament) {
        leaderboardEntry = { score: entryTournament.score, totalTimeSeconds: entryTournament.totalTimeSeconds, rank: entryTournament.rank }
      }
    }
    if (!leaderboardEntry && entryOverall) {
      leaderboardEntry = { score: entryOverall.score, totalTimeSeconds: entryOverall.totalTimeSeconds, rank: entryOverall.rank }
    }

    const userTournamentEntries = lb.filter((e: any) => String(e?.name ?? "").toLowerCase() === key && e.tournamentId)
    for (const e of userTournamentEntries) {
      const tid = String(e.tournamentId)
      const tournamentLb = lb.filter((x: any) => String(x?.tournamentId) === tid)
      const ranked = rankEntries(tournamentLb)
      const entry = ranked.find((x: any) => String(x?.name ?? "").toLowerCase() === key)
      if (entry) {
        tournamentResults.push({
          tournamentId: tid,
          tournamentTitle: tournamentMap.get(tid) ?? tid,
          score: entry.score,
          totalTimeSeconds: entry.totalTimeSeconds,
          rank: entry.rank
        })
      }
    }
    tournamentResults.sort((a, b) => b.score - a.score)

    const p = await getProfileByUsername(username)
    if (p) profile = { country: p.country }
  } catch {}

  return NextResponse.json({
    ok: true,
    data: {
      username: key,
      country: profile?.country,
      streak: stats.streak,
      history: stats.history,
      achievements: stats.achievements,
      tournamentResults,
      currentScore: leaderboardEntry?.score,
      totalTimeSeconds: leaderboardEntry?.totalTimeSeconds,
      rank: leaderboardEntry?.rank
    }
  })
}
