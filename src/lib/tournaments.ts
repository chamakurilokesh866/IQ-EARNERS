/**
 * Tournaments storage: Supabase (production/Vercel) with file fallback (local dev).
 */
import { createServerSupabase } from "./supabase"
import { promises as fs } from "fs"
import path from "path"

const FILE_PATH = path.join(process.cwd(), "src", "data", "tournaments.json")

/** Generate a short unique code for a tournament (e.g. T-A1B2C3). */
export function generateTournamentCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = "T-"
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
  return code
}

export type Tournament = Record<string, unknown> & {
  id: string
  /** Short unique code per tournament (e.g. T-A1B2C3). */
  code?: string
  title?: string
  description?: string
  enrolled?: number
  [key: string]: unknown
}

async function readFromFile(): Promise<Tournament[]> {
  try {
    const txt = await fs.readFile(FILE_PATH, "utf-8")
    const arr = JSON.parse(txt || "[]")
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

async function writeToFile(arr: Tournament[]): Promise<boolean> {
  try {
    const dir = path.dirname(FILE_PATH)
    await fs.mkdir(dir, { recursive: true }).catch(() => {})
    await fs.writeFile(FILE_PATH, JSON.stringify(arr, null, 2), "utf-8")
    return true
  } catch {
    return false
  }
}

export async function getTournaments(): Promise<Tournament[]> {
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase.from("tournaments").select("*").order("created_at", { ascending: false })
      if (!error && Array.isArray(data)) {
        return data.map((r: { id: string; data: Record<string, unknown>; created_at?: number }) => ({
          id: r.id,
          ...(r.data as object),
          created_at: r.created_at
        })) as Tournament[]
      }
    } catch {}
  }
  return readFromFile()
}

export async function addTournament(t: Tournament): Promise<boolean> {
  const code = (t.code?.trim() ? t.code : generateTournamentCode()) as string
  const withCode = { ...t, code }
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { id, ...rest } = withCode
      const { error } = await supabase.from("tournaments").insert({
        id: id || String(Date.now()),
        data: rest,
        created_at: Date.now()
      })
      return !error
    } catch {
      return false
    }
  }
  const arr = await readFromFile()
  const item = { ...withCode, id: withCode.id || String(Date.now()), enrolled: withCode.enrolled ?? 0 }
  arr.push(item)
  return writeToFile(arr)
}

export async function updateTournament(id: string, updates: Partial<Tournament>): Promise<boolean> {
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { data: row } = await supabase.from("tournaments").select("data").eq("id", id).single()
      if (!row?.data) return false
      const next = { ...(row.data as object), ...updates }
      const { error } = await supabase.from("tournaments").update({ data: next }).eq("id", id)
      return !error
    } catch {
      return false
    }
  }
  const arr = await readFromFile()
  const idx = arr.findIndex((x) => x.id === id)
  if (idx === -1) return false
  arr[idx] = { ...arr[idx], ...updates }
  return writeToFile(arr)
}

export async function deleteTournament(id: string): Promise<boolean> {
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { error } = await supabase.from("tournaments").delete().eq("id", id)
      return !error
    } catch {
      return false
    }
  }
  const arr = await readFromFile()
  const next = arr.filter((x) => x.id !== id)
  return writeToFile(next)
}

export async function replaceTournaments(items: Tournament[]): Promise<boolean> {
  const withCodes = items.map((t) => (t.code?.trim() ? t : { ...t, code: generateTournamentCode() }))
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const newIds = new Set(withCodes.map((t) => t.id).filter(Boolean))
      const { data: existing } = await supabase.from("tournaments").select("id")
      for (const row of existing ?? []) {
        if (row.id && !newIds.has(row.id)) {
          await supabase.from("tournaments").delete().eq("id", row.id)
        }
      }
      for (const t of withCodes) {
        if (!t.id) continue
        const { id, ...rest } = t
        await supabase.from("tournaments").upsert({ id, data: rest, created_at: Date.now() }, { onConflict: "id" })
      }
      return true
    } catch {
      return false
    }
  }
  return writeToFile(withCodes)
}
