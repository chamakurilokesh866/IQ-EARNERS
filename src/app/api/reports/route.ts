import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerSupabase } from "@/lib/supabase"

const BUCKET = "uploads"
const STORAGE_PATH = "reports"

export async function POST(req: Request) {
  const supabase = createServerSupabase()
  if (!supabase) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 })
  try {
    const body = await req.json().catch(() => ({}))
    const reason = String(body?.reason ?? "").trim()
    const screenshot = body?.screenshot
    const pageUrl = body?.pageUrl ?? ""

    if (!reason) return NextResponse.json({ ok: false, error: "Reason required" }, { status: 400 })

    const cookieStore = await cookies()
    const username = cookieStore.get("username")?.value ?? ""
    const uid = cookieStore.get("uid")?.value ?? ""

    let screenshotUrl = ""
    if (screenshot && typeof screenshot === "string" && screenshot.startsWith("data:image")) {
      try {
        const base64 = screenshot.replace(/^data:image\/\w+;base64,/, "")
        const buf = Buffer.from(base64, "base64")
        const filename = `report-${Date.now()}.png`
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(`${STORAGE_PATH}/${filename}`, buf, {
          contentType: "image/png",
          upsert: true
        })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(`${STORAGE_PATH}/${filename}`)
          screenshotUrl = urlData?.publicUrl ?? ""
        }
      } catch {}
    }

    const id = String(Date.now())
    const { error: insertError } = await supabase.from("reports").insert({
      id,
      reason,
      screenshot_url: screenshotUrl,
      page_url: pageUrl,
      username: username ? decodeURIComponent(username) : "",
      uid,
      created_at: Date.now(),
      status: "pending"
    })
    if (insertError) return NextResponse.json({ ok: false, error: insertError.message || "Failed" }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: (e as Error).message || "Failed" }, { status: 500 })
  }
}
