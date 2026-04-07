import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { addQuiz } from "@/lib/quizzes"
import { parseQuizFromText } from "@/lib/parseQuizPdf"
import { parseExcelToQuestions } from "@/lib/parseExcelQuiz"
import { shuffleArray } from "@/lib/shuffleQuestions"
import { createServerSupabase } from "@/lib/supabase"
import { promises as fs } from "fs"
import path from "path"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const BUCKET = "uploads"
const STORAGE_PATH = "quizzes"
const UPLOADS = path.join(process.cwd(), "src", "data", "uploads")

function normalizeQuestions(raw: { question: string; options: string[]; correct: number; category?: string; difficulty?: string; explanation?: string }[]) {
  return raw.map((q) => ({
    question: String(q.question || "").trim(),
    options: (q.options || []).map(String).filter(Boolean),
    correct: Math.max(0, Math.min(((q.options || []).length - 1), Number(q.correct) || 0)),
    category: typeof q.category === "string" ? q.category : "General",
    difficulty: ["Easy", "Medium", "Hard"].includes(q.difficulty ?? "") ? q.difficulty : "Medium",
    explanation: typeof q.explanation === "string" ? q.explanation : undefined
  })).filter((q) => q.question && q.options.length >= 2)
}

/** POST: Upload PDF, Excel, or JSON with questions. AI parses when regex fails for PDF.
 * Also accepts JSON body with pdfUrl (when AI fails, upload PDF to Supabase and paste URL). */
export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  const contentType = req.headers.get("content-type") || ""
  let name = ""
  let buf: Buffer
  let title = "Tournament Quiz"
  const useAiFallback = true

  let sourcePdfUrl = "" // When provided via JSON, use as source_url (PDF already in storage)
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null)
    const pdfUrl = body?.pdfUrl
    if (!pdfUrl || typeof pdfUrl !== "string") return NextResponse.json({ ok: false, error: "pdfUrl required in JSON body" }, { status: 400 })
    sourcePdfUrl = String(pdfUrl).trim()
    title = String(body?.title ?? "Tournament Quiz").trim() || "Tournament Quiz"
    const res = await fetch(sourcePdfUrl)
    if (!res.ok) return NextResponse.json({ ok: false, error: "Could not fetch PDF from URL" }, { status: 400 })
    const arr = await res.arrayBuffer()
    buf = Buffer.from(arr)
    name = "upload.pdf"
  } else {
    const form = await req.formData().catch(() => null)
    if (!form) return NextResponse.json({ ok: false, error: "form-data or JSON with pdfUrl required" }, { status: 400 })
    const file = form.get("file")
    if (!file || !(file instanceof File)) return NextResponse.json({ ok: false, error: "file required" }, { status: 400 })
    name = (file.name || "").toLowerCase()
    buf = Buffer.from(await file.arrayBuffer())
    title = String(form.get("title") ?? file.name ?? "Tournament Quiz").trim() || "Tournament Quiz"
  }
  let questions: { question: string; options: string[]; correct: number; category?: string; difficulty?: string; explanation?: string }[] = []

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
    if (!text.trim()) return NextResponse.json({ ok: false, error: "PDF has no extractable text" }, { status: 400 })
    questions = parseQuizFromText(text)
    if (questions.length < 3 && useAiFallback) {
      try {
        const { chatCompletion } = await import("@/lib/aiGateway")
        const result = await chatCompletion([
          { role: "system", content: "You output only valid JSON arrays. No markdown, no explanation." },
          { role: "user", content: `Extract quiz questions from this text. Output JSON array: [{"question":"...","options":["a","b","c","d"],"correct":0}] Raw text:\n${text.slice(0, 40000)}` }
        ], { temperature: 0.2 })
        if (result.ok && typeof (result as any).content === "string") {
          let content = (result as any).content.trim().replace(/^```(?:json)?\s*|\s*```$/g, "").trim()
          try {
            const parsed = JSON.parse(content)
            const arr = Array.isArray(parsed) ? parsed : []
            const aiQuestions = arr
              .filter((q: any) => q?.question && Array.isArray(q?.options))
              .map((q: any) => ({
                question: String(q.question).trim(),
                options: q.options.map(String).filter(Boolean),
                correct: Math.max(0, Math.min(q.options.length - 1, Number(q.correct) || 0)),
                category: "General",
                difficulty: "Medium"
              }))
              .filter((q: any) => q.question && q.options.length >= 2)
            if (aiQuestions.length > questions.length) questions = aiQuestions
          } catch { }
        }
      } catch { }
    }
  } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    questions = parseExcelToQuestions(buf)
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
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
    }
  } else if (name.endsWith(".csv")) {
    const { parseCSV, rowToQuestion } = await import("@/utils/csv")
    const text = buf.toString("utf-8")
    const rows = parseCSV(text)
    questions = rows.map((r) => rowToQuestion(r)).filter((q) => q.question && q.options.length >= 2) as any
  } else {
    return NextResponse.json({ ok: false, error: "Unsupported format. Use PDF, Excel (.xlsx/.xls), JSON, or CSV." }, { status: 400 })
  }

  const normalized = normalizeQuestions(questions)
  if (normalized.length === 0) return NextResponse.json({ ok: false, error: "No valid questions found" }, { status: 400 })

  const shuffled = shuffleArray(normalized)
  const id = String(Date.now())

  const supabase = createServerSupabase()
  if (supabase) {
    let sourceUrl = sourcePdfUrl
    if (!sourceUrl && name.endsWith(".pdf")) {
      try {
        const filename = `${id}.pdf`
        await supabase.storage.from(BUCKET).upload(`${STORAGE_PATH}/${filename}`, buf, { contentType: "application/pdf", upsert: true })
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(`${STORAGE_PATH}/${filename}`)
        sourceUrl = data?.publicUrl ?? ""
      } catch { }
    }
    const result = await addQuiz({
      id,
      title,
      source_url: sourceUrl,
      questions: shuffled,
      quiz_type: "tournament"
    })
    if (!result.ok) return NextResponse.json({ ok: false, error: "Failed to save quiz" }, { status: 500 })
    return NextResponse.json({ ok: true, id, count: shuffled.length })
  }

  try {
    await fs.mkdir(UPLOADS, { recursive: true })
    if (name.endsWith(".pdf")) {
      await fs.writeFile(path.join(UPLOADS, `${id}.pdf`), buf)
    }
    const result = await addQuiz({
      id,
      title,
      source_url: name.endsWith(".pdf") ? `src/data/uploads/${id}.pdf` : "",
      questions: shuffled,
      quiz_type: "tournament"
    })
    if (!result.ok) return NextResponse.json({ ok: false, error: "Failed to save quiz" }, { status: 500 })
    return NextResponse.json({ ok: true, id, count: shuffled.length })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
