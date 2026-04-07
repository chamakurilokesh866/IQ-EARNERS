import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { promises as fs } from "fs"
import path from "path"
import { invalidatePracticeQuizCache } from "@/lib/practiceQuizCache"
import { createServerSupabase } from "@/lib/supabase"

const PRACTICE_PATH = path.join(process.cwd(), "src", "data", "practice_quiz.json")

async function isAdmin(): Promise<boolean> {
  try {
    const store = await cookies()
    return store.get("role")?.value === "admin"
  } catch {
    return false
  }
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  try {
    const supabase = createServerSupabase()
    if (supabase) {
      const { data } = await supabase.from("settings").select("data").eq("id", "practice_quiz").single()
      if (data?.data && Array.isArray(data.data)) {
        return NextResponse.json({ ok: true, data: data.data })
      }
    }
    const txt = await fs.readFile(PRACTICE_PATH, "utf-8")
    const arr = JSON.parse(txt || "[]")
    return NextResponse.json({ ok: true, data: Array.isArray(arr) ? arr : [] })
  } catch {
    return NextResponse.json({ ok: true, data: [] })
  }
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  try {
    const body = await req.json().catch(() => ({}))
    const questions = Array.isArray(body?.questions) ? body.questions : (body?.data ? (Array.isArray(body.data) ? body.data : []) : [])
    const mapped = questions.map((q: any) => ({
      question: String(q?.question ?? "").trim(),
      options: Array.isArray(q?.options) ? q.options.filter((o: any) => o != null && String(o).trim()) : [],
      correct: Math.max(0, Math.min(Number(q?.correct ?? 0), 3)),
      category: q?.category ?? "General",
      difficulty: q?.difficulty ?? "Medium",
      hint: q?.hint,
      explanation: q?.explanation
    })).filter((q: any) => q.question.length > 0 && q.options.length >= 2)

    const supabase = createServerSupabase()
    if (supabase) {
      const { error } = await supabase
        .from("settings")
        .upsert({ id: "practice_quiz", data: mapped, updated_at: Date.now() }, { onConflict: "id" })
      if (!error) {
        invalidatePracticeQuizCache()
        return NextResponse.json({ ok: true, count: mapped.length })
      }
    }

    const dir = path.dirname(PRACTICE_PATH)
    await fs.mkdir(dir, { recursive: true }).catch(() => { })
    await fs.writeFile(PRACTICE_PATH, JSON.stringify(mapped, null, 2), "utf-8")
    invalidatePracticeQuizCache()
    return NextResponse.json({ ok: true, count: mapped.length })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Upload failed" }, { status: 500 })
  }
}
