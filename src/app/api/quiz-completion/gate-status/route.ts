import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerSupabase } from "@/lib/supabase"

function getTodayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

async function getUsername(): Promise<string | null> {
  try {
    const store = await cookies()
    const v = store.get("username")?.value
    if (!v) return null
    return decodeURIComponent(v.trim())
  } catch {
    return null
  }
}

/**
 * GET /api/quiz-completion/gate-status
 * Returns whether the current user has completed today's quiz.
 * Used for gating access to certain pages/features.
 */
export async function GET() {
  const username = await getUsername()
  if (!username) {
    return NextResponse.json({ ok: true, completed: false, gated: false }, {
      headers: { "Cache-Control": "private, no-store" }
    })
  }

  const today = getTodayLocal()

  const supabase = createServerSupabase()
  if (!supabase) {
    return NextResponse.json({ ok: true, completed: false, gated: false, error: "db_unavailable" }, {
      headers: { "Cache-Control": "private, no-store" }
    })
  }

  try {
    const { data, error } = await supabase
      .from("quiz_completions")
      .select("score, total, quiz_id")
      .ilike("username", username)
      .eq("date", today)
      .order("created_at", { ascending: false })
      .limit(1)

    if (error) throw error

    const completion = data?.[0] ?? null
    return NextResponse.json({
      ok: true,
      completed: !!completion,
      gated: !!completion,
      score: completion?.score ?? null,
      total: completion?.total ?? null,
      quizId: completion?.quiz_id ?? null,
    }, {
      headers: { "Cache-Control": "private, no-store" }
    })
  } catch {
    return NextResponse.json({ ok: true, completed: false, gated: false }, {
      headers: { "Cache-Control": "private, no-store" }
    })
  }
}
