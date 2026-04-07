import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getProfileByUid } from "@/lib/profiles"
import { getQuizByCodeOrId } from "@/lib/quizzes"
import { getCompletion } from "@/lib/quizCompletions"

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

function getTodayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** GET ?quizId=... or ?code=... — Returns completed quiz report (rows, score, total, totalTimeSeconds) for PDF download. */
export async function GET(req: Request) {
  const username = await getAuthenticatedUsername()
  if (!username) return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 })

  const url = new URL(req.url)
  const quizIdParam = url.searchParams.get("quizId")?.trim() || url.searchParams.get("code")?.trim()
  if (!quizIdParam) return NextResponse.json({ ok: false, error: "quizId or code required" }, { status: 400 })

  const quiz = await getQuizByCodeOrId(quizIdParam)
  const quizId = quiz?.id ?? quizIdParam

  const { completed, entry } = await getCompletion(username, quizId, getTodayLocal())
  if (!completed || !entry) return NextResponse.json({ ok: false, error: "Report not found" }, { status: 404 })

  return NextResponse.json({
    ok: true,
    username,
    score: entry.score,
    total: entry.total,
    totalTimeSeconds: entry.totalTimeSeconds,
    rows: entry.rows ?? []
  })
}
