import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { chatCompletionForMockExam, isMockExamAiConfigured } from "@/lib/aiGateway"
import { createServerSupabase } from "@/lib/supabase"

const pdfParse = require("pdf-parse")

export const maxDuration = 300 // Vercel Pro allows 300s for large PDFs; Hobby caps at 60s
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const CHUNK_CHARS = 18000 // ~4.5k tokens per chunk for AI
const MAX_PDF_BYTES = 150 * 1024 * 1024 // 150MB - reject larger to avoid OOM

async function extractQuestionsFromChunk(text: string): Promise<{ question: string; options: string[]; correct: number; explanation?: string }[]> {
    const prompt = `You are an expert exam parser. I have extracted text from a PDF of a TS EAMCET / AP EAPCET exam.
Extract as many complete multiple-choice questions as you can find (aim for 15-40 per chunk).
Fix formatting issues or OCR errors.
Each question MUST have "question", "options" (array of exactly 4 strings), "correct" (index 0-3), and "explanation".
Output ONLY valid JSON:
{
  "questions": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "explanation": "..."
    }
  ]
}

Extracted Text:
---
${text}
`
    const aiResult = await chatCompletionForMockExam([
        { role: "system", content: "You are an expert exam data extractor. Output only valid JSON." },
        { role: "user", content: prompt }
    ], { temperature: 0.2, max_tokens: 8192 })
    if (!aiResult.ok || !(aiResult as { content?: string }).content) return []
    let reply = (aiResult as { content: string }).content.trim()
    const codeBlockMatch = reply.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) reply = codeBlockMatch[1].trim()
    try {
        const parsed = JSON.parse(reply)
        if (!parsed || !Array.isArray(parsed.questions)) return []
        return parsed.questions.map((q: any) => ({
            ...q,
            correct: typeof q.correct === "number" ? q.correct : 0
        }))
    } catch {
        return []
    }
}

