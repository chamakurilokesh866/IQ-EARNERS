import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { chatCompletion } from "@/lib/aiGateway"
import { dedupeByQuestionStem } from "@/lib/quizQuestionDedupe"

export const maxDuration = 60

/** POST: Parse raw text with AI to extract quiz questions. Used when regex parsing fails. */
export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  const body = await req.json().catch(() => ({}))
  const rawText = typeof body?.text === "string" ? body.text.trim() : ""
  if (!rawText || rawText.length > 50000) {
    return NextResponse.json({ ok: false, error: "Text required (max 50k chars)" }, { status: 400 })
  }

  const prompt = `You are a quiz parser. Extract quiz questions from the following raw text.
Output a valid JSON array only, no markdown or explanation. Each item must have:
- "question": string (the question text)
- "options": string[] (2-4 answer options)
- "correct": number (0-based index of correct option)
- "category": string (optional, default "General")
- "difficulty": "Easy"|"Medium"|"Hard" (optional)
- "explanation": string (optional)

Example format: [{"question":"What is 2+2?","options":["3","4","5","6"],"correct":1,"category":"Math","difficulty":"Easy"}]

Raw text to parse:
${rawText.slice(0, 45000)}`

  const result = await chatCompletion(
    [
      {
        role: "system",
        content:
          "You output only valid JSON arrays. No markdown fences, no commentary. Each object must have question, options (2-4 strings), correct (0-based index). Prefer 4 options; distractors must be distinct and wrong.",
      },
      { role: "user", content: prompt },
    ],
    { temperature: 0.2, max_tokens: 8192 }
  )

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error ?? "AI parsing failed" }, { status: 500 })
  }

  let parsed: unknown
  try {
    let content = (result as { content: string }).content.trim()
    content = content.replace(/^```(?:json)?\s*|\s*```$/g, "").trim()
    parsed = JSON.parse(content)
  } catch {
    return NextResponse.json({ ok: false, error: "AI returned invalid JSON" }, { status: 500 })
  }

  const arr = Array.isArray(parsed) ? parsed : []
  const questions = arr
    .filter((q: unknown) => q && typeof q === "object" && typeof (q as any).question === "string" && Array.isArray((q as any).options))
    .map((q: any) => ({
      question: String(q.question || "").trim(),
      options: (q.options || []).map(String).filter(Boolean),
      correct: Math.max(0, Math.min(((q.options || []).length - 1), Number(q.correct) || 0)),
      category: typeof q.category === "string" ? q.category : "General",
      difficulty: ["Easy", "Medium", "Hard"].includes(q.difficulty) ? q.difficulty : "Medium",
      explanation: typeof q.explanation === "string" ? q.explanation : undefined
    }))
    .filter((q) => q.question && q.options.length >= 2)

  const unique = dedupeByQuestionStem(questions, new Set())

  return NextResponse.json({ ok: true, questions: unique })
}
