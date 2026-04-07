import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase"

export async function GET() {
  const supabase = createServerSupabase()
  if (!supabase) return NextResponse.json({ ok: true, data: [] }, { headers: { "Cache-Control": "public, max-age=60" } })
  try {
    const now = Date.now()
    const { data, error } = await supabase
      .from("quiz_schedule")
      .select("id, title, url, release_at, created_at")
      .lte("release_at", now)
      .not("url", "is", null)
      .order("release_at", { ascending: false })
    if (error) return NextResponse.json({ ok: true, data: [] }, { headers: { "Cache-Control": "public, max-age=60" } })
    const released = (data ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      url: r.url,
      releaseAt: r.release_at,
      createdAt: r.created_at
    }))
    return NextResponse.json({ ok: true, data: released }, { headers: { "Cache-Control": "public, max-age=60" } })
  } catch {
    return NextResponse.json({ ok: true, data: [] }, { headers: { "Cache-Control": "public, max-age=60" } })
  }
}
