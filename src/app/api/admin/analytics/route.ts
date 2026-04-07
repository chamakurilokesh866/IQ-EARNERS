import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { cookies } from "next/headers"

const ROOT = path.join(process.cwd(), "src", "data")

async function isAdmin(): Promise<boolean> {
  try {
    const store = await cookies()
    return store.get("role")?.value === "admin"
  } catch {
    return false
  }
}

async function readJSON(p: string): Promise<any[]> {
  try {
    const txt = await fs.readFile(p, "utf-8")
    const v = JSON.parse(txt)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

async function readUserStats(): Promise<Record<string, any>> {
  try {
    const txt = await fs.readFile(path.join(ROOT, "user-stats.json"), "utf-8")
    return JSON.parse(txt || "{}")
  } catch {
    return {}
  }
}

export async function GET() {
  const admin = await isAdmin()
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  const [leaderboard, payments, userStats, feedback, quizzes] = await Promise.all([
    readJSON(path.join(ROOT, "leaderboard.json")),
    readJSON(path.join(ROOT, "payments.json")),
    readUserStats(),
    readJSON(path.join(ROOT, "question-feedback.json")),
    readJSON(path.join(ROOT, "quizzes.json"))
  ])

  const categories: Record<string, number> = {}
  for (const q of quizzes) {
    if (Array.isArray(q?.questions)) {
      for (const qq of q.questions) {
        const cat = String(qq?.category ?? "General")
        categories[cat] = (categories[cat] ?? 0) + 1
      }
    }
  }
  const categoriesArr = Object.entries(categories).map(([label, count]) => ({ label, count }))

  const last30: string[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    last30.push(d.toISOString().slice(0, 10))
  }

  const completionByDay: Record<string, number> = {}
  const revenueByDay: Record<string, number> = {}
  for (const d of last30) {
    completionByDay[d] = 0
    revenueByDay[d] = 0
  }

  const users = Object.values(userStats) as any[]
  for (const u of users) {
    for (const h of u.history ?? []) {
      const d = String(h?.date ?? "").slice(0, 10)
      if (d && completionByDay[d] !== undefined) completionByDay[d]++
    }
  }

  for (const p of payments) {
    const ts = Number(p.created_at ?? 0)
    const d = new Date(ts).toISOString().slice(0, 10)
    if (revenueByDay[d] !== undefined && p.status === "success") {
      revenueByDay[d] += Number(p.amount ?? 0)
    }
  }

  const completionSeries = last30.map((d) => ({ date: d, count: completionByDay[d] ?? 0 }))
  const revenueSeries = last30.map((d) => ({ date: d, amount: revenueByDay[d] ?? 0 }))

  const totalCompletions = users.reduce((acc, u) => acc + (u.history?.length ?? 0), 0)
  const uniqueUsers = users.length
  const avgStreak = uniqueUsers > 0
    ? Math.round(users.reduce((acc, u) => acc + (u.streak ?? 0), 0) / uniqueUsers * 10) / 10
    : 0

  return NextResponse.json({
    ok: true,
    data: {
      totalCompletions,
      uniqueUsers,
      avgStreak,
      leaderboardCount: leaderboard.length,
      feedbackCount: feedback.length,
      completionSeries,
      revenueSeries,
      revenue30d: revenueSeries.reduce((a, r) => a + r.amount, 0),
      categories: categoriesArr
    }
  })
}
