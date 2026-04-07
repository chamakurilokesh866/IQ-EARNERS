import { NextResponse } from "next/server"
import { getTournaments } from "@/lib/tournaments"
import { getSettings } from "@/lib/settings"

/** Public: Live Mega Tournament countdown, prize pool, participants. For banner. */
export async function GET() {
  try {
    const [tournaments, settings] = await Promise.all([
      getTournaments(),
      getSettings()
    ])
    const now = Date.now()
    const upcoming = tournaments
      .filter((t: any) => t?.endTime && new Date(t.endTime).getTime() > now)
      .sort((a: any, b: any) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime())
    const featured = upcoming[0]

    let totalPrizePool = 0
    let totalEnrolled = 0
    let totalCapacity = 0
    for (const t of upcoming) {
      const pool = String(t?.prizePool ?? "0").replace(/[^\d]/g, "")
      totalPrizePool += parseInt(pool, 10) || 0
      totalEnrolled += Number(t?.enrolled ?? 0) || 0
      totalCapacity += Math.max(1, Number(t?.capacity ?? 100) || 100)
    }
    const capacity = Math.max(totalCapacity, totalEnrolled, 100)

    const currency = settings?.currency ?? "INR"
    const symbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : ""
    const prizeDisplay = totalPrizePool > 0 ? `${symbol}${totalPrizePool}` : `${symbol}0`

    const liveMegaTimeEnabled = settings?.liveMegaTimeEnabled !== false
    return NextResponse.json({
      ok: true,
      data: {
        prizePool: prizeDisplay,
        enrolled: totalEnrolled,
        capacity,
        liveQuizHour: settings?.liveQuizHour ?? 20,
        liveQuizMinute: settings?.liveQuizMinute ?? 0,
        liveMegaTimeEnabled,
        upcomingCount: upcoming.length,
        featuredTitle: featured?.title,
        featuredTournament: featured ? { id: featured.id, title: featured.title, fee: featured.fee ?? settings?.entryFee ?? 100, cashfreeFormUrl: featured.cashfreeFormUrl } : null
      }
    }, {
      headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=30" }
    })
  } catch {
    return NextResponse.json({
      ok: true,
      data: {
        prizePool: "₹0",
        enrolled: 0,
        capacity: 100,
        liveQuizHour: 20,
        liveQuizMinute: 0,
        liveMegaTimeEnabled: true,
        upcomingCount: 0,
        featuredTitle: null,
        featuredTournament: null
      }
    })
  }
}
