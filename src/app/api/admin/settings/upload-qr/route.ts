import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { validateOrigin } from "@/lib/auth"
import { createServerSupabase } from "@/lib/supabase"
import { updateSettings, getSettings } from "@/lib/settings"
import { promises as fs } from "fs"
import path from "path"

const BUCKET = "uploads"
const STORAGE_PATH = "qr"
const FILE_PATH = path.join(process.cwd(), "public", "uploads", "qr", "payment-qr")

export async function POST(req: Request) {
  const originCheck = validateOrigin(req)
  if (originCheck === false) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }

  const formData = await req.formData().catch(() => null)
  if (!formData) return NextResponse.json({ ok: false, error: "Invalid form" }, { status: 400 })

  const file = formData.get("qr") as File | null
  if (!file || file.size === 0) return NextResponse.json({ ok: false, error: "No file uploaded" }, { status: 400 })

  const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
  if (!allowed.includes(file.type)) return NextResponse.json({ ok: false, error: "Image must be PNG, JPEG or WebP" }, { status: 400 })

  const ext = ["png", "jpg", "jpeg", "webp"].includes((file.name.split(".").pop() || "").toLowerCase())
    ? file.name.split(".").pop()!.toLowerCase()
    : "png"
  const safeExt = ext === "jpeg" ? "jpg" : ext
  const filename = `payment-qr.${safeExt}`

  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const buf = Buffer.from(await file.arrayBuffer())
      const contentType = file.type
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(`${STORAGE_PATH}/${filename}`, buf, { contentType, upsert: true })
      if (uploadError) return NextResponse.json({ ok: false, error: uploadError.message || "Upload failed" }, { status: 500 })

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(`${STORAGE_PATH}/${filename}`)
      const qrImageUrl = urlData?.publicUrl ?? ""
      const ok = await updateSettings({ qrImageUrl })
      if (!ok) return NextResponse.json({ ok: false, error: "Failed to save settings" }, { status: 500 })
      return NextResponse.json({ ok: true, qrImageUrl })
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e?.message || "Upload failed" }, { status: 500 })
    }
  }

  // Local fallback: write to public/uploads/qr
  try {
    const dir = path.dirname(FILE_PATH)
    await fs.mkdir(dir, { recursive: true })
    const outPath = `${FILE_PATH}.${safeExt}`
    const buf = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(outPath, buf)
    const qrImageUrl = `/uploads/qr/${filename}`
    const ok = await updateSettings({ qrImageUrl })
    if (!ok) return NextResponse.json({ ok: false, error: "Failed to save settings" }, { status: 500 })
    return NextResponse.json({ ok: true, qrImageUrl })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Upload failed" }, { status: 500 })
  }
}
