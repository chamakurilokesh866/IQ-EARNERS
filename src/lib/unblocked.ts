/**
 * Unblocked users: stores when a user was unblocked.
 * Used to filter quizzes - unblocked users only see quizzes uploaded after their unblock date.
 */
import { promises as fs } from "fs"
import path from "path"
import { createServerSupabase } from "./supabase"

const DATA_PATH = path.join(process.cwd(), "src", "data", "unblocked_users.json")

export async function recordUnblocked(username: string, unblockedAt: number): Promise<boolean> {
  const trimmed = username?.trim()
  if (!trimmed) return false
  const lower = trimmed.toLowerCase()

  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { error } = await supabase.from("unblocked_users").upsert(
        { username: trimmed, unblocked_at: unblockedAt, updated_at: Date.now() },
        { onConflict: "username" }
      )
      return !error
    } catch {
      // fallback to file
    }
  }
  try {
    const dir = path.dirname(DATA_PATH)
    await fs.mkdir(dir, { recursive: true }).catch(() => {})
    let data: Record<string, number> = {}
    try {
      const txt = await fs.readFile(DATA_PATH, "utf-8")
      data = JSON.parse(txt || "{}")
    } catch {}
    data[lower] = unblockedAt
    await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), "utf-8")
    return true
  } catch {
    return false
  }
}

export async function getUnblockedAt(username: string): Promise<number | null> {
  if (!username?.trim()) return null
  const lower = username.trim().toLowerCase()

  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase.from("unblocked_users").select("username, unblocked_at")
      if (!error && Array.isArray(data)) {
        const found = data.find((r: any) => String(r?.username ?? "").toLowerCase() === lower)
        if (found?.unblocked_at != null) return Number(found.unblocked_at)
      }
    } catch {}
  }
  try {
    const txt = await fs.readFile(DATA_PATH, "utf-8")
    const data: Record<string, number> = JSON.parse(txt || "{}")
    const ts = data[lower]
    return typeof ts === "number" ? ts : null
  } catch {
    return null
  }
}
