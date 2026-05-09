/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getSettings, updateSettings } from "@/lib/settings"
import { chatCompletion, isAiConfigured } from "@/lib/aiGateway"
import { addQuiz, getQuizzes, generateQuizCode, generateQuizToken } from "@/lib/quizzes"

function getTodayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function normalizeStem(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim()
}

function sanitizeMultiLang(
  rows: any[],
  languages: string[],
  existingStems: Set<string>
): { translations: Record<string, { question: string; options: string[]; correct: number; explanation?: string }> }[] {
  const seen = new Set<string>()
  const clean: { translations: Record<string, { question: string; options: string[]; correct: number; explanation?: string }> }[] = []
  for (const row of rows || []) {
    const trans = row?.translations && typeof row.translations === "object" ? row.translations : {}
    const out: Record<string, { question: string; options: string[]; correct: number; explanation?: string }> = {}
    let valid = true
    for (const lang of languages) {
      const t = trans[lang]
      const q = String(t?.question ?? "").trim()
      const options: string[] = Array.from(
        new Set((Array.isArray(t?.options) ? t.options : []).map((x: unknown) => String(x).trim()).filter(Boolean))
      )
      const correct = Number(t?.correct)
      if (!q || options.length !== 4 || !Number.isFinite(correct) || correct < 0 || correct > 3) {
        valid = false
        break
      }
      out[lang] = {
        question: q,
        options,
        correct,
        explanation: typeof t?.explanation === "string" ? t.explanation.trim() : undefined
      }
    }
    if (!valid) continue
    const pivot = out.en?.question ?? out[languages[0]]?.question ?? ""
    const stem = normalizeStem(pivot)
    if (!stem || seen.has(stem) || existingStems.has(stem)) continue
    seen.add(stem)
    clean.push({ translations: out })
  }
  return clean
}

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  if (!isAiConfigured()) {
    return NextResponse.json({ ok: false, error: "AI not configured." }, { status: 503 })
  }

  const settings = await getSettings()
  const lastGen = settings?.lastAiQuizDate
  const today = getTodayLocal()

  // Prevent double generation for today if requested via auto-trigger
  const body = await req.json().catch(() => ({}))
  if (body?.force !== true && lastGen === today) {
    return NextResponse.json({ ok: true, message: "Quiz already generated for today." })
  }

  const topic = body?.topic || settings?.aiDailyTopic || "General Knowledge, Current Affairs, Science, History"
  const count = Number(body?.count) || 10
  const audienceSegment =
    typeof body?.audienceSegment === "string" && ["general", "school"].includes(body.audienceSegment)
      ? body.audienceSegment
      : "general"
  const schoolClass =
    typeof body?.schoolClass === "string" && /^(?:[1-9]|1[0-2])$/.test(body.schoolClass.trim())
      ? body.schoolClass.trim()
      : undefined
  const languages = Array.isArray(body?.languages) ? body.languages : ["en", "hi", "te", "ta", "mr", "gu", "kn", "ml", "bn"]

  // Build the prompt (simplified version of the one in generate-questions)
  const langMap: Record<string, string> = {
    en: "English", hi: "Hindi", te: "Telugu", ta: "Tamil", mr: "Marathi",
    gu: "Gujarati", kn: "Kannada", ml: "Malayalam", bn: "Bengali"
  }
  const langNames = languages.map((l: string) => langMap[l] || l).join(", ")

  const previous = await getQuizzes()
  const existingStems = new Set<string>()
  for (const quiz of previous.slice(0, 40)) {
    for (const mq of quiz.questionsMultiLang ?? []) {
      const t = mq?.translations?.en || Object.values(mq?.translations ?? {})[0]
      if (t && typeof t.question === "string") existingStems.add(normalizeStem(t.question))
    }
    for (const q of quiz.questions ?? []) {
      if (q?.question) existingStems.add(normalizeStem(String(q.question)))
    }
  }

  const avoidList = Array.from(existingStems).slice(0, 30).map((s) => `- ${s}`).join("\n")
  const prompt = `TASK: Generate exactly ${count} educational MCQ questions for a daily quiz.
LANGUAGES: ${langNames} (${languages.join(", ")})
TOPIC: ${topic}
STRICT QUALITY:
- Every question must be unique and not paraphrase another.
- Each question must have exactly 4 distinct options.
- "correct" must be 0..3 and must point to the factually right option.
- Audience: ${audienceSegment === "school" ? `School students${schoolClass ? `, Class ${schoolClass}` : ""}` : "General learners"}.
- Keep language and complexity suitable to the selected audience.
- Avoid these already-used question stems:
${avoidList || "- none"}
JSON STRUCTURE:
{
  "languages": ["en", ...],
  "questionsMultiLang": [
    {
      "translations": {
        "en": { "question": "...", "options": ["...", "...", "...", "..."], "correct": 0, "explanation": "..." },
        ...
      }
    }
  ]
}
Output ONLY valid raw JSON.`

  try {
    const result = await chatCompletion(
      [{ role: "system", content: "Quiz generator. Output ONLY valid JSON." }, { role: "user", content: prompt }],
      { temperature: 0.1, max_tokens: 8000 }
    )

    if (!result.ok) throw new Error(result.error)
    
    // Extract JSON (simple version)
    let content = result.content.trim()
    if (content.startsWith("```json")) content = content.slice(7, -3).trim()
    else if (content.startsWith("```")) content = content.slice(3, -3).trim()
    const parsed = JSON.parse(content)

    if (!parsed.questionsMultiLang?.length) throw new Error("No questions generated.")
    const sanitized = sanitizeMultiLang(parsed.questionsMultiLang, parsed.languages || languages, existingStems)
    if (sanitized.length < Math.max(5, Math.ceil(count * 0.7))) {
      throw new Error("AI produced repeated/invalid questions. Retry with a narrower topic.")
    }

    const newQuiz = {
      id: `ai-dq-${today}-${Date.now()}`,
      title: `Daily Quiz - ${today}`,
      questions: [],
      questionsMultiLang: sanitized.slice(0, count),
      languages: parsed.languages || languages,
      quiz_type: "daily" as const,
      created_at: Date.now(),
      code: generateQuizCode(),
      token: generateQuizToken()
    }

    const saveResult = await addQuiz(newQuiz)
    if (!saveResult.ok) throw new Error(saveResult.error)

    await updateSettings({ lastAiQuizDate: today })

    return NextResponse.json({ ok: true, quizId: newQuiz.id })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
