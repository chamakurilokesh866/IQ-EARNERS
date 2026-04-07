/**
 * Blocked users: Supabase blocked_users table (primary), then settings, then file.
 * Used during login to block access and show payment modal.
 */
import { promises as fs } from "fs"
import path from "path"
import { createServerSupabase } from "./supabase"
import { getSettings, updateSettings } from "./settings"

const DATA_PATH = path.join(process.cwd(), "src", "data", "blocked_users.json")

export type BlockedEntry = { username: string; reason: string; blockedAt: number }

async function readFromTable(supabase: ReturnType<typeof createServerSupabase>): Promise<BlockedEntry[]> {
  if (!supabase) return []
  try {
    const { data, error } = await supabase.from("blocked_users").select("username, reason, blocked_at")
    if (error) return []
    return (data ?? []).map((r) => ({
      username: String(r?.username ?? ""),
      reason: String(r?.reason ?? ""),
      blockedAt: Number(r?.blocked_at) || Date.now()
    }))
  } catch {
    return []
  }
}

async function readFromSettings(): Promise<BlockedEntry[]> {
  try {
    const s = await getSettings()
    const blocked = (s as { blockedUsers?: BlockedEntry[] }).blockedUsers
    return Array.isArray(blocked) ? blocked : []
  } catch {
    return []
  }
}

async function readFromFile(): Promise<BlockedEntry[]> {
  try {
    const txt = await fs.readFile(DATA_PATH, "utf-8")
    const arr = JSON.parse(txt || "[]")
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

async function readBlocked(): Promise<BlockedEntry[]> {
  const supabase = createServerSupabase()
  if (supabase) {
    const fromTable = await readFromTable(supabase)
    return fromTable
  }
  const fromSettings = await readFromSettings()
  if (fromSettings.length > 0) return fromSettings
  return readFromFile()
}

async function writeToTable(supabase: ReturnType<typeof createServerSupabase>, arr: BlockedEntry[]): Promise<boolean> {
  if (!supabase) return false
  try {
    const { data: existing } = await supabase.from("blocked_users").select("username")
    for (const row of existing ?? []) {
      await supabase.from("blocked_users").delete().eq("username", row.username)
    }
    for (const b of arr) {
      const { error } = await supabase.from("blocked_users").upsert(
        { username: b.username, reason: b.reason, blocked_at: b.blockedAt || Date.now(), created_at: Date.now() },
        { onConflict: "username" }
      )
      if (error) return false
    }
    return true
  } catch {
    return false
  }
}

async function writeBlocked(arr: BlockedEntry[]): Promise<boolean> {
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const ok = await writeToTable(supabase, arr)
      if (ok) return true
    } catch {}
  }
  try {
    const ok = await updateSettings({ blockedUsers: arr })
    if (ok) return true
  } catch {}
  try {
    const dir = path.dirname(DATA_PATH)
    await fs.mkdir(dir, { recursive: true }).catch(() => {})
    await fs.writeFile(DATA_PATH, JSON.stringify(arr, null, 2), "utf-8")
    return true
  } catch {
    return false
  }
}

export async function isBlocked(username: string): Promise<BlockedEntry | null> {
  if (!username || !username.trim()) return null
  const lower = username.trim().toLowerCase()
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase.from("blocked_users").select("username, reason, blocked_at")
      if (!error && data) {
        const found = data.find((r) => String(r?.username ?? "").toLowerCase() === lower)
        if (found) {
          return {
            username: String(found.username ?? username.trim()),
            reason: String(found.reason ?? "Your account has been blocked."),
            blockedAt: Number(found.blocked_at) || 0
          }
        }
      }
    } catch {}
  }
  const arr = await readBlocked()
  return arr.find((b) => b.username.toLowerCase() === lower) ?? null
}

export async function unblockUser(username: string): Promise<boolean> {
  const trimmed = username.trim()
  if (!trimmed) return false
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { error } = await supabase.from("blocked_users").delete().ilike("username", trimmed)
      if (!error) return true
    } catch {}
  }
  const arr = await readBlocked()
  const lower = username.trim().toLowerCase()
  const next = arr.filter((b) => b.username.toLowerCase() !== lower)
  if (next.length === arr.length) return false
  return writeBlocked(next)
}

export async function getBlockedList(): Promise<BlockedEntry[]> {
  return readBlocked()
}

export async function blockUser(username: string, reason: string): Promise<boolean> {
  const trimmed = username.trim()
  if (!trimmed) return false
  const lower = trimmed.toLowerCase()
  const now = Date.now()
  const entry: BlockedEntry = { username: trimmed, reason, blockedAt: now }

  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { data: existing } = await supabase.from("blocked_users").select("username")
      const found = (existing ?? []).find((r) => String(r?.username ?? "").toLowerCase() === lower)
      if (found) return false
      const { error } = await supabase.from("blocked_users").upsert(
        { username: trimmed, reason, blocked_at: now, created_at: now },
        { onConflict: "username" }
      )
      if (!error) return true
      if (process.env.NODE_ENV === "development") console.error("[blocked] Supabase insert error:", error)
    } catch (e) {
      if (process.env.NODE_ENV === "development") console.error("[blocked] Supabase insert failed:", e)
    }
  }

  const arr = await readBlocked()
  if (arr.some((b) => b.username.toLowerCase() === lower)) return false
  arr.push(entry)
  return writeBlocked(arr)
}

export async function removeBlockedUser(username: string): Promise<boolean> {
  return unblockUser(username)
}
