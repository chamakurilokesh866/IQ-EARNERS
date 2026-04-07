import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getLeaderboard } from "@/lib/leaderboard"

type Entry = { id?: string; name: string; score?: number; totalTimeSeconds?: number; tournamentId?: string; country?: string }

function sortEntries(entries: Entry[]): (Entry & { rank: number })[] {
  const sorted = [...entries].sort((a, b) => {
    const sa = Number(a.score ?? 0)
    const sb = Number(b.score ?? 0)
    if (sb !== sa) return sb - sa
    const ta = a.totalTimeSeconds ?? Infinity
    const tb = b.totalTimeSeconds ?? Infinity
    return ta - tb
  })
  return sorted.map((e, i) => ({ ...e, rank: i + 1 }))
}

export async function GET(req: Request) {
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }
  const url = new URL(req.url)
  const tournamentId = url.searchParams.get("tournamentId") || undefined
  const leaderboard = await getLeaderboard(tournamentId)

  const ranked = sortEntries(leaderboard)
  const exclude = new Set(ranked.filter((e) => e.rank <= 2).map((e) => String(e.name ?? "").toLowerCase()))
  const toExport = ranked.filter((e) => !exclude.has(String(e.name ?? "").toLowerCase()))

  const headers = ["username", "score", "totalTimeSeconds", "country", "rank"]
  const rows = toExport.map((e) => [
    e.name ?? "",
    String(e.score ?? ""),
    String(e.totalTimeSeconds ?? ""),
    e.country ?? "",
    String(e.rank ?? "")
  ])
  const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n")

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=participants-excluding-top2.csv"
    }
  })
}
