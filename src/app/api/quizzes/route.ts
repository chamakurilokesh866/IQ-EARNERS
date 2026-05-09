import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { requireAdmin } from "@/lib/auth"
import { getQuizzes, addQuiz, type Quiz } from "@/lib/quizzes"
import { importQuestionsFromBuffer } from "@/lib/importQuizFromBuffer"
import { getTournaments } from "@/lib/tournaments"
import { getUnblockedAt } from "@/lib/unblocked"
import { isEnrolled } from "@/lib/enrollments"

export const runtime = "nodejs"

function parseCSV(text: string): { question: string; options: string[]; correct: number }[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []
  const rows: { question: string; options: string[]; correct: number }[] = []
  const parseRow = (line: string): string[] => {
    const out: string[] = []
    let cur = ""
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') inQuotes = !inQuotes
      else if (c === "," && !inQuotes) {
        out.push(cur)
        cur = ""
      } else cur += c
    }
    out.push(cur)
    return out
  }
  for (let i = 1; i < lines.length; i++) {
    const cells = parseRow(lines[i])
    const question = cells[0]?.replace(/^"|"$/g, "") ?? ""
    const opts = [
      cells[1]?.replace(/^"|"$/g, "") ?? "",
      cells[2]?.replace(/^"|"$/g, "") ?? "",
      cells[3]?.replace(/^"|"$/g, "") ?? "",
      cells[4]?.replace(/^"|"$/g, "") ?? ""
    ].filter(Boolean)
    const correct = Math.max(0, Math.min(opts.length - 1, parseInt(cells[5] ?? "0", 10)))
    if (question && opts.length >= 2) rows.push({ question, options: opts, correct })
  }
  return rows
}

