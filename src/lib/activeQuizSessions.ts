/**
 * Active tournament quiz sessions: one per user per tournament at a time.
 * Prevents same user from playing the same tournament on multiple devices.
 */
import { createServerSupabase } from "./supabase"
import { promises as fs } from "fs"
import path from "path"

const FILE_PATH = path.join(process.cwd(), "src", "data", "active-quiz-sessions.json")
const SESSION_TTL_MS = 1000 * 60 * 5 // 5 minutes – active heartbeat Required

export type ActiveQuizSession = {
  username: string
  tournamentId: string
  sessionId: string
  deviceFingerprint?: string
  startedAt: number
}

async function readFromFile(): Promise<ActiveQuizSession[]> {
  try {
    const txt = await fs.readFile(FILE_PATH, "utf-8")
    const arr = JSON.parse(txt || "[]")
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

async function writeToFile(arr: ActiveQuizSession[]): Promise<boolean> {
  try {
    const dir = path.dirname(FILE_PATH)
    await fs.mkdir(dir, { recursive: true }).catch(() => {})
    await fs.writeFile(FILE_PATH, JSON.stringify(arr, null, 2), "utf-8")
    return true
  } catch {
    return false
  }
}

function isExpired(s: ActiveQuizSession, now: number): boolean {
  return now - s.startedAt > SESSION_TTL_MS
}

export async function getActiveQuizSession(
  username: string,
  tournamentId: string
): Promise<ActiveQuizSession | null> {
  const now = Date.now()
  const unameLower = String(username ?? "").trim().toLowerCase()
  const tid = String(tournamentId ?? "").trim()
  if (!unameLower || !tid) return null

  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("active_quiz_sessions")
        .select("*")
        .ilike("username", username.trim())
        .eq("tournament_id", tid)
        .order("started_at", { ascending: false })
        .limit(1)
      if (!error && Array.isArray(data) && data[0]) {
        const row = data[0] as any
        const s: ActiveQuizSession = {
          username: String(row.username ?? ""),
          tournamentId: String(row.tournament_id ?? ""),
          sessionId: String(row.session_id ?? ""),
          deviceFingerprint: row.device_fingerprint ?? undefined,
          startedAt: Number(row.started_at ?? 0)
        }
        if (!isExpired(s, now)) return s
      }
    } catch {}
  }

  const arr = await readFromFile()
  const active = arr
    .filter(
      (s) =>
        String(s?.username ?? "").toLowerCase() === unameLower &&
        String(s?.tournamentId ?? "") === tid &&
        !isExpired(s, now)
    )
    .sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0))
  return active[0] ?? null
}

export async function startQuizSession(params: {
  username: string
  tournamentId: string
  sessionId: string
  deviceFingerprint?: string
}): Promise<{ ok: boolean; error?: string }> {
  const now = Date.now()
  const unameLower = String(params.username ?? "").trim().toLowerCase()
  const tid = String(params.tournamentId ?? "").trim()
  if (!unameLower || !tid) return { ok: false, error: "Missing username or tournamentId" }

  const existing = await getActiveQuizSession(params.username, params.tournamentId)
  if (existing && existing.sessionId !== params.sessionId) {
    return { ok: false, error: "Another browser or device is already running this quiz with your account. Only one active session is allowed at a time." }
  }

  const session: ActiveQuizSession = {
    username: params.username.trim(),
    tournamentId: tid,
    sessionId: params.sessionId,
    deviceFingerprint: params.deviceFingerprint,
    startedAt: now
  }

  const supabase = createServerSupabase()
  if (supabase) {
    try {
      // Refresh by delete + insert (Effectively an UPSERT with timestamp update)
      await supabase.from("active_quiz_sessions").delete().ilike("username", params.username.trim()).eq("tournament_id", tid)
      const { error } = await supabase.from("active_quiz_sessions").insert({
        username: params.username.trim(),
        tournament_id: tid,
        session_id: params.sessionId,
        device_fingerprint: params.deviceFingerprint ?? null,
        started_at: now
      })
      if (!error) return { ok: true }
    } catch {}
  }

  const arr = await readFromFile()
  const filtered = arr.filter(
    (s) =>
      !(
        String(s?.username ?? "").toLowerCase() === unameLower &&
        String(s?.tournamentId ?? "") === tid
      )
  )
  filtered.push(session)
  return (await writeToFile(filtered)) ? { ok: true } : { ok: false, error: "Failed to start session" }
}

export async function endQuizSession(username: string, tournamentId: string, sessionId: string): Promise<void> {
  const unameLower = String(username ?? "").trim().toLowerCase()
  const tid = String(tournamentId ?? "").trim()
  if (!unameLower || !tid) return

  const supabase = createServerSupabase()
  if (supabase) {
    try {
      await supabase
        .from("active_quiz_sessions")
        .delete()
        .ilike("username", username.trim())
        .eq("tournament_id", tid)
        .eq("session_id", sessionId)
      return
    } catch {}
  }

  const arr = await readFromFile()
  const filtered = arr.filter(
    (s) =>
      !(
        String(s?.username ?? "").toLowerCase() === unameLower &&
        String(s?.tournamentId ?? "") === tid &&
        s.sessionId === sessionId
      )
  )
  await writeToFile(filtered)
}
