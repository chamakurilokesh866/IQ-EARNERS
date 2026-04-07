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
  const languages = Array.isArray(body?.languages) ? body.languages : ["en", "hi", "te", "ta", "mr", "gu", "kn", "ml", "bn"]

  // Build the prompt (simplified version of the one in generate-questions)
  const langMap: Record<string, string> = {
    en: "English", hi: "Hindi", te: "Telugu", ta: "Tamil", mr: "Marathi",
    gu: "Gujarati", kn: "Kannada", ml: "Malayalam", bn: "Bengali"
  }
  const langNames = languages.map((l: string) => langMap[l] || l).join(", ")

  const prompt = `TASK: Generate exactly ${count} educational MCQ questions for a daily quiz.
LANGUAGES: ${langNames} (${languages.join(", ")})
TOPIC: ${topic}
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

    const newQuiz = {
      id: `ai-dq-${today}-${Date.now()}`,
      title: `Daily Quiz - ${today}`,
      questions: [],
      questionsMultiLang: parsed.questionsMultiLang,
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
