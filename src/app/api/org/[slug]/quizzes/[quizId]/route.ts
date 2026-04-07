import { NextResponse } from "next/server"
import { requireOrgSession } from "@/lib/orgAuth"
import { findOrgBySlug, getEnterpriseState, submitOrgQuizAttempt } from "@/lib/enterpriseStore"

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string; quizId: string }> }) {
  const { slug, quizId } = await ctx.params
  const auth = await requireOrgSession(slug)
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const org = await findOrgBySlug(slug)
  if (!org) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
  const s = await getEnterpriseState()
  const quiz = (s.orgQuizzes[org.id] ?? []).find((q) => q.id === quizId)
  if (!quiz) return NextResponse.json({ ok: false, error: "Quiz not found" }, { status: 404 })
  if (!quiz.published && auth.session.role === "student") return NextResponse.json({ ok: false, error: "Quiz not available" }, { status: 403 })
  return NextResponse.json({ ok: true, data: quiz })
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string; quizId: string }> }) {
  const { slug, quizId } = await ctx.params
  const auth = await requireOrgSession(slug)
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const org = await findOrgBySlug(slug)
  if (!org) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  const answers = Array.isArray(body.answers) ? body.answers.map(Number) : []
  const timeSeconds = typeof body.timeSeconds === "number" ? body.timeSeconds : 0

  const s = await getEnterpriseState()
  const quiz = (s.orgQuizzes[org.id] ?? []).find((q) => q.id === quizId && q.published)
  if (!quiz) return NextResponse.json({ ok: false, error: "Quiz not found" }, { status: 404 })

  let score = 0
  for (let i = 0; i < quiz.questions.length; i++) {
    if (answers[i] === quiz.questions[i].correct) score++
  }

  const attempt = await submitOrgQuizAttempt({
    orgId: org.id, quizId, memberId: auth.session.memberId, memberName: auth.session.memberName,
    score, total: quiz.questions.length, timeSeconds, answers
  })
  if (!attempt) return NextResponse.json({ ok: false, error: "Failed to save" }, { status: 500 })
  return NextResponse.json({ ok: true, data: { score, total: quiz.questions.length, attemptId: attempt.id } })
}
