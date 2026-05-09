import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getProfileByUid } from "@/lib/profiles"
import { analyzeTimeConsistency } from "@/lib/smartIntegrity"
import { logIntegrityEventServer } from "@/lib/integrityLogger"
import { saveCompletion } from "@/lib/quizCompletions"
import { rateLimit } from "@/lib/rateLimit"
import { getUserStats, setUserStats } from "@/lib/userStats"
import { verifyQuizAttemptToken } from "@/lib/quizAttemptToken"

type UserStats = {
  username: string
  streak: number
  lastDate: string
  completedDates: string[]
  completedQuizIds?: string[]
  completedByQuiz?: Record<string, { score: number; total: number; totalTimeSeconds: number; rows?: { question: string; correctAnswer: string; userAnswer: string; correct: boolean; timeSeconds: number; explanation?: string }[] }>
  achievements: string[]
  history: { date: string; score: number; total: number; totalTimeSeconds: number }[]
  startedQuizId?: string
  startedQuizCode?: string
  startedAt?: number
  startedAttemptNonce?: string
  startedAttemptExpiresAt?: number
  integrityStrikes?: number
  integrityStrikesQuizId?: string
}

const BADGES: Record<string, { icon: string; label: string; check: (s: UserStats, ctx?: { rank?: number }) => boolean }> = {
  first_quiz: { icon: "🎯", label: "First Quiz", check: (s) => (s.history?.length ?? 0) >= 1 },
  perfect_5: { icon: "⭐", label: "Perfect 5", check: (s) => (s.history ?? []).some((h) => h.total >= 5 && h.score === h.total) },
  streak_3: { icon: "🔥", label: "3-Day Streak", check: (s) => (s.streak ?? 0) >= 3 },
  streak_7: { icon: "💎", label: "7-Day Streak", check: (s) => (s.streak ?? 0) >= 7 },
  top_3: { icon: "🏆", label: "Top 3", check: (_s, ctx) => (ctx?.rank ?? 0) <= 3 },
  ten_correct: { icon: "🎖️", label: "10 Correct", check: (s) => (s.history ?? []).some((h) => h.score >= 10) },
  speed_demon: { icon: "⚡", label: "Speed Demon", check: (s) => (s.history ?? []).some((h) => h.total > 0 && (h.totalTimeSeconds / h.total) < 10) },
  perfect_10: { icon: "🌟", label: "Perfect 10", check: (s) => (s.history ?? []).some((h) => h.total >= 10 && h.score === h.total) }
}

async function getAuthenticatedUsername(): Promise<string | null> {
  try {
    const store = await cookies()
    const uid = store.get("uid")?.value ?? ""
    if (uid) {
      const profile = await getProfileByUid(uid)
      if (profile?.username) return profile.username
    }
    const v = store.get("username")?.value
    if (!v) return null
    return decodeURIComponent(v.trim())
  } catch {
    return null
  }
}

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

export async function GET() {
  const username = await getAuthenticatedUsername()
  if (!username) return NextResponse.json({ ok: true, data: { streak: 0, achievements: [], history: [] } })

  const raw = await getUserStats(username)
  const user: UserStats = {
    username: username.toLowerCase(),
    streak: 0,
    lastDate: raw?.lastDate ?? "",
    completedDates: raw?.completedDates ?? [],
    completedQuizIds: raw?.completedQuizIds,
    completedByQuiz: raw?.completedByQuiz as UserStats["completedByQuiz"],
    achievements: raw?.achievements ?? [],
    history: raw?.history ?? []
  }
  user.streak = calcStreak(user.completedDates)

  const completedByQuiz = user.completedByQuiz ?? {}
  const completedPapers = Object.entries(completedByQuiz).map(([quizId, entry]) => ({
    quizId,
    score: entry.score,
    total: entry.total,
    totalTimeSeconds: entry.totalTimeSeconds
  }))

  const rawFull = await getUserStats(username)

  return NextResponse.json({
    ok: true,
    data: {
      streak: user.streak,
      achievements: user.achievements,
      history: user.history.slice(-20).reverse(),
      completedPapers,
      integrityStrikes: Number(rawFull?.integrityStrikes ?? 0) || 0,
      integrityStrikesQuizId: rawFull?.integrityStrikesQuizId ?? null
    }
  })
}

