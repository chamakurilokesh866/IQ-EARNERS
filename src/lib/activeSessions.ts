import { createServerSupabase } from "./supabase"
import { promises as fs } from "fs"
import path from "path"

const FILE_PATH = path.join(process.cwd(), "src", "data", "active-sessions.json")
/** No server-side activity (heartbeat / touch) for this long → session invalid */
export const SESSION_IDLE_MS = 1000 * 60 * 60 // 1 hour (heartbeats keep last_seen fresh)
const SESSION_TTL_MS = 1000 * 60 * 60 * 12 // absolute cap from login time

export type ActiveSession = {
  uid: string
  sid: string
  created_at: number
  last_seen?: number
  logged_out_at?: number
  userAgent?: string | null
  ip?: string | null
}

async function readFromFile(): Promise<ActiveSession[]> {
  try {
    const txt = await fs.readFile(FILE_PATH, "utf-8")
    const arr = JSON.parse(txt || "[]")
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

async function writeToFile(arr: ActiveSession[]): Promise<boolean> {
  try {
    const dir = path.dirname(FILE_PATH)
    await fs.mkdir(dir, { recursive: true }).catch(() => {})
    await fs.writeFile(FILE_PATH, JSON.stringify(arr, null, 2), "utf-8")
    return true
  } catch {
    return false
  }
}

function ms(n: unknown, fallback: number): number {
  const v = typeof n === "number" ? n : Number(n)
  return Number.isFinite(v) ? v : fallback
}

function rowToSession(r: Record<string, unknown>, fallbackNow: number): ActiveSession {
  return {
    uid: String(r.uid ?? ""),
    sid: String(r.sid ?? ""),
    created_at: ms(r.created_at, fallbackNow),
    last_seen: r.last_seen != null && r.last_seen !== "" ? ms(r.last_seen, fallbackNow) : undefined,
    logged_out_at: r.logged_out_at != null && r.logged_out_at !== "" ? ms(r.logged_out_at, fallbackNow) : undefined,
    userAgent: (r.user_agent as string) ?? null,
    ip: (r.ip as string) ?? null
  }
}

function isActive(s: ActiveSession, now: number): boolean {
  if (!Number.isFinite(s.created_at) || s.created_at <= 0) return false
  if (s.logged_out_at && s.logged_out_at <= now) return false
  if (now - s.created_at > SESSION_TTL_MS) return false
  const lastActivity = s.last_seen ?? s.created_at
  if (!Number.isFinite(lastActivity)) return false
  if (now - lastActivity > SESSION_IDLE_MS) return false
  return true
}

/** Exact uid+sid row — fixes false negatives when multiple rows or ordering glitches. */
async function getSessionByUidAndSid(uid: string, sid: string): Promise<ActiveSession | null> {
  const supabase = createServerSupabase()
  const now = Date.now()
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("active_sessions")
        .select("*")
        .eq("uid", uid)
        .eq("sid", sid)
        .order("created_at", { ascending: false })
        .limit(1)

      const row = Array.isArray(data) && data[0] ? (data[0] as Record<string, unknown>) : null
      if (!error && row) {
        const s = rowToSession(row, now)
        if (s.uid === uid && s.sid === sid && isActive(s, now)) return s
      }
    } catch {
      // file fallback
    }
  }
  const arr = await readFromFile()
  const s = arr.find((x) => x.uid === uid && x.sid === sid)
  if (!s) return null
  return isActive(s, now) ? s : null
}

export async function getActiveSessionForUid(uid: string): Promise<ActiveSession | null> {
  const supabase = createServerSupabase()
  const now = Date.now()

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("active_sessions")
        .select("*")
        .eq("uid", uid)
        .order("created_at", { ascending: false })
        .limit(5)

      if (!error && Array.isArray(data)) {
        const first = (data as Record<string, unknown>[])
          .map((r) => rowToSession(r, now))
          .find((s) => isActive(s, now))
        if (first) return first
      }
    } catch {
      // fall through to file
    }
  }

  const arr = await readFromFile()
  return arr
    .filter((s) => s.uid === uid)
    .sort((a, b) => b.created_at - a.created_at)
    .find((s) => isActive(s, now)) ?? null
}

export async function startSession(params: {
  uid: string
  sid: string
  userAgent?: string | null
  ip?: string | null
}): Promise<void> {
  const supabase = createServerSupabase()
  const now = Date.now()

  if (supabase) {
    try {
      await supabase.from("active_sessions").update({ logged_out_at: now }).eq("uid", params.uid)

      const { error: insertErr } = await supabase.from("active_sessions").insert({
        uid: params.uid,
        sid: params.sid,
        created_at: now,
        last_seen: now,
        user_agent: params.userAgent ?? null,
        ip: params.ip ?? null
      })
      if (!insertErr) return
      if (process.env.NODE_ENV === "development") {
        console.warn("[activeSessions] Supabase insert failed, using file store:", insertErr)
      }
    } catch (e) {
      if (process.env.NODE_ENV === "development") console.warn("[activeSessions] Supabase startSession error:", e)
    }
  }

  const arr = await readFromFile()
  const filtered = arr.filter((s) => s.uid !== params.uid)
  filtered.push({
    uid: params.uid,
    sid: params.sid,
    created_at: now,
    last_seen: now,
    logged_out_at: undefined,
    userAgent: params.userAgent ?? null,
    ip: params.ip ?? null
  })
  await writeToFile(filtered)
}

/** True when this uid/sid is the current valid server session (single device + idle window). */
export async function isUserSessionValid(uid: string, sid: string): Promise<boolean> {
  if (!uid || !sid) return false
  const exact = await getSessionByUidAndSid(uid, sid)
  if (exact) return true
  const active = await getActiveSessionForUid(uid)
  return !!active && active.sid === sid
}

/** Refresh idle timer (call from heartbeat). Returns false if sid is not current. */
export async function touchSession(uid: string, sid: string): Promise<boolean> {
  if (!uid || !sid) return false
  const ok = await isUserSessionValid(uid, sid)
  if (!ok) return false

  const supabase = createServerSupabase()
  const now = Date.now()

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("active_sessions")
        .update({ last_seen: now })
        .eq("uid", uid)
        .eq("sid", sid)
        .is("logged_out_at", null)
        .select("sid")
      if (!error && Array.isArray(data) && data.length > 0) return true

      // Some DB states return 0 rows with no error; retry without logged_out filter
      if (!error) {
        const { data: d2, error: e2 } = await supabase
          .from("active_sessions")
          .update({ last_seen: now })
          .eq("uid", uid)
          .eq("sid", sid)
          .select("sid")
        if (!e2 && Array.isArray(d2) && d2.length > 0) return true
      }
    } catch {
      // fall through to file
    }
  }

  const arr = await readFromFile()
  let hit = false
  const next = arr.map((s) => {
    if (s.uid === uid && s.sid === sid && !s.logged_out_at) {
      hit = true
      return { ...s, last_seen: now }
    }
    return s
  })
  if (hit) await writeToFile(next)
  return hit
}

export async function endSession(uid: string, sid: string): Promise<void> {
  const supabase = createServerSupabase()
  const now = Date.now()

  if (supabase) {
    try {
      await supabase
        .from("active_sessions")
        .update({ logged_out_at: now, last_seen: now })
        .eq("uid", uid)
        .eq("sid", sid)
      return
    } catch {
      // fall through to file
    }
  }

  const arr = await readFromFile()
  const next = arr.map((s) =>
    s.uid === uid && s.sid === sid
      ? { ...s, logged_out_at: now, last_seen: now }
      : s
  )
  await writeToFile(next)
}

