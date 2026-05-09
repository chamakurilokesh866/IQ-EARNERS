import { NextResponse } from "next/server"
import { requireOrgSession, requireOrgOwnerOrAdmin } from "@/lib/orgAuth"
import { createOrgQuiz, listOrgQuizzes, findOrgBySlug, logOrgAuditEvent } from "@/lib/enterpriseStore"

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const auth = await requireOrgSession(slug)
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const org = await findOrgBySlug(slug)
  if (!org) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
  const quizzes = await listOrgQuizzes(org.id)
  const isOwnerOrAdmin = auth.session.role === "owner" || auth.session.role === "admin" || auth.session.role === "teacher"
  const visible = isOwnerOrAdmin ? quizzes : quizzes.filter((q) => q.published && !q.archived)
  const safe = visible.map(({ questions, ...q }) => ({ ...q, questionCount: questions.length }))
  return NextResponse.json({ ok: true, data: safe })
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const auth = await requireOrgOwnerOrAdmin(slug)
  let actorMemberId = "unknown"
  let actorName = "unknown"
  if (!auth.ok) {
    const session = await requireOrgSession(slug)
    if (!session.ok) return NextResponse.json({ ok: false, error: session.error }, { status: session.status })
    if (session.session.role !== "teacher") return NextResponse.json({ ok: false, error: "Only owner/admin/teacher can create quizzes" }, { status: 403 })
    actorMemberId = session.session.memberId
    actorName = session.session.memberName
  } else {
    actorMemberId = auth.session.memberId
    actorName = auth.session.memberName
  }
  const org = await findOrgBySlug(slug)
  if (!org) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  const quiz = await createOrgQuiz(org.id, {
    title: String(body.title ?? "").trim() || "Untitled Quiz",
    description: body.description?.trim() || undefined,
    quizType: ["practice", "exam", "speed", "revision", "assignment", "current_affairs"].includes(String(body.quizType))
      ? body.quizType
      : "practice",
    category: body.category?.trim() || "General",
    difficulty: ["Easy", "Medium", "Hard"].includes(body.difficulty) ? body.difficulty : "Medium",
    questions: Array.isArray(body.questions) ? body.questions : [],
    createdBy: actorMemberId,
    published: body.published === true,
    timePerQuestion: typeof body.timePerQuestion === "number" ? body.timePerQuestion : undefined,
    scheduledAt: body.scheduledAt || undefined,
  })
  if (!quiz) return NextResponse.json({ ok: false, error: "Could not create quiz (plan limit reached)" }, { status: 400 })
  await logOrgAuditEvent({
    orgId: org.id,
    actorMemberId,
    actorName,
    action: "quiz_created",
    targetType: "quiz",
    targetId: quiz.id,
    detail: `${quiz.title} (${quiz.questions.length} questions)`
  })
  return NextResponse.json({ ok: true, data: quiz })
}
