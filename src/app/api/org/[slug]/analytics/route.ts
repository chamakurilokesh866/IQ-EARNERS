import { NextResponse } from "next/server"
import { requireOrgSession } from "@/lib/orgAuth"
import { findOrgBySlug, listOrgAttempts, listOrgQuizzes } from "@/lib/enterpriseStore"

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const auth = await requireOrgSession(slug)
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  if (!["owner", "admin", "teacher"].includes(auth.session.role)) {
    return NextResponse.json({ ok: false, error: "Only owner/admin/teacher can view analytics" }, { status: 403 })
  }
  const org = await findOrgBySlug(slug)
  if (!org) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })

  const [attempts, quizzes] = await Promise.all([
    listOrgAttempts(org.id),
    listOrgQuizzes(org.id)
  ])

  const attemptsCount = attempts.length
  const avgScorePct = attemptsCount
    ? Math.round((attempts.reduce((s, a) => s + (a.total > 0 ? (a.score / a.total) * 100 : 0), 0) / attemptsCount) * 10) / 10
    : 0
  const avgTimeSeconds = attemptsCount
    ? Math.round((attempts.reduce((s, a) => s + (a.timeSeconds || 0), 0) / attemptsCount) * 10) / 10
    : 0

  const quizStats = quizzes.map((q) => {
    const qa = attempts.filter((a) => a.quizId === q.id)
    const completionCount = qa.length
    const average = completionCount
      ? Math.round((qa.reduce((s, a) => s + (a.total > 0 ? (a.score / a.total) * 100 : 0), 0) / completionCount) * 10) / 10
      : 0
    return {
      quizId: q.id,
      title: q.title,
      published: q.published,
      completionCount,
      averageScorePct: average
    }
  }).sort((a, b) => b.completionCount - a.completionCount)

  return NextResponse.json({
    ok: true,
    data: {
      totalQuizzes: quizzes.length,
      publishedQuizzes: quizzes.filter((q) => q.published).length,
      totalAttempts: attemptsCount,
      avgScorePct,
      avgTimeSeconds,
      quizStats
    }
  })
}

