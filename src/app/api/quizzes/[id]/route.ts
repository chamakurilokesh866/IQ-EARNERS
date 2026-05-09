import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getQuizById, updateQuiz, deleteQuiz } from "@/lib/quizzes"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const { id } = await params
  const ok = await deleteQuiz(id)
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const { id } = await params
  const existing = await getQuizById(id)
  if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  const updates: { title?: string; questions?: { question: string; options: string[]; correct: number; category?: string; difficulty?: string }[]; status?: string; quiz_type?: "daily" | "tournament" } = {}
  if (typeof body.title === "string") updates.title = body.title
  if (Array.isArray(body.questions)) updates.questions = body.questions
  if (body.quiz_type === "daily" || body.quiz_type === "tournament") updates.quiz_type = body.quiz_type
  const ok = await updateQuiz(id, updates)
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: "Update failed" }, { status: 500 })
}
