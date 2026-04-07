import { NextResponse } from "next/server"
import { getProfileByUid } from "@/lib/profiles"
import { getQuizByCodeOrId } from "@/lib/quizzes"
import { getCompletion } from "@/lib/quizCompletions"
import { cookies } from "next/headers"

function getTodayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

async function getAuthenticatedUsername(): Promise<string | null> {
  try {
    const store = await cookies()
    const uid = store.get("uid")?.value ?? ""
    if (uid) {
      const profile = await getProfileByUid(uid)
      if (profile?.username) return profile.username
    }
    const v = store.get("username")?.value
    if (!v) return null
    return decodeURIComponent(v.trim())
  } catch {
    return null
  }
}

/** GET: Check if current user completed the given quiz (by quizId). Prevents re-taking. Uses Supabase first for persistence. */
export async function GET(req: Request) {
  const username = await getAuthenticatedUsername()
  if (!username) return NextResponse.json({ ok: true, completed: false })

  const url = new URL(req.url)
  const quizIdParam = url.searchParams.get("quizId")?.trim() || url.searchParams.get("code")?.trim() || null
  let quizId = quizIdParam
  if (quizIdParam) {
    const quiz = await getQuizByCodeOrId(quizIdParam)
    if (quiz) quizId = quiz.id
  }

  const today = getTodayLocal()
  const { completed, entry } = await getCompletion(username, quizId, today)
  return NextResponse.json({
    ok: true,
    completed,
    score: entry?.score,
    total: entry?.total,
    totalTimeSeconds: entry?.totalTimeSeconds,
    rows: entry?.rows ?? []
  }, { headers: { "Cache-Control": "private, no-store" } })
}
