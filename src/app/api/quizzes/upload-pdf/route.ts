import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase"
import { requireAdmin } from "@/lib/auth"
import { addQuiz, getQuizById, updateQuiz } from "@/lib/quizzes"
import { parseQuizFromText } from "@/lib/parseQuizPdf"
import { promises as fs } from "fs"
import path from "path"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BUCKET = "uploads"
const STORAGE_PATH = "quizzes"
const UPLOADS = path.join(process.cwd(), "src", "data", "uploads")
const QUIZZES_FILE = path.join(process.cwd(), "src", "data", "quizzes.json")
const LANG_CODES = ["en", "hi", "es", "mr", "ta", "te"]

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ ok: false, error: "form-data required" }, { status: 400 })

  const file = form.get("file")
  const title = String(form.get("title") ?? "Uploaded Quiz").trim() || "Uploaded Quiz"
  const language = String(form.get("language") ?? "en").toLowerCase()
  const quizId = form.get("quizId") ? String(form.get("quizId")).trim() : null
  const lang = LANG_CODES.includes(language) ? language : "en"

  if (!file || !(file instanceof File)) return NextResponse.json({ ok: false, error: "file required" }, { status: 400 })
  const isPdf = file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf")
  if (!isPdf) return NextResponse.json({ ok: false, error: "PDF required" }, { status: 400 })

  const id = quizId || String(Date.now())
  const buf = Buffer.from(await file.arrayBuffer())

  let questions: { question: string; options: string[]; correct: number; category?: string; difficulty?: string; explanation?: string }[] = []
  try {
    const { PDFParse } = await import("pdf-parse")
    const parser = new PDFParse({ data: buf })
    try {
      const result = await parser.getText()
      const text = result?.text ?? ""
      if (text) questions = parseQuizFromText(text)
    } finally {
      await parser.destroy()
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: `PDF parsing failed: ${msg}` }, { status: 400 })
  }

  if (quizId) {
    const existing = await getQuizById(quizId)
    if (!existing) return NextResponse.json({ ok: false, error: "Quiz not found" }, { status: 404 })
    const byLang = { ...(existing.questionsByLanguage || {}) }
    byLang[lang] = questions.length > 0 ? questions : (existing.questionsByLanguage?.[lang] ?? [])
    const langs = [...new Set([...(existing.languages ?? []), lang])]
    const ok = await updateQuiz(quizId, { questionsByLanguage: byLang, languages: langs })
    if (!ok) return NextResponse.json({ ok: false, error: "Failed to update quiz" }, { status: 500 })
    return NextResponse.json({ ok: true, id: quizId, updated: true })
  }

  const questionsByLanguage: Record<string, typeof questions> = { [lang]: questions }
  const languagesList = [lang]

  const supabase = createServerSupabase()
  if (supabase) {
    let sourceUrl = ""
    let storageError: string | null = null
    try {
      const filename = `${id}.pdf`
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(`${STORAGE_PATH}/${filename}`, buf, { contentType: "application/pdf", upsert: true })
      if (uploadError) {
        storageError = uploadError.message
      } else {
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(`${STORAGE_PATH}/${filename}`)
        sourceUrl = urlData?.publicUrl ?? ""
      }
    } catch (e: unknown) {
      storageError = e instanceof Error ? e.message : String(e)
    }
    const ok = await addQuiz({
      id,
      title,
      source_url: sourceUrl,
      questions: questions.length > 0 ? questions : [],
      questionsByLanguage,
      languages: languagesList
    })
    if (!ok) return NextResponse.json({ ok: false, error: "Failed to save quiz to database" }, { status: 500 })
    if (storageError) {
      return NextResponse.json({ ok: true, id, warning: `Quiz saved but PDF storage failed: ${storageError}. Create an "uploads" bucket in Supabase Storage (Dashboard → Storage) and run the storage policies in supabase-setup.sql.` })
    }
    return NextResponse.json({ ok: true, id })
  }

  try {
    const dataDir = path.dirname(QUIZZES_FILE)
    await fs.mkdir(dataDir, { recursive: true })
    await fs.mkdir(UPLOADS, { recursive: true })
    const dest = path.join(UPLOADS, `${id}.pdf`)
    await fs.writeFile(dest, buf)
    const quizToAdd = {
      id,
      title,
      sourceFile: `src/data/uploads/${id}.pdf`,
      source_url: "",
      questions: questions.length > 0 ? questions : [],
      questionsByLanguage,
      languages: languagesList
    }
    const ok = await addQuiz(quizToAdd)
    if (!ok) return NextResponse.json({ ok: false, error: "Failed to save quiz" }, { status: 500 })
    return NextResponse.json({ ok: true, id })
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: (e as Error).message || "Upload failed" }, { status: 500 })
  }
}
