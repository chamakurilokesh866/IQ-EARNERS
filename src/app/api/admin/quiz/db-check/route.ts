import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { createServerSupabase } from "@/lib/supabase"
import { promises as fs } from "fs"
import path from "path"

const FILE_PATH = path.join(process.cwd(), "src", "data", "quizzes.json")

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  const supabase = createServerSupabase()
  const hasEnv = !!(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())

  if (!hasEnv) {
    const fileExists = await fs.access(FILE_PATH).then(() => true).catch(() => false)
    return NextResponse.json({
      ok: true,
      connected: fileExists,
      source: "file",
      message: "Supabase not configured. Quizzes use file fallback (src/data/quizzes.json).",
      fileExists,
      hint: "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local for production."
    })
  }

  if (!supabase) {
    return NextResponse.json({
      ok: true,
      connected: false,
      message: "Supabase client could not be created. Check URL and service key."
    })
  }

  try {
    const { data, error } = await supabase.from("quizzes").select("id").limit(1)
    if (error) {
      const msg = error.message || ""
      const hint = msg.includes("does not exist") || msg.includes("relation")
        ? " Create the quizzes table in Supabase (see schema below)."
        : ""
      return NextResponse.json({
        ok: true,
        connected: false,
        error: msg,
        hint: hint.trim() || undefined,
        schema: `-- Run in Supabase SQL Editor (see supabase-setup.sql).
-- If quizzes table exists, also add quiz_completions for persistent completion state:
CREATE TABLE IF NOT EXISTS quiz_completions (
  id TEXT PRIMARY KEY,
  username_lower TEXT NOT NULL,
  quiz_id TEXT NOT NULL,
  date_local TEXT NOT NULL,
  score NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  total_time_seconds NUMERIC DEFAULT 0,
  rows JSONB DEFAULT '[]'::jsonb,
  created_at BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint,
  UNIQUE(username_lower, quiz_id)
);
CREATE INDEX IF NOT EXISTS idx_quiz_completions_username ON quiz_completions (username_lower);`
      })
    }
    return NextResponse.json({
      ok: true,
      connected: true,
      source: "supabase",
      count: Array.isArray(data) ? data.length : 0
    })
  } catch (e) {
    return NextResponse.json({
      ok: true,
      connected: false,
      error: (e as Error).message
    })
  }
}
