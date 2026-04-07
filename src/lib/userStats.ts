/**
 * User stats storage: Supabase (Vercel) with file fallback (local dev).
 * Used for streaks, achievements, quiz history, and quiz start tracking.
 */
import { createServerSupabase } from "./supabase"
import { promises as fs } from "fs"
import path from "path"

const DATA_PATH = path.join(process.cwd(), "src", "data", "user-stats.json")

export type UserStatsData = {
  username?: string
  streak?: number
  lastDate?: string
  completedDates?: string[]
  completedQuizIds?: string[]
  completedByQuiz?: Record<string, { score: number; total: number; totalTimeSeconds: number; rows?: unknown[] }>
  achievements?: string[]
  history?: { date: string; score: number; total: number; totalTimeSeconds: number }[]
  startedQuizId?: string
  startedQuizCode?: string
  startedAt?: number
}

async function readFromFile(): Promise<Record<string, UserStatsData>> {
  try {
    const txt = await fs.readFile(DATA_PATH, "utf-8")
    return JSON.parse(txt || "{}")
  } catch {
    return {}
  }
}

async function writeToFile(all: Record<string, UserStatsData>): Promise<boolean> {
  try {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true })
    await fs.writeFile(DATA_PATH, JSON.stringify(all, null, 2), "utf-8")
    return true
  } catch {
    return false
  }
}

export async function getUserStats(username: string): Promise<UserStatsData | null> {
  const key = username.trim().toLowerCase()
  const supabase = createServerSupabase()

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("user_stats")
        .select("data")
        .eq("username_lower", key)
        .limit(1)
        .maybeSingle()
      if (!error && data?.data) return data.data as UserStatsData
    } catch {}
  }

  const all = await readFromFile()
  return all[key] ?? null
}

export async function getAllUserStats(): Promise<Record<string, UserStatsData>> {
  const supabase = createServerSupabase()

  if (supabase) {
    try {
      const { data, error } = await supabase.from("user_stats").select("username_lower, data")
      if (!error && Array.isArray(data)) {
        const out: Record<string, UserStatsData> = {}
        for (const row of data) {
          if (row.username_lower && row.data) out[row.username_lower] = row.data as UserStatsData
        }
        return out
      }
    } catch {}
  }

  return readFromFile()
}

export async function setUserStats(username: string, data: UserStatsData): Promise<boolean> {
  const key = username.trim().toLowerCase()
  const supabase = createServerSupabase()

  if (supabase) {
    try {
      const { error } = await supabase
        .from("user_stats")
        .upsert(
          { username_lower: key, data, updated_at: Date.now() },
          { onConflict: "username_lower" }
        )
      return !error
    } catch {
      return false
    }
  }

  const all = await readFromFile()
  all[key] = { ...all[key], ...data }
  return writeToFile(all)
}
