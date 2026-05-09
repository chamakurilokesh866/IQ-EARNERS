/**
 * Profiles storage: Supabase (Vercel) with file fallback (local dev).
 */
import { createServerSupabase } from "./supabase"
import { promises as fs } from "fs"
import path from "path"

const FILE_PATH = path.join(process.cwd(), "src", "data", "profiles.json")

export type Profile = {
  uid: string
  username?: string
  email?: string
  referralCode?: string
  wallet?: number
  country?: string
  updated_at?: number
  paid?: "P" | "A"
  memberId?: string
  passwordHash?: string
  [key: string]: unknown
}

/** Generate unique member ID: P-00001, P-00002, ... for paid users */
export async function generateMemberId(): Promise<string> {
  const arr = await getProfiles()
  const memberIds = arr
    .map((p) => p.memberId)
    .filter((m): m is string => typeof m === "string" && /^P-\d{5}$/.test(m))
  let max = 0
  for (const m of memberIds) {
    const n = parseInt(m.replace("P-", ""), 10)
    if (!isNaN(n) && n > max) max = n
  }
  return `P-${String(max + 1).padStart(5, "0")}`
}

async function readFromFile(): Promise<Profile[]> {
  try {
    const txt = await fs.readFile(FILE_PATH, "utf-8")
    const arr = JSON.parse(txt || "[]")
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

async function writeToFile(arr: Profile[]): Promise<boolean> {
  try {
    const dir = path.dirname(FILE_PATH)
    await fs.mkdir(dir, { recursive: true }).catch(() => {})
    await fs.writeFile(FILE_PATH, JSON.stringify(arr, null, 2), "utf-8")
    return true
  } catch {
    return false
  }
}

/** Escape % and _ so ILIKE matches usernames literally (allowed chars include _ and .). */
function escapeForIlike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")
}

function mapSupabaseRow(r: Record<string, unknown>): Profile {
  const d = (r.data as Record<string, unknown>) || {}
  return {
    uid: String(r.uid ?? ""),
    username: typeof r.username === "string" ? r.username : undefined,
    referralCode: typeof r.referral_code === "string" ? r.referral_code : undefined,
    wallet: Number(r.wallet ?? 0),
    country: typeof r.country === "string" ? r.country : undefined,
    updated_at: r.updated_at != null ? Number(r.updated_at) : undefined,
    paid: d.paid as "P" | "A" | undefined,
    memberId: typeof d.memberId === "string" ? d.memberId : undefined,
    passwordHash: typeof d.passwordHash === "string" ? d.passwordHash : undefined,
    email: typeof d.email === "string" ? d.email : undefined,
    ...d
  }
}

export async function getProfiles(): Promise<Profile[]> {
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase.from("profiles").select("*")
      if (!error && Array.isArray(data)) {
        return data.map((r: Record<string, unknown>) => mapSupabaseRow(r))
      }
    } catch {}
  }
  return readFromFile()
}

export async function getProfileByUid(uid: string): Promise<Profile | null> {
  if (!uid) return null
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("uid", uid).maybeSingle()
      if (!error) {
        if (data) return mapSupabaseRow(data as Record<string, unknown>)
        return null
      }
    } catch {}
  }
  const arr = await readFromFile()
  return arr.find((p) => p.uid === uid) ?? null
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const trimmed = username.trim()
  if (!trimmed) return null
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .ilike("username", escapeForIlike(trimmed))
        .limit(1)
        .maybeSingle()
      if (!error) {
        if (data) return mapSupabaseRow(data as Record<string, unknown>)
        return null
      }
    } catch {}
  }
  const arr = await readFromFile()
  return arr.find((p) => String(p.username || "").toLowerCase() === trimmed.toLowerCase()) ?? null
}

export async function getProfileByReferralCode(code: string): Promise<Profile | null> {
  const arr = await getProfiles()
  return arr.find((p) => p.referralCode === code) ?? null
}

export async function getProfileByEmail(email: string): Promise<Profile | null> {
  if (!email || !String(email).includes("@")) return null
  const normalized = String(email).trim().toLowerCase()
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .contains("data", { email: normalized })
        .limit(1)
        .maybeSingle()
      if (!error) {
        if (data) return mapSupabaseRow(data as Record<string, unknown>)
        return null
      }
    } catch {}
  }
  const arr = await readFromFile()
  return arr.find((p) => String(p.email || "").toLowerCase() === normalized) ?? null
}

/** Format numeric referral code as IQREF-XX-XXX (e.g. 10001 → IQREF-10-001) */
export function formatReferralCode(num: number): string {
  const n = Math.floor(Number(num)) || 10001
  const part = n % 1000
  const group = Math.floor(n / 1000)
  return `IQREF-${group}-${String(part).padStart(3, "0")}`
}

/** Generate unique referral code: IQREF-10-001, IQREF-10-002, ... */
async function generateReferralCode(supabase: ReturnType<typeof createServerSupabase> | null): Promise<string> {
  if (supabase) {
    try {
      const { data } = await supabase.rpc("next_referral_code").single()
      const num = data ?? 10001
      return formatReferralCode(Number(num))
    } catch {
      // Fallback if RPC not set up
    }
  }
  const arr = await getProfiles()
  const taken = new Set(arr.map((p) => String(p.referralCode ?? "")))
  for (let i = 10001; i < 99999; i++) {
    const c = formatReferralCode(i)
    if (!taken.has(c)) return c
  }
  return formatReferralCode(Number(Date.now().toString().slice(-5)))
}

export async function upsertProfile(profile: Profile): Promise<boolean> {
  const supabase = createServerSupabase()
  const now = Date.now()
  const entry = {
    ...profile,
    referralCode: profile.referralCode || (await generateReferralCode(supabase)),
    wallet: typeof profile.wallet === "number" ? profile.wallet : 0,
    updated_at: now
  }

  if (supabase) {
    try {
      const data: Record<string, unknown> = {}
      if (entry.paid) data.paid = entry.paid
      if (entry.memberId) data.memberId = entry.memberId
      if (entry.passwordHash) data.passwordHash = entry.passwordHash
      if (typeof entry.email === "string" && entry.email.trim()) data.email = entry.email.trim().toLowerCase()
      const { error } = await supabase.from("profiles").upsert({
        uid: entry.uid,
        username: entry.username ?? null,
        referral_code: entry.referralCode ?? null,
        wallet: entry.wallet ?? 0,
        country: entry.country ?? null,
        data,
        created_at: entry.updated_at || now,
        updated_at: now
      }, { onConflict: "uid" })
      return !error
    } catch {
      return false
    }
  }
  const arr = await readFromFile()
  const idx = arr.findIndex((p) => p.uid === entry.uid)
  const merged = { ...(idx >= 0 ? arr[idx] : {}), ...entry } as Profile
  if (idx >= 0) arr[idx] = merged
  else arr.push(merged)
  return writeToFile(arr)
}

export async function updateProfileWallet(uid: string, delta: number): Promise<boolean> {
  const prof = await getProfileByUid(uid)
  if (!prof) return false
  const newWallet = Math.max(0, (prof.wallet ?? 0) + delta)
  return upsertProfile({ ...prof, wallet: newWallet })
}

export async function deleteProfileByUsername(username: string): Promise<boolean> {
  const prof = await getProfileByUsername(username)
  if (!prof) return false
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { error } = await supabase.from("profiles").delete().eq("uid", prof.uid)
      return !error
    } catch {
      return false
    }
  }
  const arr = await readFromFile()
  const next = arr.filter((p) => String(p.username || "").toLowerCase() !== username.toLowerCase())
  return next.length < arr.length && writeToFile(next)
}
