import { NextResponse } from "next/server"
import { getQuizById } from "@/lib/quizzes"
import { getUserStats, setUserStats } from "@/lib/userStats"
import { requirePaidUser } from "@/lib/auth"
import { createQuizAttemptToken } from "@/lib/quizAttemptToken"

/** POST: Apply quiz code to user when they click Start. Records that this user has started this quiz. */
export async function POST(req: Request) {
  const auth = await requirePaidUser()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const username = auth.username
  if (!username?.trim()) return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const quizId = typeof body?.quizId === "string" ? body.quizId.trim() : null
  if (!quizId) return NextResponse.json({ ok: false, error: "quizId required" }, { status: 400 })

  const quiz = await getQuizById(quizId)
  if (!quiz) return NextResponse.json({ ok: false, error: "Quiz not found" }, { status: 404 })

  const code = quiz.code ?? quizId

  try {
    const attempt = createQuizAttemptToken(username, quizId)
    const existing = await getUserStats(username)
    const ok = await setUserStats(username, {
      ...existing,
      startedQuizId: quizId,
      startedQuizCode: code,
      startedAt: Date.now(),
      startedAttemptNonce: attempt.nonce,
      startedAttemptExpiresAt: attempt.exp
    })
    if (!ok) return NextResponse.json({ ok: false, error: "Failed to save" }, { status: 500 })
    return NextResponse.json({ ok: true, quizId, code, attemptToken: attempt.token, attemptTokenExp: attempt.exp }, { headers: { "Cache-Control": "private, no-store" } })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error)?.message ?? "Failed" }, { status: 500 })
  }
}
