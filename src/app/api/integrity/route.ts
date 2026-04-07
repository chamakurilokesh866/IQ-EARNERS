import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { promises as fs } from "fs"
import path from "path"
import { createServerSupabase } from "@/lib/supabase"
import { requireAdmin } from "@/lib/auth"

const INTEGRITY_LOG_PATH = path.join(process.cwd(), "src", "data", "integrity-events.log")

async function getUsername(): Promise<string | null> {
  try {
    const store = await cookies()
    const v = store.get("username")?.value
    if (!v) return null
    return decodeURIComponent(v.trim())
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null as any)
  if (!body || typeof body.type !== "string" || typeof body.reason !== "string") {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 })
  }

  const usernameFromCookie = await getUsername()
  if (!usernameFromCookie) {
    return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 })
  }
  const username = usernameFromCookie

  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  const meta = body.meta && typeof body.meta === "object" ? { ...body.meta } : {}
  if (typeof body.deviceFingerprint === "string" && body.deviceFingerprint.trim()) {
    meta.deviceFingerprint = body.deviceFingerprint.trim()
  }

  const record = { id, username, type: body.type.slice(0, 64), reason: body.reason.slice(0, 512), meta, created_at: Date.now() }
  const supabase = createServerSupabase()
  if (supabase) {
    const { error } = await supabase.from("integrity_events").insert(record)
    if (!error) return NextResponse.json({ ok: true })
  }
  try {
    await fs.mkdir(path.dirname(INTEGRITY_LOG_PATH), { recursive: true })
    await fs.appendFile(INTEGRITY_LOG_PATH, JSON.stringify(record) + "\n", "utf-8")
  } catch (e) {
    console.error("[integrity] file fallback failed:", e)
    if (!supabase) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 })
    return NextResponse.json({ ok: false, error: "Failed to log" }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  const supabase = createServerSupabase()
  if (!supabase) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 })

  const { data, error } = await supabase
    .from("integrity_events")
    .select("id, username, type, reason, meta, created_at")
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data: data ?? [] })
}

