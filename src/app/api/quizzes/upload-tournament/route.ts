import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { addQuiz } from "@/lib/quizzes"
import { importQuestionsFromBuffer } from "@/lib/importQuizFromBuffer"
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

/** POST: Upload PDF, Excel, or JSON with questions. AI parses when regex fails for PDF.
 * Also accepts JSON body with pdfUrl (when AI fails, upload PDF to Supabase and paste URL).
 * Form fields: file, title, quiz_type = "daily" | "tournament" (default tournament). */
export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  const contentType = req.headers.get("content-type") || ""
  let name = ""
  let buf: Buffer
  let title = "Tournament Quiz"
  let quizType: "daily" | "tournament" = "tournament"

  let sourcePdfUrl = "" // When provided via JSON, use as source_url (PDF already in storage)
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null)
    const pdfUrl = body?.pdfUrl
    if (!pdfUrl || typeof pdfUrl !== "string") return NextResponse.json({ ok: false, error: "pdfUrl required in JSON body" }, { status: 400 })
    sourcePdfUrl = String(pdfUrl).trim()
    title = String(body?.title ?? "Tournament Quiz").trim() || "Tournament Quiz"
    const qt = String(body?.quiz_type ?? "tournament").toLowerCase()
    quizType = qt === "daily" ? "daily" : "tournament"
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
    const qt = String(form.get("quiz_type") ?? "tournament").toLowerCase()
    quizType = qt === "daily" ? "daily" : "tournament"
  }

  const parsed = await importQuestionsFromBuffer(buf, name || "upload.bin", { useAiFallback: true })
  if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 })
  const normalized = parsed.questions

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
      quiz_type: quizType
    })
    if (!result.ok) return NextResponse.json({ ok: false, error: "Failed to save quiz" }, { status: 500 })
    return NextResponse.json({ ok: true, id, count: shuffled.length, quiz_type: quizType })
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
      quiz_type: quizType
    })
    if (!result.ok) return NextResponse.json({ ok: false, error: "Failed to save quiz" }, { status: 500 })
    return NextResponse.json({ ok: true, id, count: shuffled.length, quiz_type: quizType })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
