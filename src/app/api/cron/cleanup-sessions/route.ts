import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase"
import { promises as fs } from "fs"
import path from "path"

const FILE_PATH = path.join(process.cwd(), "src", "data", "active-quiz-sessions.json")
const SESSION_TTL_MS = 1000 * 60 * 5 // Must match activeQuizSessions.ts

/**
 * GET /api/cron/cleanup-sessions
 * Purges expired quiz session locks from both Supabase and the file fallback.
 * Should be called by Vercel Cron or an external cron service every 5-10 minutes.
 */
export async function GET(req: Request) {
  // Optional: protect with a secret
  const url = new URL(req.url)
  const secret = url.searchParams.get("secret") ?? ""
  const cronSecret = process.env.CRON_SECRET ?? ""
  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const now = Date.now()
  const cutoff = now - SESSION_TTL_MS
  let deletedSupabase = 0
  let deletedFile = 0

  // 1. Clean Supabase
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { count, error } = await supabase
        .from("active_quiz_sessions")
        .delete({ count: "exact" })
        .lt("started_at", cutoff)
      if (!error) deletedSupabase = count ?? 0
    } catch {
      // Silent fail — log in production if needed
    }
  }

  // 2. Clean file fallback
  try {
    const txt = await fs.readFile(FILE_PATH, "utf-8").catch(() => "[]")
    const arr: Array<{ startedAt?: number; username?: string; tournamentId?: string }> = JSON.parse(txt || "[]")
    if (Array.isArray(arr)) {
      const before = arr.length
      const cleaned = arr.filter((s) => {
        const startedAt = Number(s?.startedAt ?? 0)
        return startedAt > 0 && now - startedAt <= SESSION_TTL_MS
      })
      deletedFile = before - cleaned.length
      if (deletedFile > 0) {
        await fs.writeFile(FILE_PATH, JSON.stringify(cleaned, null, 2), "utf-8")
      }
    }
  } catch {
    // File may not exist yet — that's fine
  }

  return NextResponse.json({
    ok: true,
    deletedSupabase,
    deletedFile,
    total: deletedSupabase + deletedFile,
    checkedAt: new Date(now).toISOString()
  }, {
    headers: { "Cache-Control": "private, no-store" }
  })
}
