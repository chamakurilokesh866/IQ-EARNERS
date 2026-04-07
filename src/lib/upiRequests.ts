/**
 * UPI request state: Supabase (Vercel) with file fallback (local dev).
 */
import { createServerSupabase } from "./supabase"
import { promises as fs } from "fs"
import path from "path"

const FILE_PATH = path.join(process.cwd(), "src", "data", "upi-requests.json")
const ROW_ID = "main"

export type UpiRequestState = {
  active: { id: string; targetUsername: string; message: string; status: string; createdAt: number; rank?: number } | null
  pendingNext: { targetUsername: string; message: string; rank?: number } | null
  history: Array<{
    id: string
    targetUsername: string
    message: string
    status: string
    upiId?: string
    action?: string
    respondedAt?: number
  }>
}

const defaultState: UpiRequestState = { active: null, pendingNext: null, history: [] }

async function readFromFile(): Promise<UpiRequestState> {
  try {
    const txt = await fs.readFile(FILE_PATH, "utf-8")
    const d = JSON.parse(txt || "{}")
    return {
      active: d.active ?? null,
      pendingNext: d.pendingNext ?? null,
      history: Array.isArray(d.history) ? d.history : []
    }
  } catch {
    return { ...defaultState }
  }
}

async function writeToFile(state: UpiRequestState): Promise<boolean> {
  try {
    const dir = path.dirname(FILE_PATH)
    await fs.mkdir(dir, { recursive: true }).catch(() => {})
    await fs.writeFile(FILE_PATH, JSON.stringify(state, null, 2), "utf-8")
    return true
  } catch {
    return false
  }
}

export async function getUpiRequestState(): Promise<UpiRequestState> {
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("upi_request_state")
        .select("active, pending_next, history")
        .eq("id", ROW_ID)
        .maybeSingle()
      if (!error && data) {
        return {
          active: data.active as UpiRequestState["active"],
          pendingNext: data.pending_next as UpiRequestState["pendingNext"],
          history: Array.isArray(data.history) ? data.history : []
        }
      }
    } catch {}
  }
  return readFromFile()
}

export async function setUpiRequestState(state: UpiRequestState): Promise<boolean> {
  const supabase = createServerSupabase()
  const now = Date.now()
  if (supabase) {
    try {
      const { error } = await supabase.from("upi_request_state").upsert({
        id: ROW_ID,
        active: state.active,
        pending_next: state.pendingNext,
        history: state.history,
        updated_at: now
      }, { onConflict: "id" })
      return !error
    } catch {
      return false
    }
  }
  return writeToFile(state)
}
