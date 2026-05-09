import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { createServerSupabase } from "@/lib/supabase"

type TimelineItem = {
  id: string
  when: number
  username: string
  type: string
  reason: string
  risk: number
}

function riskFrom(type: string, reason: string): number {
  const t = String(type).toLowerCase()
  const r = String(reason).toLowerCase()
  let score = 30
  if (t.includes("multiple_browser") || r.includes("multiple")) score += 40
  if (t.includes("tab") || r.includes("fullscreen")) score += 20
  if (t.includes("time_consistency") || r.includes("suspicious")) score += 25
  if (r.includes("blocked")) score += 20
  return Math.max(0, Math.min(100, score))
}

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  const url = new URL(req.url)
  const limit = Math.max(5, Math.min(100, Number(url.searchParams.get("limit") ?? 40)))

  const supabase = createServerSupabase()
  if (!supabase) return NextResponse.json({ ok: true, data: [] })

  const { data, error } = await supabase
    .from("integrity_events")
    .select("id, username, type, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const items: TimelineItem[] = (data ?? []).map((row: any) => ({
    id: String(row?.id ?? ""),
    when: Number(row?.created_at ?? 0),
    username: String(row?.username ?? "unknown"),
    type: String(row?.type ?? "integrity_event"),
    reason: String(row?.reason ?? ""),
    risk: riskFrom(String(row?.type ?? ""), String(row?.reason ?? ""))
  }))

  return NextResponse.json({ ok: true, data: items })
}