export async function POST(req: Request) {
    const auth = await requireAdmin()
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

    if (!isMockExamAiConfigured()) {
        return NextResponse.json({
            ok: false,
            error: "MOCK_EXAM_AI_API_KEY not configured. Add it in .env.local for Mock Exam PDF extraction."
        }, { status: 503 })
    }

    try {
        const body = await req.json().catch(() => null)
        if (!body || !body.pdfUrl) return NextResponse.json({ ok: false, error: "No PDF URL provided" }, { status: 400 })
        const merge = body.merge === true
        const targetCourse = ["mpc", "bipc", "cert", "main"].includes(body.targetCourse) ? body.targetCourse : "main"
        const maxChunks = typeof body.maxChunks === "number" ? Math.max(1, Math.min(20, body.maxChunks)) : 999

        const pdfRes = await fetch(body.pdfUrl)
        if (!pdfRes.ok) throw new Error("Could not download PDF from storage. Check Supabase uploads bucket limit (run supabase-increase-upload-limit.sql for 200MB).")

        const arrayBuf = await pdfRes.arrayBuffer()
        if (arrayBuf.byteLength > MAX_PDF_BYTES) {
            return NextResponse.json({ ok: false, error: `PDF is too large (${Math.round(arrayBuf.byteLength / 1024 / 1024)}MB). Max 150MB to avoid server timeouts.` }, { status: 400 })
        }

        const buffer = Buffer.from(arrayBuf)
        const pdfData = await pdfParse(buffer)
        let text = (pdfData.text || "").trim()

        if (!text) {
            return NextResponse.json({ ok: false, error: "Extracted PDF text is empty. The PDF might be image-only (scanned) without OCR or password protected." }, { status: 400 })
        }

        // Process in chunks for large PDFs (100+ pages)
        const chunks: string[] = []
        for (let i = 0; i < text.length; i += CHUNK_CHARS) {
            chunks.push(text.slice(i, i + CHUNK_CHARS))
        }

        const seen = new Set<string>()
        const allQuestions: { question: string; options: string[]; correct: number; explanation?: string }[] = []

        for (let i = 0; i < Math.min(chunks.length, maxChunks); i++) {
            const qs = await extractQuestionsFromChunk(chunks[i])
            for (const q of qs) {
                const key = (q.question || "").trim().slice(0, 200)
                if (key && !seen.has(key) && Array.isArray(q.options) && q.options.length >= 2) {
                    seen.add(key)
                    allQuestions.push({
                        question: String(q.question || "").trim(),
                        options: (q.options || []).map(String).filter(Boolean),
                        correct: Math.max(0, Math.min((q.options?.length || 1) - 1, Number(q.correct) || 0)),
                        explanation: typeof q.explanation === "string" ? q.explanation : undefined
                    })
                }
            }
        }

        let questions = allQuestions.filter((q) => q.question && q.options.length >= 2)

        const supabase = createServerSupabase()
        if (!supabase) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 })

        if (merge) {
            const { data: existing } = await supabase.from("mock_exams").select("questions").eq("id", targetCourse).single()
            const prevRaw = existing?.questions
            let prev: { question?: string; options?: string[]; correct?: number; explanation?: string }[]
            if (Array.isArray(prevRaw)) prev = prevRaw
            else if (prevRaw && typeof prevRaw === "object" && Array.isArray((prevRaw as { modules?: unknown[] }).modules)) {
                prev = ((prevRaw as { modules: { questions?: unknown[] }[] }).modules || []).flatMap((m) => (m.questions || []) as { question?: string; options?: string[]; correct?: number; explanation?: string }[])
            } else prev = []
            const prevKeys = new Set(prev.map((q) => (q.question || "").trim().slice(0, 200)))
            for (const q of questions) {
                const key = (q.question || "").trim().slice(0, 200)
                if (key && !prevKeys.has(key)) {
                    prevKeys.add(key)
                    prev.push(q)
                }
            }
            questions = prev.filter((q): q is { question: string; options: string[]; correct: number; explanation?: string } =>
                typeof q.question === "string" && Array.isArray(q.options) && typeof q.correct === "number"
            )
        }

        const payload = targetCourse === "main"
            ? questions
            : { modules: [{ name: "All", questions }] }
        const { error: dbError } = await supabase.from("mock_exams").upsert({
            id: targetCourse,
            questions: payload,
            created_at: Math.floor(Date.now())
        }, { onConflict: "id" })

        if (dbError) {
            console.error("Supabase mock_exams upsert error:", dbError)
            return NextResponse.json({
                ok: false,
                error: `Database Save Error: ${dbError.message}. Make sure the 'mock_exams' table exists with columns: id (text PK), questions (jsonb), created_at (bigint).`
            }, { status: 500 })
        }

        return NextResponse.json({ ok: true, count: questions.length })
    } catch (error: any) {
        console.error("Mock exam upload crash:", error)
        return NextResponse.json({ ok: false, error: error.message || "Failed to process PDF" }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    const auth = await requireAdmin()
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

    try {
        const supabase = createServerSupabase()
        if (!supabase) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 })

        const course = new URL(req.url).searchParams.get("course") || "main"
        if (course !== "all" && !["main", "mpc", "bipc", "cert"].includes(course)) {
            return NextResponse.json({ ok: false, error: "Invalid course" }, { status: 400 })
        }
        let err: { message: string } | null = null
        if (course === "all") {
            const { data: rows } = await supabase.from("mock_exams").select("id")
            for (const r of rows || []) {
                const { error } = await supabase.from("mock_exams").delete().eq("id", r.id)
                if (error) err = error
            }
        } else {
            const { error } = await supabase.from("mock_exams").delete().eq("id", course)
            err = error
        }
        if (err) {
            console.error("Supabase delete error:", err)
            return NextResponse.json({ ok: false, error: "Failed to delete exam from database" }, { status: 500 })
        }

        return NextResponse.json({ ok: true })
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message || "Failed to delete" }, { status: 500 })
    }
}
