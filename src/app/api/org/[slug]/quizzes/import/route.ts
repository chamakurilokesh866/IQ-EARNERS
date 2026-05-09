import { NextResponse } from "next/server"
import { requireOrgSession } from "@/lib/orgAuth"
import { createOrgQuiz, findOrgBySlug, logOrgAuditEvent } from "@/lib/enterpriseStore"

type ParsedQuestion = { question: string; options: string[]; correct: number; explanation?: string }

function extractQuestionsFromPdfText(text: string): ParsedQuestion[] {
  const chunks = text.split(/\n(?=\d+[\).]\s+|Q\d+[:.)]\s+)/gi).map((c) => c.trim()).filter(Boolean)
  const out: ParsedQuestion[] = []
  for (const chunk of chunks) {
    const qMatch = chunk.match(/^(?:\d+[\).]\s+|Q\d+[:.)]\s+)?(.+?)(?:\n|$)/i)
    const opts = [...chunk.matchAll(/(?:^|\n)\s*(?:[A-D][\).]|Option\s*[A-D]\s*[:.)-])\s*(.+)/gi)].map((m) => String(m[1] ?? "").trim()).filter(Boolean)
    if (!qMatch || opts.length < 4) continue
    const answerMatch = chunk.match(/(?:Answer|Ans)\s*[:\-]?\s*([A-D]|[1-4])/i)
    let correct = 0
    if (answerMatch?.[1]) {
      const raw = answerMatch[1].toUpperCase()
      correct = /^[1-4]$/.test(raw) ? Number(raw) - 1 : Math.max(0, "ABCD".indexOf(raw))
    }
    out.push({
      question: qMatch[1].trim(),
      options: opts.slice(0, 4),
      correct: Math.max(0, Math.min(3, correct))
    })
  }
  return out
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const session = await requireOrgSession(slug)
  if (!session.ok) return NextResponse.json({ ok: false, error: session.error }, { status: session.status })
  if (!["owner", "admin", "teacher"].includes(session.session.role)) {
    return NextResponse.json({ ok: false, error: "Only owner/admin/teacher can import quizzes" }, { status: 403 })
  }

  const org = await findOrgBySlug(slug)
  if (!org) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })

  try {
    const form = await req.formData()
    const file = form.get("file")
    const title = String(form.get("title") ?? "Imported Quiz").trim()
    const category = String(form.get("category") ?? "General").trim() || "General"
    const difficultyRaw = String(form.get("difficulty") ?? "Medium")
    const difficulty = (["Easy", "Medium", "Hard"].includes(difficultyRaw) ? difficultyRaw : "Medium") as "Easy" | "Medium" | "Hard"
    const published = String(form.get("published") ?? "false") === "true"

    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "File is required" }, { status: 400 })
    const fileName = file.name.toLowerCase()
    let questions: ParsedQuestion[] = []

    if (fileName.endsWith(".json")) {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.questions) ? parsed.questions : []
      questions = arr
        .map((q: any) => ({
          question: String(q?.question ?? "").trim(),
          options: Array.isArray(q?.options) ? q.options.map((o: unknown) => String(o)).filter(Boolean).slice(0, 4) : [],
          correct: Number(q?.correct ?? 0),
          explanation: typeof q?.explanation === "string" ? q.explanation : undefined
        }))
        .filter((q: ParsedQuestion) => q.question && q.options.length === 4 && Number.isInteger(q.correct) && q.correct >= 0 && q.correct <= 3)
    } else if (fileName.endsWith(".pdf")) {
      const pdfParseMod = await import("pdf-parse")
      const pdfParse = (pdfParseMod as any).default ?? pdfParseMod
      const ab = await file.arrayBuffer()
      const parsed = await pdfParse(Buffer.from(ab))
      questions = extractQuestionsFromPdfText(parsed.text ?? "")
    } else {
      return NextResponse.json({ ok: false, error: "Only .json and .pdf files are supported" }, { status: 400 })
    }

    if (!questions.length) return NextResponse.json({ ok: false, error: "No valid questions found in file" }, { status: 400 })

    const quiz = await createOrgQuiz(org.id, {
      title: title || "Imported Quiz",
      description: `Imported from ${file.name}`,
      category,
      difficulty,
      questions,
      createdBy: session.session.memberId,
      published,
      timePerQuestion: 30
    })
    if (!quiz) return NextResponse.json({ ok: false, error: "Could not create quiz (plan limit reached)" }, { status: 400 })
    await logOrgAuditEvent({
      orgId: org.id,
      actorMemberId: session.session.memberId,
      actorName: session.session.memberName,
      action: "quiz_imported",
      targetType: "quiz",
      targetId: quiz.id,
      detail: `${file.name} (${questions.length} questions)`
    })
    return NextResponse.json({ ok: true, data: { id: quiz.id, title: quiz.title, questionCount: questions.length } })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Import failed" }, { status: 500 })
  }
}

