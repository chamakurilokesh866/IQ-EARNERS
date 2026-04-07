import { NextResponse } from "next/server"
import { getLeaderboard } from "@/lib/leaderboard"

export const dynamic = "force-dynamic"

/** One-shot snapshot. Long-lived SSE caused 504 on Vercel. Client uses polling instead. */
export async function GET() {
  try {
    const data = await getLeaderboard()
    const sorted = [...data].sort((a: { score: number; totalTimeSeconds?: number }, b: { score: number; totalTimeSeconds?: number }) => {
      if (b.score !== a.score) return b.score - a.score
      const ta = a.totalTimeSeconds ?? Infinity
      const tb = b.totalTimeSeconds ?? Infinity
      return ta - tb
    }).map((e, i) => ({ ...e, rank: i + 1 }))
    return NextResponse.json({ data: sorted }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ data: [] }, { status: 200, headers: { "Cache-Control": "no-store" } })
  }
}
