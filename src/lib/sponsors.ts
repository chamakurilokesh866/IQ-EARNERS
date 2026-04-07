/**
 * Sponsors / promotions storage: Supabase (Vercel) with file fallback (local dev).
 */
import { createServerSupabase } from "./supabase"
import { promises as fs } from "fs"
import path from "path"

const FILE_PATH = path.join(process.cwd(), "src", "data", "sponsors.json")

export type SponsorKind = "sponsor" | "promotion" | "collaboration" | "university"
export type SponsorStatus = "pending" | "accepted" | "rejected"

export type SponsorRequest = {
  id: string
  code: string
  name: string
  email: string
  brand: string
  budget?: string
  message: string
  kind: SponsorKind
  status: SponsorStatus
  adminReply?: string
  uid?: string | null
  form_data?: Record<string, unknown>
  created_at: number
  updated_at?: number
}

async function readFromFile(): Promise<SponsorRequest[]> {
  try {
    const txt = await fs.readFile(FILE_PATH, "utf-8")
    const arr = JSON.parse(txt || "[]")
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

async function writeToFile(arr: SponsorRequest[]): Promise<boolean> {
  try {
    const dir = path.dirname(FILE_PATH)
    await fs.mkdir(dir, { recursive: true }).catch(() => {})
    await fs.writeFile(FILE_PATH, JSON.stringify(arr, null, 2), "utf-8")
    return true
  } catch {
    return false
  }
}

function mapRow(r: any): SponsorRequest {
  return {
    id: String(r.id),
    code: String(r.code ?? r.tracking_code ?? ""),
    name: String(r.name ?? ""),
    email: String(r.email ?? ""),
    brand: String(r.brand ?? ""),
    budget: r.budget != null ? String(r.budget) : undefined,
    message: String(r.message ?? ""),
    kind: (r.kind ?? "sponsor") as SponsorKind,
    status: (r.status ?? "pending") as SponsorStatus,
    adminReply: r.admin_reply ?? r.adminReply,
    uid: r.uid ?? null,
    form_data: r.form_data && typeof r.form_data === "object" ? r.form_data : undefined,
    created_at: Number(r.created_at ?? Date.now()),
    updated_at: r.updated_at ? Number(r.updated_at) : undefined
  }
}

export async function getSponsorRequests(): Promise<SponsorRequest[]> {
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("sponsor_requests")
        .select("*")
        .order("created_at", { ascending: false })
      if (!error && Array.isArray(data)) {
        return data.map(mapRow)
      }
    } catch {}
  }
  const arr = await readFromFile()
  return arr.sort((a, b) => b.created_at - a.created_at)
}

export async function getSponsorRequestByCode(code: string): Promise<SponsorRequest | null> {
  const normalized = String(code || "").trim().toUpperCase()
  if (!normalized) return null
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { data } = await supabase
        .from("sponsor_requests")
        .select("*")
        .ilike("code", normalized)
        .limit(1)
        .maybeSingle()
      if (data) return mapRow(data)
    } catch {}
  }
  const arr = await readFromFile()
  return arr.find((s) => s.code.toUpperCase() === normalized) ?? null
}

export async function addSponsorRequest(entry: SponsorRequest): Promise<boolean> {
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { error } = await supabase.from("sponsor_requests").insert({
        id: entry.id,
        code: entry.code,
        name: entry.name,
        email: entry.email,
        brand: entry.brand,
        budget: entry.budget ?? null,
        message: entry.message,
        kind: entry.kind,
        status: entry.status,
        admin_reply: entry.adminReply ?? null,
        uid: entry.uid ?? null,
        form_data: entry.form_data ?? null,
        created_at: entry.created_at,
        updated_at: entry.updated_at ?? null
      })
      return !error
    } catch {
      // fall through to file
    }
  }
  const arr = await readFromFile()
  arr.push(entry)
  return writeToFile(arr)
}

export async function updateSponsorRequest(id: string, updates: Partial<SponsorRequest>): Promise<boolean> {
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const payload: Record<string, unknown> = {}
      if (updates.status !== undefined) payload.status = updates.status
      if (updates.adminReply !== undefined) payload.admin_reply = updates.adminReply
      if (updates.updated_at !== undefined) payload.updated_at = updates.updated_at
      if (Object.keys(payload).length === 0) return true
      const { error } = await supabase.from("sponsor_requests").update(payload).eq("id", id)
      return !error
    } catch {
      // fall through to file
    }
  }
  const arr = await readFromFile()
  const idx = arr.findIndex((s) => s.id === id)
  if (idx === -1) return false
  arr[idx] = { ...arr[idx], ...updates, updated_at: Date.now() }
  return writeToFile(arr)
}

export async function deleteSponsorRequest(id: string): Promise<boolean> {
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { error } = await supabase.from("sponsor_requests").delete().eq("id", id)
      if (!error) return true
    } catch {
      // fall through to file
    }
  }
  const arr = await readFromFile()
  const next = arr.filter((s) => s.id !== id)
  if (next.length === arr.length) return false
  return writeToFile(next)
}
