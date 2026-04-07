import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getQuizzes } from "@/lib/quizzes"
import { promises as fs } from "fs"
import path from "path"

const DATA_PATH = path.join(process.cwd(), "src", "data", "user-stats.json")

export async function POST(req: Request) {
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }

  const quizzes = await getQuizzes()
  const currentQuiz = quizzes[0]
  if (!currentQuiz?.id) {
    return NextResponse.json({ ok: true, message: "No active quiz found to reset. System is already clean." })
  }

  const quizId = currentQuiz.id
  let targetUsername: string | null = null
  try {
    const body = await req.json().catch(() => ({}))
    targetUsername = typeof body?.username === "string" ? body.username.trim().toLowerCase() : null
  } catch {}

  try {
    const txt = await fs.readFile(DATA_PATH, "utf-8").catch(() => "{}")
    const all: Record<string, Record<string, unknown>> = JSON.parse(txt || "{}")
    let changed = false
    const keysToProcess = targetUsername ? (all[targetUsername] ? [targetUsername] : []) : Object.keys(all)
    for (const key of keysToProcess) {
      const user = all[key] as Record<string, unknown>
      const completedQuizIds = Array.isArray(user.completedQuizIds) ? [...user.completedQuizIds] : []
      const completedByQuiz = user.completedByQuiz && typeof user.completedByQuiz === "object" ? { ...user.completedByQuiz } as Record<string, unknown> : {}
      const idx = completedQuizIds.indexOf(quizId)
      if (idx >= 0) {
        completedQuizIds.splice(idx, 1)
        changed = true
      }
      if (completedByQuiz[quizId]) {
        delete completedByQuiz[quizId]
        changed = true
      }
      all[key] = { ...user, completedQuizIds, completedByQuiz }
    }
    if (changed) {
      await fs.writeFile(DATA_PATH, JSON.stringify(all, null, 2), "utf-8")
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error)?.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    quizId,
    quizCode: currentQuiz.code ?? quizId,
    message: targetUsername ? `Quiz completion cleared for user: ${targetUsername}` : "Quiz completions cleared for all users"
  })
}
