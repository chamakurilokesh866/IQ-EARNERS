/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { clearCompletions } from "@/lib/quizCompletions"

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  const body = await req.json().catch(() => ({}))
  const quizId = body?.quizId

  // If no quizId provided, we only allow clearing if 'all' flag is set explicitly
  if (!quizId && body?.all !== true) {
    return NextResponse.json({ ok: false, error: "QuizId required or specify all=true" }, { status: 400 })
  }

  const ok = await clearCompletions(quizId)
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Failed to clear completions from DB." }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: quizId ? `Cleared completions for quiz ${quizId}` : "Cleared all completions." })
}
