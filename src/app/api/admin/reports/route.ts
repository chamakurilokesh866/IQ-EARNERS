import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerSupabase } from "@/lib/supabase"

export async function GET() {
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  const supabase = createServerSupabase()
  if (!supabase) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 })
  try {
    const { data, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false })
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    const items = (data ?? []).map((r) => ({
      id: r.id,
      reason: r.reason,
      screenshotUrl: r.screenshot_url,
      pageUrl: r.page_url,
      username: r.username,
      uid: r.uid,
      createdAt: r.created_at,
      status: r.status
    }))
    return NextResponse.json({ ok: true, data: items })
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  const supabase = createServerSupabase()
  if (!supabase) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 })
  const body = await req.json().catch(() => ({}))
  const id = body?.id
  const status = body?.status
  if (!id || !status) return NextResponse.json({ ok: false, error: "id and status required" }, { status: 400 })
  try {
    const { error } = await supabase.from("reports").update({ status }).eq("id", id)
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
