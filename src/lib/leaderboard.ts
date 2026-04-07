/**
 * Leaderboard storage: Supabase (Vercel) with file fallback (local dev).
 */
import { createServerSupabase } from "./supabase"
import { promises as fs } from "fs"
import path from "path"

const FILE_PATH = path.join(process.cwd(), "src", "data", "leaderboard.json")

export type LeaderboardEntry = {
  id?: string
  name: string
  score: number
  totalTimeSeconds?: number
  country?: string
  tournamentId?: string
  created_at?: number
  updated_at?: number
}

function mapRow(r: any): LeaderboardEntry {
  return {
    id: r.id,
    name: r.name ?? "",
    score: Number(r.score ?? 0),
    totalTimeSeconds: r.total_time_seconds != null ? Number(r.total_time_seconds) : r.totalTimeSeconds,
    country: r.country ?? undefined,
    tournamentId: r.tournament_id ?? r.tournamentId,
    created_at: r.created_at ? Number(r.created_at) : undefined,
    updated_at: r.updated_at ? Number(r.updated_at) : undefined
  }
}

async function readFromFile(): Promise<LeaderboardEntry[]> {
  try {
    const txt = await fs.readFile(FILE_PATH, "utf-8")
    const arr = JSON.parse(txt || "[]")
    return (Array.isArray(arr) ? arr : []).map((r: any) => mapRow({ ...r, total_time_seconds: r.totalTimeSeconds, tournament_id: r.tournamentId }))
  } catch {
    return []
  }
}

async function writeToFile(arr: LeaderboardEntry[]): Promise<boolean> {
  try {
    const dir = path.dirname(FILE_PATH)
    await fs.mkdir(dir, { recursive: true }).catch(() => {})
    await fs.writeFile(FILE_PATH, JSON.stringify(arr.map((e) => ({ ...e, totalTimeSeconds: e.totalTimeSeconds, tournamentId: e.tournamentId })), null, 2), "utf-8")
    return true
  } catch {
    return false
  }
}

function isPlaceholderName(name: string): boolean {
  const s = String(name || "").trim().toLowerCase()
  return !s || s === "participant" || s.length < 2
}

export async function getLeaderboard(tournamentId?: string): Promise<LeaderboardEntry[]> {
  const supabase = createServerSupabase()
  let raw: LeaderboardEntry[] = []
  if (supabase) {
    try {
      let q = supabase.from("leaderboard").select("*").order("score", { ascending: false })
      if (tournamentId) q = q.eq("tournament_id", tournamentId)
      const { data, error } = await q
      if (!error && Array.isArray(data)) raw = data.map(mapRow)
    } catch {}
  }
  if (raw.length === 0) {
    let arr = await readFromFile()
    if (tournamentId) arr = arr.filter((e) => e.tournamentId === tournamentId)
    raw = arr
  }
  return raw.filter((e) => !isPlaceholderName(e.name))
}

export async function upsertByName(entry: LeaderboardEntry): Promise<LeaderboardEntry | null> {
  const supabase = createServerSupabase()
  const now = Date.now()
  const nameLower = entry.name.trim().toLowerCase()

  if (supabase) {
    try {
      let q = supabase.from("leaderboard").select("id, created_at").ilike("name", entry.name.trim())
      if (entry.tournamentId) q = q.eq("tournament_id", entry.tournamentId)
      else q = q.is("tournament_id", null)
      const { data: rows } = await q.limit(1)
      const existing = Array.isArray(rows) && rows[0] ? rows[0] : null
      const id = existing?.id ?? `lb-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const payload = {
        id,
        name: entry.name.trim(),
        score: entry.score,
        total_time_seconds: entry.totalTimeSeconds ?? null,
        country: entry.country ?? null,
        tournament_id: entry.tournamentId ?? null,
        created_at: existing?.created_at ?? now,
        updated_at: now
      }
      const { error } = await supabase.from("leaderboard").upsert(payload, { onConflict: "id" })
      if (!error) return mapRow(payload)
    } catch {}
    return null
  }

  const arr = await readFromFile()
  const filtered = entry.tournamentId ? arr.filter((e) => e.tournamentId === entry.tournamentId) : arr
  const idx = filtered.findIndex((e) => String(e.name || "").toLowerCase() === nameLower)
  const item: LeaderboardEntry = {
    id: idx >= 0 ? arr[arr.indexOf(filtered[idx])].id : `lb-${Date.now()}`,
    name: entry.name.trim(),
    score: entry.score,
    totalTimeSeconds: entry.totalTimeSeconds,
    country: entry.country,
    tournamentId: entry.tournamentId,
    updated_at: now
  }
  if (idx >= 0) {
    const realIdx = arr.indexOf(filtered[idx])
    arr[realIdx] = { ...arr[realIdx], ...item }
  } else {
    arr.push(item)
  }
  return (await writeToFile(arr)) ? item : null
}

export async function updateEntry(id: string, updates: Partial<LeaderboardEntry>): Promise<boolean> {
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const payload: Record<string, unknown> = { updated_at: Date.now() }
      if (updates.name !== undefined) payload.name = updates.name
      if (updates.score !== undefined) payload.score = updates.score
      if (updates.totalTimeSeconds !== undefined) payload.total_time_seconds = updates.totalTimeSeconds
      if (updates.country !== undefined) payload.country = updates.country
      const { error } = await supabase.from("leaderboard").update(payload).eq("id", id)
      return !error
    } catch {
      return false
    }
  }
  const arr = await readFromFile()
  const idx = arr.findIndex((e) => e.id === id)
  if (idx === -1) return false
  arr[idx] = { ...arr[idx], ...updates }
  return writeToFile(arr)
}

export async function deleteEntry(id: string): Promise<boolean> {
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { error } = await supabase.from("leaderboard").delete().eq("id", id)
      return !error
    } catch {
      return false
    }
  }
  const arr = await readFromFile()
  const next = arr.filter((e) => e.id !== id)
  return next.length < arr.length && writeToFile(next)
}

export async function replaceAll(entries: LeaderboardEntry[]): Promise<boolean> {
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { data: existing } = await supabase.from("leaderboard").select("id")
      for (const row of existing ?? []) {
        if (row.id && !entries.some((e) => e.id === row.id)) {
          await supabase.from("leaderboard").delete().eq("id", row.id)
        }
      }
      for (const e of entries) {
        await supabase.from("leaderboard").upsert({
          id: e.id ?? `lb-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: e.name,
          score: e.score,
          total_time_seconds: e.totalTimeSeconds ?? null,
          country: e.country ?? null,
          tournament_id: e.tournamentId ?? null,
          created_at: e.created_at ?? Date.now(),
          updated_at: Date.now()
        }, { onConflict: "id" })
      }
      return true
    } catch {
      return false
    }
  }
  return writeToFile(entries)
}
