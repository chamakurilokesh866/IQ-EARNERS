import { NextResponse } from "next/server"
import { getQuizzes } from "@/lib/quizzes"

const NEW_QUIZ_DAYS = 7

export async function GET() {
  try {
    const quizzes = await getQuizzes()
    const cutoff = Date.now() - NEW_QUIZ_DAYS * 24 * 60 * 60 * 1000
    const inRange = quizzes.filter((q) => (q.created_at ?? 0) >= cutoff)
    const newest = inRange.length ? inRange.reduce((a, b) => ((a.created_at ?? 0) >= (b.created_at ?? 0) ? a : b)) : null
    if (!newest) {
      return NextResponse.json({ ok: true, data: null }, {
        headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=30" }
      })
    }
    const questionCount = newest.questions?.length
      ?? newest.questionsMultiLang?.length
      ?? (newest.questionsByLanguage && typeof newest.questionsByLanguage === "object"
        ? Object.values(newest.questionsByLanguage).reduce((s: number, arr: unknown) => s + (Array.isArray(arr) ? arr.length : 0), 0)
        : 0)
    return NextResponse.json({
      ok: true,
      data: {
        id: newest.id,
        title: newest.title,
        questionCount,
        created_at: newest.created_at
      }
    }, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=30" }
    })
  } catch {
    return NextResponse.json({ ok: true, data: null }, { headers: { "Cache-Control": "no-store" } })
  }
}
