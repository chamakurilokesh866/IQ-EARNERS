import { NextResponse } from "next/server"
import { requireOrgSession, requireOrgOwnerOrAdmin } from "@/lib/orgAuth"
import { findOrgBySlug, getEnterpriseState, logOrgAuditEvent, submitOrgQuizAttempt, updateOrgQuiz } from "@/lib/enterpriseStore"

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string; quizId: string }> }) {
  const { slug, quizId } = await ctx.params
  const auth = await requireOrgSession(slug)
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const org = await findOrgBySlug(slug)
  if (!org) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
  const s = await getEnterpriseState()
  const quiz = (s.orgQuizzes[org.id] ?? []).find((q) => q.id === quizId)
  if (!quiz) return NextResponse.json({ ok: false, error: "Quiz not found" }, { status: 404 })
  if ((!quiz.published || quiz.archived) && auth.session.role === "student") return NextResponse.json({ ok: false, error: "Quiz not available" }, { status: 403 })
  const normalized = {
    ...quiz,
    questions: quiz.questions.map((q) => ({
      ...q,
      correct: Math.min(Math.max(0, Number(q.correct) || 0), Math.max(0, q.options.length - 1)),
    })),
  }
  return NextResponse.json({ ok: true, data: normalized })
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
  const quiz = (s.orgQuizzes[org.id] ?? []).find((q) => q.id === quizId && q.published && !q.archived)
  if (!quiz) return NextResponse.json({ ok: false, error: "Quiz not found" }, { status: 404 })

  let score = 0
  for (let i = 0; i < quiz.questions.length; i++) {
    const expected = Math.min(Math.max(0, Number(quiz.questions[i].correct) || 0), Math.max(0, quiz.questions[i].options.length - 1))
    if (answers[i] === expected) score++
  }

  const attempt = await submitOrgQuizAttempt({
    orgId: org.id, quizId, memberId: auth.session.memberId, memberName: auth.session.memberName,
    score, total: quiz.questions.length, timeSeconds, answers
  })
  if (!attempt) return NextResponse.json({ ok: false, error: "Failed to save" }, { status: 500 })
  return NextResponse.json({ ok: true, data: { score, total: quiz.questions.length, attemptId: attempt.id } })
}

export async function PATCH(req: Request, ctx: { params: Promise<{ slug: string; quizId: string }> }) {
  const { slug, quizId } = await ctx.params
  const auth = await requireOrgOwnerOrAdmin(slug)
  let actorMemberId = "unknown"
  let actorName = "unknown"
  if (!auth.ok) {
    const session = await requireOrgSession(slug)
    if (!session.ok) return NextResponse.json({ ok: false, error: session.error }, { status: session.status })
    if (session.session.role !== "teacher") return NextResponse.json({ ok: false, error: "Only owner/admin/teacher can update quizzes" }, { status: 403 })
    actorMemberId = session.session.memberId
    actorName = session.session.memberName
  } else {
    actorMemberId = auth.session.memberId
    actorName = auth.session.memberName
  }
  const org = await findOrgBySlug(slug)
  if (!org) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  const updated = await updateOrgQuiz(org.id, quizId, {
    published: typeof body.published === "boolean" ? body.published : undefined,
    archived: typeof body.archived === "boolean" ? body.archived : undefined,
    archivedAt: body.archived === true ? new Date().toISOString() : body.archived === false ? undefined : undefined
  })
  if (!updated) return NextResponse.json({ ok: false, error: "Quiz not found" }, { status: 404 })

  await logOrgAuditEvent({
    orgId: org.id,
    actorMemberId,
    actorName,
    action: "quiz_updated",
    targetType: "quiz",
    targetId: quizId,
    detail: `published=${String(updated.published)} archived=${String(updated.archived)}`
  })
  return NextResponse.json({ ok: true, data: updated })
}
