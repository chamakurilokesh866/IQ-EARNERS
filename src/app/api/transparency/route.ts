import { NextResponse } from "next/server"
import { getLeaderboard } from "@/lib/leaderboard"
import { getTournaments } from "@/lib/tournaments"
import { getPayments } from "@/lib/payments"
import { getSettings } from "@/lib/settings"

/** Public trust signals: Recent Winners, Payout Proof, Prize Pool, Participant Count */
export async function GET() {
  try {
    const [leaderboard, tournaments, settings, paymentsData] = await Promise.all([
      getLeaderboard(),
      getTournaments(),
      getSettings(),
      getPayments().catch(() => [] as any[])
    ])

    const sorted = [...leaderboard].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      const ta = a.totalTimeSeconds ?? Infinity
      const tb = b.totalTimeSeconds ?? Infinity
      return ta - tb
    })

    const recentWinners = sorted.slice(0, 5).map((p, i) => ({
      rank: i + 1,
      name: maskName(p.name),
      score: p.score,
      country: p.country
    }))

    const successfulPayments = paymentsData.filter((p: any) => p?.status === "success")
    const payoutProof = successfulPayments
      .slice(-10)
      .reverse()
      .map((p: any) => ({
        amount: p.amount ?? 0,
        maskedUser: "User ***",
        date: p.approved_at ?? p.created_at
      }))

    const now = Date.now()
    const upcoming = tournaments.filter((t: any) => t?.endTime && new Date(t.endTime).getTime() > now)
    const totalPrizePool = upcoming.reduce((sum: number, t: any) => {
      const pool = String(t?.prizePool ?? "0").replace(/[^\d]/g, "")
      return sum + (parseInt(pool, 10) || 0)
    }, 0)
    const currency = settings?.currency ?? "INR"
    const totalParticipants = Math.max(
      leaderboard.length,
      tournaments.reduce((sum: number, t: any) => sum + (Number(t?.enrolled ?? 0) || 0), 0),
      1
    )

    return NextResponse.json({
      ok: true,
      data: {
        recentWinners,
        payoutProof,
        totalPrizePool,
        currency,
        totalParticipants,
        upcomingTournaments: upcoming.length,
        liveQuizHour: settings?.liveQuizHour ?? 20,
        liveQuizMinute: settings?.liveQuizMinute ?? 0
      }
    }, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" }
    })
  } catch (e) {
    return NextResponse.json({
      ok: true,
      data: {
        recentWinners: [],
        payoutProof: [],
        totalPrizePool: 0,
        currency: "INR",
        totalParticipants: 0,
        upcomingTournaments: 0,
        liveQuizHour: 20,
        liveQuizMinute: 0
      }
    })
  }
}

function maskName(name: string): string {
  const s = String(name || "").trim()
  if (s.length <= 2) return "***"
  return s.slice(0, 2) + "***"
}
