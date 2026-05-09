import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { requireAdmin } from "@/lib/auth"
import { getPayments } from "@/lib/payments"
import { getTournaments } from "@/lib/tournaments"
import { getQuizzes } from "@/lib/quizzes"
import { getProfiles } from "@/lib/profiles"
import { getReferrals } from "@/lib/referrals"
import { getEnterpriseState } from "@/lib/enterpriseStore"

const ROOT = path.join(process.cwd(), "src", "data")
const files = {
  leaderboard: path.join(ROOT, "leaderboard.json"),
  prizes: path.join(ROOT, "prizes.json"),
  participants: path.join(ROOT, "participants.json")
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

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  const [payments, tournaments, quizzes, profiles, referrals, enterpriseState] = await Promise.all([
    getPayments(),
    getTournaments(),
    getQuizzes(),
    getProfiles(),
    getReferrals(),
    getEnterpriseState()
  ])
  let players: any[] = []
  let prizes: any[] = []
  let participants: any[] = []
  try {
    ;[players, prizes, participants] = await Promise.all([
      readJSON(files.leaderboard),
      readJSON(files.prizes),
      readJSON(files.participants)
    ])
  } catch {
    // File storage read-only on Vercel
  }

  const totalPlayers = Math.max(players.length, profiles.filter((p: any) => p?.username).length)
  const avgScore =
    totalPlayers > 0
      ? Math.round(players.reduce((acc: number, p: any) => acc + (Number(p.score) || 0), 0) / totalPlayers)
      : 0
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const activeToday = participants.filter((p: any) => Number(p.joinedAt ?? 0) >= startOfDay).length
  const revenueByDay: Record<string, number> = {}
  const enrollByDay: Record<string, number> = {}
  for (const p of payments) {
    const ts = Number(p.created_at ?? 0)
    const day = new Date(ts).toISOString().slice(0, 10)
    const amount = Number(p.amount ?? 0)
    revenueByDay[day] = (revenueByDay[day] ?? 0) + (p.status === "success" ? amount : 0)
  }
  for (const p of participants) {
    const ts = Number(p.joinedAt ?? 0)
    const day = new Date(ts).toISOString().slice(0, 10)
    enrollByDay[day] = (enrollByDay[day] ?? 0) + 1
  }
  const last30days: string[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    last30days.push(d.toISOString().slice(0, 10))
  }
  const revenueSeries = last30days.map((d) => ({ date: d, amount: revenueByDay[d] ?? 0 }))
  const enrollSeries = last30days.map((d) => ({ date: d, count: enrollByDay[d] ?? 0 }))
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
  const revenue30d = revenueSeries.reduce((acc, r) => acc + r.amount, 0)
  const pendingCount = payments.filter((p: any) => p.status === "pending_approval").length
  const totalRevenue = payments.filter((p) => p.status === "success" && p.type !== "withdraw").reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  const totalWithdrawals = payments.filter((p) => p.type === "withdraw" && (p.status === "completed" || p.status === "success")).reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  const pendingWithdrawals = payments.filter((p) => p.type === "withdraw" && p.status === "pending").length
  const successPayments = payments.filter((p) => p.status === "success" && p.type !== "withdraw").length
  const deniedPayments = payments.filter((p) => p.status === "denied").length
  const totalReferralCredits = referrals.filter((r: any) => r.status === "credited").reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0)
  const activeTournaments = tournaments.filter((t: any) => t.endTime && new Date(t.endTime).getTime() > Date.now()).length
  const paidProfiles = profiles.filter((p: any) => p?.paid === "P" || Boolean(p?.memberId)).length
  const conversionRate = totalPlayers > 0 ? Number(((paidProfiles / totalPlayers) * 100).toFixed(2)) : 0
  const arpu30d = paidProfiles > 0 ? Number((revenue30d / paidProfiles).toFixed(2)) : 0

  const planById = new Map((enterpriseState.plans ?? []).map((p) => [p.id, p]))
  const subs = enterpriseState.subscriptions ?? []
  const activeSubscriptions = subs.filter((s) => s.status === "active")
  const activeOrgIds = new Set(activeSubscriptions.map((s) => s.orgId))
  const activeOrgCount = activeOrgIds.size
  const trialOrgCount = subs.filter((s) => s.status === "trial").length
  const churnedCount = subs.filter((s) => s.status === "cancelled" || s.status === "expired").length
  const churnRiskPct = subs.length > 0 ? Number(((churnedCount / subs.length) * 100).toFixed(2)) : 0
  const mrr = activeSubscriptions.reduce((sum, sub) => {
    const directAmount = Number(sub.amount ?? 0)
    if (directAmount > 0) return sum + directAmount
    const plan = planById.get(sub.planId)
    return sum + Number(plan?.priceMonthly ?? 0)
  }, 0)
  const arr = mrr * 12

  const paymentsByGateway: Record<string, number> = {}
  for (const p of payments) {
    if (p.status === "success" && p.type !== "withdraw") {
      const gw = String(p.gateway || "unknown")
      paymentsByGateway[gw] = (paymentsByGateway[gw] ?? 0) + 1
    }
  }

  return NextResponse.json({
    ok: true,
    data: {
      totalPlayers,
      pendingPayments: pendingCount,
      prizesCount: prizes.length,
      quizzesCount: quizzes.length,
      averageScore: avgScore,
      activeToday,
      tournamentsCount: tournaments.length,
      activeTournaments,
      paidProfiles,
      conversionRate,
      arpu30d,
      mrr,
      arr,
      activeOrgCount,
      trialOrgCount,
      churnRiskPct,
      revenue30d,
      totalRevenue,
      totalWithdrawals,
      pendingWithdrawals,
      successPayments,
      deniedPayments,
      totalReferralCredits,
      paymentsByGateway,
      revenueSeries,
      enrollSeries,
      categories: categoriesArr
    }
  }, {
    headers: { "Cache-Control": "public, max-age=2, stale-while-revalidate=5" }
  })
}