export async function POST(req: Request) {
  const rl = await rateLimit(req, "api")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests", retryAfter: rl.retryAfter }, { status: 429 })

  const username = await getAuthenticatedUsername()
  if (!username) return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { date, score, total, totalTimeSeconds, rank, quizId, rows } = body
  if (!date || typeof score !== "number" || typeof total !== "number") {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 })
  }
  if (!Number.isInteger(score) || !Number.isInteger(total) || total <= 0 || score < 0 || score > total) {
    return NextResponse.json({ ok: false, error: "Invalid score payload." }, { status: 400 })
  }
  const totalSec = typeof totalTimeSeconds === "number" ? totalTimeSeconds : 0
  const minTime = Math.max(0, total) * 2
  if (totalSec < minTime || totalSec > 7200) {
    return NextResponse.json({ ok: false, error: "Invalid completion time (anti-cheat validation failed)." }, { status: 400 })
  }

  const key = username.toLowerCase()
  const raw = await getUserStats(username)
  if (quizId && typeof quizId === "string") {
    const tokenRaw = typeof body?.attemptToken === "string" ? body.attemptToken.trim() : ""
    const token = verifyQuizAttemptToken(tokenRaw)
    if (!token) {
      return NextResponse.json({ ok: false, error: "Invalid or expired attempt token." }, { status: 403 })
    }
    if (token.u !== key || token.q !== quizId) {
      return NextResponse.json({ ok: false, error: "Attempt token mismatch." }, { status: 403 })
    }
    const startedQuizId = String(raw?.startedQuizId ?? "")
    const startedNonce = String(raw?.startedAttemptNonce ?? "")
    const startedExp = Number(raw?.startedAttemptExpiresAt ?? 0)
    const startedAt = Number(raw?.startedAt ?? 0)
    if (!startedQuizId || startedQuizId !== quizId || !startedNonce || startedNonce !== token.n) {
      return NextResponse.json({ ok: false, error: "Quiz start session mismatch." }, { status: 403 })
    }
    if (!startedExp || Date.now() > startedExp || !startedAt || Date.now() - startedAt > 1000 * 60 * 120) {
      return NextResponse.json({ ok: false, error: "Quiz attempt session expired. Please start again." }, { status: 403 })
    }
  }
  let user: UserStats = {
    username: key,
    streak: 0,
    lastDate: raw?.lastDate ?? "",
    completedDates: raw?.completedDates ?? [],
    completedQuizIds: raw?.completedQuizIds,
    completedByQuiz: raw?.completedByQuiz as UserStats["completedByQuiz"],
    achievements: raw?.achievements ?? [],
    history: raw?.history ?? [],
    integrityStrikes: raw?.integrityStrikes,
    integrityStrikesQuizId: raw?.integrityStrikesQuizId
  }

  const dateStr = String(date).slice(0, 10)
  if (!user.completedDates) user.completedDates = []
  if (!user.completedDates.includes(dateStr)) user.completedDates.push(dateStr)
  user.lastDate = dateStr

  if (quizId && typeof quizId === "string" && quizId.trim()) {
    user.completedQuizIds = user.completedQuizIds ?? []
    if (!user.completedQuizIds.includes(quizId)) user.completedQuizIds.push(quizId)
    user.completedByQuiz = user.completedByQuiz ?? {}
    const entry: { score: number; total: number; totalTimeSeconds: number; rows?: { question: string; correctAnswer: string; userAnswer: string; correct: boolean; timeSeconds: number; explanation?: string }[] } = { score, total, totalTimeSeconds: totalTimeSeconds ?? 0 }
    if (Array.isArray(rows) && rows.length > 0) {
      entry.rows = rows.map((r: { question?: string; correctAnswer?: string; userAnswer?: string; correct?: boolean; timeSeconds?: number; explanation?: string }) => ({
        question: String(r?.question ?? ""),
        correctAnswer: String(r?.correctAnswer ?? ""),
        userAnswer: String(r?.userAnswer ?? ""),
        correct: Boolean(r?.correct),
        timeSeconds: Number(r?.timeSeconds ?? 0),
        explanation: r?.explanation != null ? String(r.explanation) : undefined
      }))
      const derivedScore = entry.rows.reduce((acc, r) => acc + (r.correct ? 1 : 0), 0)
      if (derivedScore !== score) {
        return NextResponse.json({ ok: false, error: "Score mismatch detected." }, { status: 400 })
      }
      const analysis = analyzeTimeConsistency(entry.rows)
      if (analysis.suspicious) {
        await logIntegrityEventServer(
          "time_consistency_flagged",
          analysis.reason ?? "Suspicious per-question time pattern",
          { username: key, quizId, score, total, totalTimeSeconds: entry.totalTimeSeconds, ...analysis.details, deviceFingerprint: body.deviceFingerprint },
          username
        )
      }
    }
    user.completedByQuiz[quizId] = entry
    await saveCompletion(key, quizId, dateStr, { score: entry.score, total: entry.total, totalTimeSeconds: entry.totalTimeSeconds, rows: entry.rows }).catch(() => { })
    if (raw?.integrityStrikesQuizId === quizId) {
      user.integrityStrikes = 0
      user.integrityStrikesQuizId = undefined
    }
  }

  user.history = user.history ?? []
  user.history.push({ date: dateStr, score, total, totalTimeSeconds: totalTimeSeconds ?? 0 })
  user.history = user.history.slice(-50)

  user.streak = calcStreak(user.completedDates)
  user.achievements = user.achievements ?? []

  for (const [id, def] of Object.entries(BADGES)) {
    if (user.achievements.includes(id)) continue
    const ctx = id === "top_3" ? { rank } : undefined
    const check = id === "top_3" ? (rank != null && rank <= 3) : def.check(user, ctx)
    if (check) user.achievements.push(id)
  }

  if (quizId && typeof quizId === "string" && quizId.trim()) {
    user.startedQuizId = undefined
    user.startedQuizCode = undefined
    user.startedAt = undefined
    user.startedAttemptNonce = undefined
    user.startedAttemptExpiresAt = undefined
  }

  const ok = await setUserStats(username, user)
  if (!ok) return NextResponse.json({ ok: false, error: "Failed to save" }, { status: 500 })

  return NextResponse.json({ ok: true, data: { streak: user.streak, achievements: user.achievements } })
}
