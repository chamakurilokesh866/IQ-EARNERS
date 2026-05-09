import { NextResponse } from "next/server"
import { requireOrgOwnerOrAdmin, requireOrgSession } from "@/lib/orgAuth"
import { chatCompletion, isAiConfigured } from "@/lib/aiGateway"
import { dedupeByQuestionStem } from "@/lib/quizQuestionDedupe"

type Question = { question: string; options: string[]; correct: number; explanation?: string }

function safeParseQuestions(raw: string): Question[] {
  let text = raw.trim()
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (match) text = match[1].trim()
  const parsed = JSON.parse(text) as { questions?: Question[] }
  if (!Array.isArray(parsed.questions)) return []
  return parsed.questions
    .map((q) => ({
      question: String(q.question ?? "").trim(),
      options: Array.isArray(q.options) ? q.options.map((o) => String(o ?? "").trim()).filter(Boolean) : [],
      correct: Number(q.correct ?? 0),
      explanation: typeof q.explanation === "string" ? q.explanation.trim() : undefined,
    }))
    .filter((q) => q.question && q.options.length === 4 && q.correct >= 0 && q.correct <= 3)
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const adminAuth = await requireOrgOwnerOrAdmin(slug)
  if (!adminAuth.ok) {
    const session = await requireOrgSession(slug)
    if (!session.ok) return NextResponse.json({ ok: false, error: session.error }, { status: session.status })
    if (session.session.role !== "teacher") {
      return NextResponse.json({ ok: false, error: "Only owner/admin/teacher can generate quizzes" }, { status: 403 })
    }
  }
  if (!isAiConfigured()) {
    return NextResponse.json({ ok: false, error: "AI is not configured on server" }, { status: 503 })
  }

  const body = await req.json().catch(() => ({}))
  const title = String(body?.title ?? "").trim()
  const category = String(body?.category ?? "General").trim()
  const quizType = String(body?.quizType ?? "practice").trim()
  const difficulty = ["Easy", "Medium", "Hard"].includes(String(body?.difficulty)) ? String(body.difficulty) : "Medium"
  const count = Math.max(1, Math.min(30, Number(body?.count) || 10))

  const prompt = `Generate exactly ${count} MCQ questions in JSON.
Quiz Title: ${title || "Untitled"}
Quiz Type: ${quizType}
Category: ${category}
Difficulty: ${difficulty}

Each question must be unique — no duplicates or trivial rewordings of the same fact.

Return only valid JSON:
{
  "questions": [
    { "question": "...", "options": ["A","B","C","D"], "correct": 0, "explanation": "..." }
  ]
}`

  const result = await chatCompletion(
    [
      { role: "system", content: "You generate educational MCQs. Return only valid JSON." },
      { role: "user", content: prompt },
    ],
    { temperature: 0.2, max_tokens: 4096 }
  )
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status })

  try {
    const parsed = safeParseQuestions(result.content)
    const questions = dedupeByQuestionStem(parsed, new Set())
    if (!questions.length) {
      return NextResponse.json({ ok: false, error: "AI returned invalid questions format. Try again." }, { status: 502 })
    }
    return NextResponse.json({ ok: true, data: { questions, count: questions.length } })
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to parse AI response. Try again." }, { status: 502 })
  }
}
