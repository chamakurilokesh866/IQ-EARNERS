import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { getQuizzes } from "@/lib/quizzes"
import { getProfiles } from "@/lib/profiles"
import { getSettings } from "@/lib/settings"
import { getPayments } from "@/lib/payments"
import type { Payment } from "@/lib/payments"
import type { Profile } from "@/lib/profiles"

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

const ENTRY_PAYMENT_TYPES = new Set(["entry", "tournament", "tournament_entry", "prize_entry"])

function recentEntryPaymentsList(payments: Payment[], profiles: Profile[]) {
  const byUid = new Map(profiles.map((p) => [p.uid, (p.username ?? "").trim()]))
  return payments
    .filter((p) => {
      if (p.status !== "success" || p.type === "unblock") return false
      return ENTRY_PAYMENT_TYPES.has(p.type) || (p.gateway === "qr" && p.amount > 0)
    })
    .slice(0, 15)
    .map((p) => {
      const metaU = p.meta && typeof p.meta.username === "string" ? String(p.meta.username).trim() : ""
      const fromProfile = p.profileId ? byUid.get(p.profileId) : ""
      const username = metaU || fromProfile || "Member"
      return { username, amount: p.amount, at: p.created_at }
    })
}

/** Public stats for leaderboard, user dashboard – no auth required */
export async function GET() {
  try {
    const [profiles, quizzes, players, prizes, participants, settings, payments] = await Promise.all([
      getProfiles(),
      getQuizzes(),
      readJSON(files.leaderboard),
      readJSON(files.prizes),
      readJSON(files.participants),
      getSettings(),
      getPayments()
    ])
    const totalPlayers = Math.max(players.length, profiles.filter((p: any) => p?.username).length)
    const avgScore =
      totalPlayers > 0
        ? Math.round(players.reduce((acc: number, p: any) => acc + (Number(p.score) || 0), 0) / totalPlayers)
        : 0
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    const activeToday = participants.filter((p: any) => Number(p.joinedAt ?? 0) >= startOfDay).length

    const totalEarnings = profiles.reduce((acc, p) => acc + (Number(p.wallet ?? 0)), 0) + (participants.length * 5)
    const recentWinners = players
      .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
      .slice(0, 5)
      .map(p => ({ name: p.name || p.username || "Player", amount: (Number(p.score) || 0) * 10 || 50 }))

    const recentJoiners = profiles
      .filter(p => !!p.username)
      .sort((a, b) => (Number(b.created_at ?? 0)) - (Number(a.created_at ?? 0)))
      .slice(0, 10)
      .map(p => ({ username: p.username || "Guest", joinedAt: p.created_at }))

    const recentEntryPayments = recentEntryPaymentsList(payments, profiles)
    const questionsInBank = quizzes.reduce(
      (n, q) => n + (Array.isArray((q as { questions?: unknown[] }).questions) ? (q as { questions: unknown[] }).questions.length : 0),
      0
    )

    return NextResponse.json({
      ok: true,
      data: {
        totalPlayers,
        prizesCount: prizes.length,
        quizzesCount: quizzes.length,
        questionsInBank: Math.max(questionsInBank, 0),
        averageScore: avgScore,
        activeToday,
        totalEarnings: Math.max(totalEarnings, 15450),
        recentWinners: recentWinners,
        recentJoiners: recentJoiners,
        recentEntryPayments,
        mockExamEnabled: !!settings?.tsEamcetMockExamEnabled,
        mockExamDuration: settings?.tsEamcetMockExamDurationMin ?? 180,
        socialMediaEnabled: !!settings?.socialMediaEnabled,
        socialMediaLinks: settings?.socialMediaLinks ?? {}
      }
    }, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" }
    })
  } catch {
    return NextResponse.json({
      ok: true,
      data: { totalPlayers: 0, prizesCount: 0, quizzesCount: 0, questionsInBank: 0, averageScore: 0, activeToday: 0, totalEarnings: 0, recentWinners: [], recentJoiners: [], recentEntryPayments: [], mockExamEnabled: false }
    })
  }
}
