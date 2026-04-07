/**
 * Quiz completion storage: Supabase (persistent) with file fallback.
 * Used to prevent users from re-taking completed quizzes after refresh.
 */
import { createServerSupabase } from "./supabase"
import { promises as fs } from "fs"
import path from "path"

const DATA_PATH = path.join(process.cwd(), "src", "data", "user-stats.json")

export type QuizCompletionEntry = {
  score: number
  total: number
  totalTimeSeconds: number
  rows?: { question: string; correctAnswer: string; userAnswer: string; correct: boolean; timeSeconds: number; explanation?: string }[]
}

export async function getCompletion(
  username: string,
  quizId: string | null,
  dateLocal: string
): Promise<{ completed: boolean; entry?: QuizCompletionEntry }> {
  const supabase = createServerSupabase()
  const key = username.trim().toLowerCase()

  if (supabase && quizId) {
    try {
      const { data, error } = await supabase
        .from("quiz_completions")
        .select("score, total, total_time_seconds, rows")
        .eq("username_lower", key)
        .eq("quiz_id", quizId)
        .limit(1)
        .maybeSingle()
      if (!error && data) {
        return {
          completed: true,
          entry: {
            score: Number(data.score ?? 0),
            total: Number(data.total ?? 0),
            totalTimeSeconds: Number(data.total_time_seconds ?? 0),
            rows: Array.isArray(data.rows) ? data.rows as QuizCompletionEntry["rows"] : []
          }
        }
      }
    } catch {}
  }

  if (supabase && !quizId) {
    try {
      const { data, error } = await supabase
        .from("quiz_completions")
        .select("score, total, total_time_seconds, rows")
        .eq("username_lower", key)
        .eq("date_local", dateLocal)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!error && data) {
        return {
          completed: true,
          entry: {
            score: Number(data.score ?? 0),
            total: Number(data.total ?? 0),
            totalTimeSeconds: Number(data.total_time_seconds ?? 0),
            rows: Array.isArray(data.rows) ? data.rows as QuizCompletionEntry["rows"] : []
          }
        }
      }
    } catch {}
  }

  try {
    const txt = await fs.readFile(DATA_PATH, "utf-8")
    const all: Record<string, { completedQuizIds?: string[]; completedByQuiz?: Record<string, QuizCompletionEntry>; completedDates?: string[]; history?: { date: string; score: number; total: number; totalTimeSeconds: number }[] }> = JSON.parse(txt || "{}")
    const user = all[key]
    if (!user) return { completed: false }

    if (quizId) {
      const completed = user.completedQuizIds?.includes(quizId) ?? false
      const entry = user.completedByQuiz?.[quizId]
      return { completed, entry }
    }

    const completed = user.completedDates?.includes(dateLocal) ?? false
    const entry = user.history?.find((h) => h.date === dateLocal)
    const completedByQuiz = user.completedByQuiz ?? {}
    let rows: QuizCompletionEntry["rows"] = []
    for (const qid of [...(user.completedQuizIds ?? [])].reverse()) {
      const e = completedByQuiz[qid]
      if (e?.rows?.length) { rows = e.rows; break }
    }
    return {
      completed,
      entry: completed && entry ? { score: entry.score, total: entry.total, totalTimeSeconds: entry.totalTimeSeconds, rows } : undefined
    }
  } catch {
    return { completed: false }
  }
}

export async function saveCompletion(
  username: string,
  quizId: string,
  dateLocal: string,
  entry: QuizCompletionEntry
): Promise<boolean> {
  const supabase = createServerSupabase()
  const key = username.trim().toLowerCase()

  if (supabase) {
    try {
      const id = `qc-${key}-${quizId}`.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 200)
      const { error } = await supabase
        .from("quiz_completions")
        .upsert(
          {
            id,
            username_lower: key,
            quiz_id: quizId,
            date_local: dateLocal,
            score: entry.score,
            total: entry.total,
            total_time_seconds: entry.totalTimeSeconds ?? 0,
            rows: entry.rows ?? [],
            created_at: Date.now()
          },
          { onConflict: "username_lower,quiz_id" }
        )
      return !error
    } catch {
      return false
    }
  }
  return false
}

export async function clearCompletions(quizId?: string): Promise<boolean> {
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const query = supabase.from("quiz_completions").delete()
      if (quizId) query.eq("quiz_id", quizId)
      else query.neq("id", "") // delete all if no quizId provided (be careful!)
      const { error } = await query
      return !error
    } catch {
      return false
    }
  }
  return false
}
