import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerSupabase } from "@/lib/supabase"

const BUCKET = "uploads"
const STORAGE_PATH = "scheduled"

export async function GET() {
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  const supabase = createServerSupabase()
  if (!supabase) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 })
  try {
    const { data, error } = await supabase.from("quiz_schedule").select("*").order("created_at", { ascending: false })
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    const items = (data ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      filename: r.filename,
      url: r.url,
      releaseAt: r.release_at,
      createdAt: r.created_at
    }))
    return NextResponse.json({ ok: true, data: items })
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  const supabase = createServerSupabase()
  if (!supabase) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 })

  const formData = await req.formData().catch(() => null)
  if (!formData) return NextResponse.json({ ok: false, error: "Invalid form" }, { status: 400 })

  const file = formData.get("pdf") as File | null
  const title = String(formData.get("title") || "Quiz Material").trim()
  const releaseAt = formData.get("releaseAt") as string | null

  if (!file || file.size === 0) return NextResponse.json({ ok: false, error: "No PDF uploaded" }, { status: 400 })
  if (file.type !== "application/pdf") return NextResponse.json({ ok: false, error: "File must be PDF" }, { status: 400 })
  if (!releaseAt) return NextResponse.json({ ok: false, error: "Release date/time required" }, { status: 400 })

  const releaseMs = new Date(releaseAt).getTime()
  if (isNaN(releaseMs)) return NextResponse.json({ ok: false, error: "Invalid date/time" }, { status: 400 })

  try {
    const id = String(Date.now())
    const filename = `${id}.pdf`
    const buf = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(`${STORAGE_PATH}/${filename}`, buf, {
      contentType: "application/pdf",
      upsert: true
    })
    if (uploadError) return NextResponse.json({ ok: false, error: uploadError.message || "Upload failed" }, { status: 500 })

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(`${STORAGE_PATH}/${filename}`)
    const url = urlData?.publicUrl ?? ""

    const { error: insertError } = await supabase.from("quiz_schedule").insert({
      id,
      title,
      filename,
      url,
      release_at: releaseMs,
      created_at: Date.now()
    })
    if (insertError) return NextResponse.json({ ok: false, error: insertError.message || "Insert failed" }, { status: 500 })

    return NextResponse.json({ ok: true, id })
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: (e as Error).message || "Upload failed" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  const supabase = createServerSupabase()
  if (!supabase) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 })

  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 })

  try {
    const { data: rows } = await supabase.from("quiz_schedule").select("filename").eq("id", id).single()
    if (rows?.filename) {
      await supabase.storage.from(BUCKET).remove([`${STORAGE_PATH}/${rows.filename}`])
    }
    await supabase.from("quiz_schedule").delete().eq("id", id)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
