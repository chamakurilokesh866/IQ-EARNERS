/**
 * Enrollments storage: Supabase (production) with file fallback (local dev).
 */
import { createServerSupabase } from "./supabase"
import { promises as fs } from "fs"
import path from "path"

const FILE_PATH = path.join(process.cwd(), "src", "data", "enrollments.json")

export type Enrollment = {
  username: string
  tournamentId: string
  paidAt: number
  uniqueCode?: string
}

async function readFromFile(): Promise<Enrollment[]> {
  try {
    const txt = await fs.readFile(FILE_PATH, "utf-8")
    const arr = JSON.parse(txt || "[]")
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

async function writeToFile(arr: Enrollment[]): Promise<boolean> {
  try {
    const dir = path.dirname(FILE_PATH)
    await fs.mkdir(dir, { recursive: true }).catch(() => {})
    await fs.writeFile(FILE_PATH, JSON.stringify(arr, null, 2), "utf-8")
    return true
  } catch {
    return false
  }
}

export async function getEnrollments(): Promise<Enrollment[]> {
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("enrollments")
        .select("*")
        .order("paid_at", { ascending: false })
      if (!error && Array.isArray(data)) {
        return data.map((r: any) => ({
          username: String(r.username ?? ""),
          tournamentId: String(r.tournament_id ?? ""),
          paidAt: Number(r.paid_at ?? 0),
          uniqueCode: r.unique_code ?? undefined
        }))
      }
    } catch {}
  }
  return readFromFile()
}

export async function getEnrollmentsByUsername(username: string): Promise<Enrollment[]> {
  const all = await getEnrollments()
  const unameLower = String(username ?? "").trim().toLowerCase()
  return all.filter((e) => String(e?.username ?? "").toLowerCase() === unameLower)
}

export async function isEnrolled(username: string, tournamentId: string): Promise<boolean> {
  const all = await getEnrollments()
  const unameLower = String(username ?? "").trim().toLowerCase()
  const tid = String(tournamentId ?? "").trim()
  return all.some(
    (e) => String(e?.username ?? "").toLowerCase() === unameLower && String(e?.tournamentId ?? "") === tid
  )
}

export async function addEnrollment(enrollment: Enrollment): Promise<boolean> {
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { error } = await supabase.from("enrollments").upsert(
        {
          username: enrollment.username.trim(),
          tournament_id: enrollment.tournamentId,
          unique_code: enrollment.uniqueCode ?? null,
          paid_at: enrollment.paidAt,
          created_at: Date.now()
        },
        { onConflict: "username,tournament_id" }
      )
      return !error
    } catch {
      return false
    }
  }
  const arr = await readFromFile()
  const unameLower = String(enrollment.username ?? "").trim().toLowerCase()
  const tid = String(enrollment.tournamentId ?? "").trim()
  const exists = arr.some(
    (e) => String(e?.username ?? "").toLowerCase() === unameLower && String(e?.tournamentId ?? "") === tid
  )
  if (exists) return true
  arr.push(enrollment)
  return writeToFile(arr)
}

export async function clearEnrollments(): Promise<boolean> {
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { error } = await supabase.from("enrollments").delete().neq("id", "")
      return !error
    } catch {
      return false
    }
  }
  return writeToFile([])
}
