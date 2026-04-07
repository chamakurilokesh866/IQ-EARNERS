/**
 * Referrals storage: Supabase (Vercel) with file fallback (local dev).
 */
import { createServerSupabase } from "./supabase"
import { promises as fs } from "fs"
import path from "path"

const FILE_PATH = path.join(process.cwd(), "src", "data", "referrals.json")

export type Referral = {
  id: string
  referrerUid: string
  referrerCode: string
  referredUid?: string | null
  referredUsername?: string
  visitorId?: string
  status: "visited" | "pending" | "credited"
  amount: number
  paymentId?: string
  created_at: number
  updated_at?: number
}

async function readFromFile(): Promise<Referral[]> {
  try {
    const txt = await fs.readFile(FILE_PATH, "utf-8")
    const arr = JSON.parse(txt || "[]")
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

async function writeToFile(arr: Referral[]): Promise<boolean> {
  try {
    const dir = path.dirname(FILE_PATH)
    await fs.mkdir(dir, { recursive: true }).catch(() => {})
    await fs.writeFile(FILE_PATH, JSON.stringify(arr, null, 2), "utf-8")
    return true
  } catch {
    return false
  }
}

function mapRow(r: any): Referral {
  return {
    id: r.id,
    referrerUid: r.referrer_uid ?? r.referrerUid,
    referrerCode: r.referrer_code ?? r.referrerCode,
    referredUid: r.referred_uid ?? r.referredUid ?? null,
    referredUsername: r.referred_username ?? r.referredUsername,
    visitorId: r.visitor_id ?? r.visitorId,
    status: (r.status ?? "visited") as Referral["status"],
    amount: Number(r.amount ?? 50),
    paymentId: r.payment_id ?? r.paymentId,
    created_at: Number(r.created_at ?? 0),
    updated_at: r.updated_at ? Number(r.updated_at) : undefined
  }
}

export async function getReferrals(uid?: string): Promise<Referral[]> {
  const supabase = createServerSupabase()
  if (supabase && uid) {
    try {
      const safeUid = String(uid).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 128)
      if (!safeUid) return []
      const { data: asReferrer } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_uid", safeUid)
        .order("created_at", { ascending: false })
      const { data: asReferred } = await supabase
        .from("referrals")
        .select("*")
        .eq("referred_uid", safeUid)
        .order("created_at", { ascending: false })
      const merged = [...(asReferrer ?? []), ...(asReferred ?? [])]
      const seen = new Set<string>()
      const deduped = merged.filter((r) => {
        const id = r.id ?? (r as any).id
        if (seen.has(id)) return false
        seen.add(id)
        return true
      }).sort((a, b) => Number((b as any).created_at ?? 0) - Number((a as any).created_at ?? 0))
      return deduped.map(mapRow)
    } catch {}
  }
  if (supabase && !uid) {
    try {
      const { data, error } = await supabase.from("referrals").select("*").order("created_at", { ascending: false })
      if (!error && Array.isArray(data)) return data.map(mapRow)
    } catch {}
  }
  const arr = await readFromFile()
  if (uid) return arr.filter((r) => r.referrerUid === uid || r.referredUid === uid)
  return arr
}

export async function findReferralByVisitorNoReferred(visitorId: string, referrerUid: string): Promise<Referral | null> {
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { data } = await supabase
        .from("referrals")
        .select("*")
        .eq("visitor_id", visitorId)
        .eq("referrer_uid", referrerUid)
        .is("referred_uid", null)
        .limit(1)
        .maybeSingle()
      if (data) return mapRow(data)
    } catch {}
  }
  const arr = await readFromFile()
  return arr.find((r) => r.visitorId === visitorId && r.referrerUid === referrerUid && !r.referredUid) ?? null
}

export async function findReferralByVisitor(visitorId: string, referrerUid: string): Promise<Referral | null> {
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { data } = await supabase
        .from("referrals")
        .select("*")
        .eq("visitor_id", visitorId)
        .eq("referrer_uid", referrerUid)
        .limit(1)
        .single()
      if (data) return mapRow(data)
    } catch {}
  }
  const arr = await readFromFile()
  return arr.find((r) => r.visitorId === visitorId && r.referrerUid === referrerUid) ?? null
}

export async function findPendingReferralsByReferred(referredUid: string, referredUsername?: string): Promise<Referral[]> {
  const all = await getReferrals()
  const uidLower = referredUid.toLowerCase()
  const usernameLower = (referredUsername ?? "").toLowerCase()
  return all.filter((r) => r.status === "pending" && (
    (r.referredUid && r.referredUid.toLowerCase() === uidLower) ||
    (usernameLower && r.referredUsername && r.referredUsername.toLowerCase() === usernameLower)
  ))
}

export async function findReferralByReferred(referredUid: string, referrerUid: string): Promise<Referral | null> {
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { data } = await supabase
        .from("referrals")
        .select("*")
        .eq("referred_uid", referredUid)
        .eq("referrer_uid", referrerUid)
        .limit(1)
        .single()
      if (data) return mapRow(data)
    } catch {}
  }
  const arr = await readFromFile()
  return arr.find((r) => r.referredUid === referredUid && r.referrerUid === referrerUid) ?? null
}

export async function addReferral(ref: Referral): Promise<boolean> {
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { error } = await supabase.from("referrals").insert({
        id: ref.id,
        referrer_uid: ref.referrerUid,
        referrer_code: ref.referrerCode,
        referred_uid: ref.referredUid ?? null,
        referred_username: ref.referredUsername ?? null,
        visitor_id: ref.visitorId ?? null,
        status: ref.status,
        amount: ref.amount,
        created_at: ref.created_at,
        updated_at: ref.updated_at ?? null
      })
      return !error
    } catch {
      return false
    }
  }
  const arr = await readFromFile()
  arr.push(ref)
  return writeToFile(arr)
}

export async function updateReferral(id: string, updates: Partial<Referral>): Promise<boolean> {
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const payload: Record<string, unknown> = {}
      if (updates.referredUid !== undefined) payload.referred_uid = updates.referredUid
      if (updates.referredUsername !== undefined) payload.referred_username = updates.referredUsername
      if (updates.status !== undefined) payload.status = updates.status
      if (updates.paymentId !== undefined) payload.payment_id = updates.paymentId
      if (updates.updated_at !== undefined) payload.updated_at = updates.updated_at
      if (Object.keys(payload).length === 0) return true
      const { error } = await supabase.from("referrals").update(payload).eq("id", id)
      return !error
    } catch {
      return false
    }
  }
  const arr = await readFromFile()
  const idx = arr.findIndex((r) => r.id === id)
  if (idx === -1) return false
  arr[idx] = { ...arr[idx], ...updates, updated_at: Date.now() }
  return writeToFile(arr)
}