function normalizeQuestions(raw: unknown[]): Quiz["questions"] {
  return raw.map((q: any) => {
    if (typeof q?.question === "string" && Array.isArray(q?.options)) {
      return {
        question: q.question,
        options: q.options.map(String).filter(Boolean),
        correct: Math.max(0, Math.min((q.options?.length ?? 1) - 1, Number(q.correct) || 0)),
        category: typeof q.category === "string" ? q.category : undefined,
        difficulty: typeof q.difficulty === "string" ? q.difficulty : undefined
      }
    }
    return null
  }).filter(Boolean) as Quiz["questions"]
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const quizId = url.searchParams.get("quizId") || undefined
  const tournamentId = url.searchParams.get("tournamentId") || undefined
  let data = await getQuizzes()
  try {
    const cookieStore = await cookies()
    const usernameCookie = cookieStore.get("username")?.value
    const username = usernameCookie ? decodeURIComponent(usernameCookie) : null
    if (username?.trim()) {
      const unblockedAt = await getUnblockedAt(username.trim())
      if (unblockedAt != null) {
        data = data.filter((q) => (q.created_at ?? 0) > unblockedAt)
      }
    }
  } catch { }
  try {
    if (tournamentId) {
      let username: string | null = null
      try {
        const cookieStore = await cookies()
        const u = cookieStore.get("username")?.value
        if (u) username = decodeURIComponent(u)
      } catch { }
      const enrolled = username ? await isEnrolled(username, tournamentId) : false
      if (!enrolled) {
        return NextResponse.json({ ok: true, data: [], requiresEnrollment: true }, {
          headers: { "Cache-Control": "private, no-store" }
        })
      }
      const tournaments = await getTournaments()
      const t = tournaments.find((x: any) => x.id === tournamentId)
      const targetId = (t as any)?.quizId || quizId
      if (targetId) {
        const quiz = data.find((q: any) => q.id === targetId)
        const enriched = quiz ? { ...quiz, endTime: (t as any)?.endTime ?? quiz.endTime } : null
        return NextResponse.json({ ok: true, data: enriched ? [enriched] : data.slice(0, 1) }, {
          headers: { "Cache-Control": "public, max-age=2, stale-while-revalidate=5" }
        })
      }
    }
    if (quizId) {
      const quiz = data.find((q: any) => q.id === quizId)
      if (quiz?.quiz_type === "tournament") {
        return NextResponse.json({ ok: false, error: "Tournament quiz requires enrollment via tournament route" }, {
          status: 403,
          headers: { "Cache-Control": "private, no-store" }
        })
      }
      return NextResponse.json({ ok: true, data: quiz ? [quiz] : data.slice(0, 1) }, {
        headers: { "Cache-Control": "public, max-age=2, stale-while-revalidate=5" }
      })
    }

    // General list: exclude tournament quizzes to prevent non-enrolled users from seeing them
    const filtered = data.filter(q => q.quiz_type !== "tournament")

    return NextResponse.json({ ok: true, data: filtered }, {
      headers: { "Cache-Control": "public, max-age=2, stale-while-revalidate=5" }
    })
  } catch {
    return NextResponse.json({ ok: true, data: [] }, {
      headers: { "Cache-Control": "public, max-age=2, stale-while-revalidate=5" }
    })
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  let quizzes: Quiz[] = []
  const contentType = req.headers.get("content-type") ?? ""
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData()
    const file = form.get("file") as File | null
    const title = String(form.get("title") ?? "Uploaded Quiz").trim() || "Uploaded Quiz"
    const qtRaw = String(form.get("quiz_type") ?? "daily").toLowerCase()
    const quizType: "daily" | "tournament" = qtRaw === "tournament" ? "tournament" : "daily"
    if (file) {
      const ext = (file.name ?? "").toLowerCase()
      if (ext.endsWith(".pdf") || ext.endsWith(".xlsx") || ext.endsWith(".xls")) {
        const buf = Buffer.from(await file.arrayBuffer())
        const parsed = await importQuestionsFromBuffer(buf, file.name || "upload.bin")
        if (parsed.ok && parsed.questions.length) {
          quizzes = [{ id: String(Date.now()), title, source_url: file.name, questions: parsed.questions, quiz_type: quizType }]
        }
      } else {
        const text = await file.text()
        if (ext.endsWith(".csv")) {
          const questions = parseCSV(text)
          if (questions.length) quizzes = [{ id: String(Date.now()), title, source_url: file.name, questions, quiz_type: quizType }]
        } else if (ext.endsWith(".json")) {
          try {
            const parsed = JSON.parse(text)
            const arr = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.quizzes) ? parsed.quizzes : [parsed])
            for (const q of arr) {
              const t = typeof q?.title === "string" ? q.title : title
              const qs = Array.isArray(q?.questions) ? normalizeQuestions(q.questions) : (Array.isArray(q?.question) ? normalizeQuestions(q) : [])
              if (qs.length) {
                quizzes.push({
                  id: q.id ?? String(Date.now() + Math.random()),
                  title: t,
                  source_url: file.name,
                  questions: qs,
                  quiz_type: q.quiz_type ?? quizType
                })
              }
            }
          } catch { }
        }
      }
    }
  } else {
    const body = await req.json().catch(() => ({}))
    if (typeof body?.title === "string" && Array.isArray(body?.questionsMultiLang) && body.questionsMultiLang.length > 0 && Array.isArray(body?.languages) && body.languages.length > 0) {
      const title = body.title.trim() || "New Quiz"
      quizzes = [{ id: String(Date.now()), title, source_url: "", questions: [], questionsMultiLang: body.questionsMultiLang, languages: body.languages, quiz_type: body.quiz_type ?? "daily" }]
    } else if (typeof body?.title === "string" && Array.isArray(body?.questions) && body.questions.length > 0) {
      const title = body.title.trim() || "New Quiz"
      const qs = normalizeQuestions(body.questions)
      if (qs.length) quizzes = [{ id: String(Date.now()), title, source_url: "", questions: qs, quiz_type: body.quiz_type ?? "daily" }]
    } else if (typeof body?.csv === "string") {
      const questions = parseCSV(body.csv)
      const title = String(body?.title ?? "CSV Quiz").trim() || "CSV Quiz"
      if (questions.length) quizzes = [{ id: String(Date.now()), title, source_url: "", questions }]
    } else if (typeof body?.json === "string") {
      try {
        const parsed = JSON.parse(body.json)
        const arr = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.quizzes) ? parsed.quizzes : [parsed])
        for (const q of arr) {
          const t = typeof q?.title === "string" ? q.title : "Uploaded Quiz"
          const qs = Array.isArray(q?.questions) ? normalizeQuestions(q.questions) : []
          if (qs.length) quizzes.push({ id: q.id ?? String(Date.now() + Math.random()), title: t, source_url: "", questions: qs })
        }
      } catch { }
    } else if (Array.isArray(body?.quizzes)) {
      for (const q of body.quizzes) {
        if (typeof q?.title === "string" && Array.isArray(q?.questions)) {
          const qs = normalizeQuestions(q.questions)
          if (qs.length) quizzes.push({ id: q.id ?? String(Date.now() + Math.random()), title: q.title, source_url: q.source_url ?? "", questions: qs, quiz_type: q.quiz_type ?? body.quiz_type ?? "daily" })
        }
      }
    }
  }
  if (!quizzes.length) return NextResponse.json({ ok: false, error: "Invalid or empty CSV/JSON" }, { status: 400 })
  let saved = 0
  const ids: string[] = []
  let lastError = ""
  for (const q of quizzes) {
    const result = await addQuiz(q)
    if (result.ok) {
      saved += 1
      ids.push(q.id)
    } else {
      lastError = result.error || "Save failed"
    }
  }
  if (saved > 0) {
    const { sendPushNotification } = await import("@/lib/push")
    const title = quizzes.length > 1 ? "New Quizzes Available!" : `New Quiz: ${quizzes[0].title}`
    await sendPushNotification({
      title,
      body: `A new ${quizzes.length > 1 ? "set of quizzes" : "quiz"} has been added. Open the app to start earning!`,
      url: "/daily-quiz"
    }).catch(() => { })
  }
  return NextResponse.json({ ok: true, saved, total: quizzes.length, ids })
}
