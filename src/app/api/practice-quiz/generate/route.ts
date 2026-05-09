/**
 * Public API: Generate 5 simple practice quiz questions via AI.
 * No admin auth required — lightweight and rate-limited for the intro page.
 */
import { NextResponse } from "next/server"
import { chatCompletion, isAiConfigured } from "@/lib/aiGateway"

type PracticeQuestion = {
  question: string
  options: string[]
  correct: number
  explanation?: string
}

const TOPICS = [
  "General Knowledge",
  "Famous Inventions",
  "World Geography",
  "Basic Science",
  "Famous People & History",
  "Common English Vocabulary",
  "Simple Mathematics & Logic",
  "Countries & Capitals",
  "Animals & Nature",
  "Sports & Games",
  "Food & Nutrition",
  "Space & Planets"
]

/** Simple in-memory rate limiter: max 3 requests per minute per IP */
const rateLimitMap = new Map<string, { count: number; windowStart: number }>()
const RATE_LIMIT_WINDOW = 60_000
const RATE_LIMIT_MAX = 3
const DEBUG_PRACTICE_QUIZ_ANSWERS =
  process.env.NODE_ENV !== "production" &&
  process.env.DEBUG_PRACTICE_QUIZ_ANSWERS === "1"

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, windowStart: now })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

function extractJson(text: string): PracticeQuestion[] | null {
  let trimmed = text.trim()
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) trimmed = codeBlockMatch[1].trim()
  trimmed = trimmed.replace(/^[\s\uFEFF]*/, "").replace(/[\s\uFEFF]*$/, "")

  const tryParse = (jsonStr: string): unknown => {
    const s = jsonStr.replace(/,(\s*[}\]])/g, "$1")
    try { return JSON.parse(s) } catch { return null }
  }

  // Try parsing whole object
  const objStart = trimmed.indexOf("{")
  if (objStart !== -1) {
    const end = trimmed.lastIndexOf("}") + 1
    if (end > objStart) {
      const parsed = tryParse(trimmed.slice(objStart, end)) as { questions?: PracticeQuestion[] } | null
      if (parsed?.questions && Array.isArray(parsed.questions)) {
        return parsed.questions
      }
    }
  }

  // Try parsing as array
  const arrStart = trimmed.indexOf("[")
  if (arrStart !== -1) {
    const end = trimmed.lastIndexOf("]") + 1
    if (end > arrStart) {
      const parsed = tryParse(trimmed.slice(arrStart, end)) as PracticeQuestion[] | null
      if (Array.isArray(parsed)) return parsed
    }
  }

  return null
}

function normalizeQuestions(raw: PracticeQuestion[]): PracticeQuestion[] {
  const rawCorrectValues = raw
    .map((q) => Number((q as { correct?: unknown })?.correct))
    .filter((n) => Number.isFinite(n))
  // If model returns only 1..4 (and never 0), treat as 1-indexed.
  const likelyOneIndexed =
    rawCorrectValues.length > 0 &&
    rawCorrectValues.every((n) => n >= 1 && n <= 4) &&
    !rawCorrectValues.includes(0)

  return raw
    .map((q) => {
      const question = String(q?.question ?? "").trim()
      const opts = Array.isArray(q?.options)
        ? q.options.map(String).map(s => s.trim()).filter(Boolean)
        : []
      let correct = Number(q?.correct ?? 0)
      if (!Number.isFinite(correct)) correct = 0
      // Accept letter answers if model returns A/B/C/D.
      const rawCorrect = String((q as { correct?: unknown })?.correct ?? "").trim().toUpperCase()
      if (["A", "B", "C", "D"].includes(rawCorrect)) {
        correct = "ABCD".indexOf(rawCorrect)
      } else if (likelyOneIndexed && correct >= 1 && correct <= 4 && opts.length === 4) {
        correct -= 1
      }
      correct = Math.max(0, Math.min(opts.length - 1, correct))
      const explanation = typeof q?.explanation === "string" ? q.explanation.trim() : undefined
      return { question, options: opts, correct, explanation }
    })
    .filter((q) => q.question && q.options.length === 4)
}

export async function POST(req: Request) {
  // Rate-limit by IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown"

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please wait a minute." },
      { status: 429 }
    )
  }

  if (!isAiConfigured()) {
    return NextResponse.json(
      { ok: false, error: "AI is not configured on this server." },
      { status: 503 }
    )
  }

  // Pick a random topic
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)]

  const body = await req.json().catch(() => ({})) as { category?: string }
  const userTopic = typeof body?.category === "string" && body.category.trim()
    ? body.category.trim()
    : topic

  const prompt = `TASK: Generate exactly 5 simple, fun, and easy multiple-choice quiz questions.
TOPIC: ${userTopic}
DIFFICULTY: Very Easy — suitable for anyone with basic general knowledge. Questions should feel like a fun trivia game, NOT an exam.

JSON STRUCTURE:
{
  "questions": [
    { "question": "...", "options": ["...", "...", "...", "..."], "correct": 0, "explanation": "..." }
  ]
}

CRITICAL RULES:
1. Output ONLY valid raw JSON. No text, markdown, or explanation outside the JSON.
2. Exactly 5 questions with 4 options each.
3. Questions must be SHORT (max 15 words), simple, and fun.
4. Options must be SHORT (max 5 words each).
5. Include a brief 1-sentence explanation for the correct answer.
6. "correct" is 0-indexed (0 = first option, 3 = last option).
7. All questions must be DIFFERENT — no duplicates.
8. Make questions that feel fun and easy, like a warm-up trivia game.`

  try {
    const result = await chatCompletion(
      [
        { role: "system", content: "Fun quiz generator. Output ONLY valid JSON. Start with { end with }." },
        { role: "user", content: prompt }
      ],
      { temperature: 0.8, max_tokens: 2048 }
    )

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 502 })
    }

    const parsed = extractJson(result.content)
    if (!parsed) {
      return NextResponse.json(
        { ok: false, error: "AI returned invalid format. Please try again." },
        { status: 502 }
      )
    }

    const questions = normalizeQuestions(parsed).slice(0, 5)
    if (questions.length < 3) {
      return NextResponse.json(
        { ok: false, error: "AI returned too few valid questions. Please try again." },
        { status: 502 }
      )
    }

    if (DEBUG_PRACTICE_QUIZ_ANSWERS) {
      console.info("[practice-quiz] normalized questions", {
        topic: userTopic,
        total: questions.length,
        questions: questions.map((q, idx) => ({
          index: idx,
          question: q.question,
          options: q.options,
          correctIndex: q.correct,
          correctOption: q.options[q.correct] ?? null,
        })),
      })
    }

    return NextResponse.json({
      ok: true,
      questions,
      topic: userTopic,
      count: questions.length
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
