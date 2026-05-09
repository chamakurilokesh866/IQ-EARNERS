/**
 * Shared parsing for PDF / Excel / JSON / CSV → normalized quiz questions.
 * Used by upload-tournament, POST /api/quizzes, and admin parse-file.
 */
import { parseQuizFromText } from "@/lib/parseQuizPdf"
import { parseExcelToQuestions } from "@/lib/parseExcelQuiz"
import type { QuizQuestion } from "@/lib/quizzes"

function normalizeQuestions(
  raw: { question: string; options: string[]; correct: number; category?: string; difficulty?: string; explanation?: string }[]
): QuizQuestion[] {
  return raw
    .map((q) => ({
      question: String(q.question || "").trim(),
      options: (q.options || []).map(String).filter(Boolean),
      correct: Math.max(0, Math.min(((q.options || []).length - 1), Number(q.correct) || 0)),
      category: typeof q.category === "string" ? q.category : "General",
      difficulty: ["Easy", "Medium", "Hard"].includes(q.difficulty ?? "") ? q.difficulty : "Medium",
      explanation: typeof q.explanation === "string" ? q.explanation : undefined,
    }))
    .filter((q) => q.question && q.options.length >= 2)
}

const AI_SYSTEM = `You are a precise quiz extraction engine. Output ONLY a valid JSON array. No markdown fences, no commentary.
Each element must be: {"question":string,"options":["A","B","C","D"],"correct":number} where correct is 0-based index.
Prefer exactly 4 options when possible. Questions must be self-contained and unambiguous.`

async function extractQuestionsWithAi(rawText: string): Promise<QuizQuestion[]> {
  const { chatCompletion } = await import("@/lib/aiGateway")
  const trimmed = rawText.slice(0, 45000)
  const user = `Extract every distinct multiple-choice question from the text below.
Rules:
- Skip instructions, page headers, and answer keys that are not formatted as questions.
- If correct answers are marked (e.g. "Ans: B" or "(2)"), map them to 0-based index in "correct".
- Merge continuation lines into a single question stem.
- Deduplicate near-identical questions.

TEXT:
${trimmed}`

  const result = await chatCompletion(
    [{ role: "system", content: AI_SYSTEM }, { role: "user", content: user }],
    { temperature: 0.15, max_tokens: 8192 }
  )
  if (!result.ok || typeof (result as { content?: string }).content !== "string") return []
  let content = (result as { content: string }).content.trim().replace(/^```(?:json)?\s*|\s*```$/g, "").trim()
  try {
    const parsed = JSON.parse(content)
    const arr = Array.isArray(parsed) ? parsed : []
    return normalizeQuestions(
      arr
        .filter((q: unknown) => q && typeof q === "object" && Array.isArray((q as { options?: unknown }).options))
        .map((q: { question?: string; options?: string[]; correct?: number; category?: string; difficulty?: string }) => ({
          question: String(q.question || "").trim(),
          options: (q.options || []).map(String).filter(Boolean),
          correct: Math.max(0, Math.min((q.options?.length ?? 1) - 1, Number(q.correct) || 0)),
          category: typeof q.category === "string" ? q.category : "General",
          difficulty: typeof q.difficulty === "string" ? q.difficulty : "Medium",
        }))
    )
  } catch {
    return []
  }
}

export type ImportFromBufferResult =
  | { ok: true; questions: QuizQuestion[] }
  | { ok: false; error: string }

/**
 * Parse quiz questions from an uploaded file buffer (PDF, xlsx, json, csv).
 */
export async function importQuestionsFromBuffer(
  buf: Buffer,
  filename: string,
  opts?: { useAiFallback?: boolean }
): Promise<ImportFromBufferResult> {
  const name = filename.toLowerCase()
  const useAiFallback = opts?.useAiFallback !== false
  let questions: QuizQuestion[] = []

  if (name.endsWith(".pdf")) {
    const { PDFParse } = await import("pdf-parse")
    const parser = new PDFParse({ data: buf })
    let text = ""
    try {
      const result = await parser.getText()
      text = result?.text ?? ""
    } finally {
      await parser.destroy()
    }
    if (!text.trim()) return { ok: false, error: "PDF has no extractable text" }
    questions = normalizeQuestions(parseQuizFromText(text) as QuizQuestion[])
    if (questions.length < 3 && useAiFallback) {
      const aiQs = await extractQuestionsWithAi(text)
      if (aiQs.length > questions.length) questions = aiQs
    }
  } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    questions = normalizeQuestions(parseExcelToQuestions(buf) as QuizQuestion[])
  } else if (name.endsWith(".json")) {
    const text = buf.toString("utf-8")
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) {
        const first = parsed[0]
        if (first?.questions && Array.isArray(first.questions)) {
          questions = normalizeQuestions(first.questions)
        } else {
          questions = normalizeQuestions(parsed)
        }
      } else if (parsed?.questions && Array.isArray(parsed.questions)) {
        questions = normalizeQuestions(parsed.questions)
      } else if (Array.isArray(parsed?.quizzes)) {
        for (const q of parsed.quizzes) {
          if (Array.isArray(q?.questions)) questions = questions.concat(normalizeQuestions(q.questions))
        }
      }
    } catch {
      return { ok: false, error: "Invalid JSON" }
    }
  } else if (name.endsWith(".csv")) {
    const { parseCSV, rowToQuestion } = await import("@/utils/csv")
    const text = buf.toString("utf-8")
    const rows = parseCSV(text)
    questions = normalizeQuestions(rows.map((r) => rowToQuestion(r)).filter((q) => q.question && q.options.length >= 2) as QuizQuestion[])
  } else {
    return { ok: false, error: "Unsupported format. Use PDF, Excel (.xlsx/.xls), JSON, or CSV." }
  }

  const normalized = normalizeQuestions(questions)
  if (normalized.length === 0) return { ok: false, error: "No valid questions found" }
  return { ok: true, questions: normalized }
}
