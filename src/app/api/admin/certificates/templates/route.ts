import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerSupabase } from "@/lib/supabase"
import { getSettings, updateSettings } from "@/lib/settings"
import { promises as fs } from "fs"
import path from "path"

const BUCKET = "uploads"
const STORAGE_PATH = "certificates"
const TEMPLATES_PATH = path.join(process.cwd(), "src", "data", "certificate-templates.json")

function mapTypeToKey(type: string): "certFirst" | "certRunnerUp" | "certParticipation" {
  if (type === "runnerUp") return "certRunnerUp"
  if (type === "participation") return "certParticipation"
  return "certFirst"
}

function mapKeyToTemplate(data: Record<string, unknown>): { first: string; runnerUp: string; participation: string } {
  return {
    first: String(data.first ?? data.certFirst ?? ""),
    runnerUp: String(data.runnerUp ?? data.certRunnerUp ?? ""),
    participation: String(data.participation ?? data.certParticipation ?? "")
  }
}

export async function GET() {
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }
  const settings = await getSettings()
  const data = mapKeyToTemplate(settings as Record<string, unknown>)
  return NextResponse.json({ ok: true, data })
}

export async function POST(req: Request) {
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const type = body?.type === "runnerUp" || body?.type === "participation" ? body.type : "first"
  const base64 = body?.base64 && typeof body.base64 === "string" ? body.base64 : ""

  const supabase = createServerSupabase()
  if (supabase && base64) {
    try {
      const matches = base64.match(/^data:image\/(\w+);base64,(.+)$/)
      const buf = Buffer.from(matches ? matches[2] : base64, "base64")
      const ext = matches ? (matches[1] === "jpeg" ? "jpg" : matches[1]) : "png"
      const filename = `${type}.${ext}`
      const contentType = `image/${ext === "jpg" ? "jpeg" : ext}`
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(`${STORAGE_PATH}/${filename}`, buf, { contentType, upsert: true })
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(`${STORAGE_PATH}/${filename}`)
        const url = urlData?.publicUrl ?? ""
        await updateSettings({ [mapTypeToKey(type)]: url })
        return NextResponse.json({ ok: true })
      }
    } catch (e: unknown) {
      return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
    }
  }

  if (supabase && !base64) {
    await updateSettings({ [mapTypeToKey(type)]: "" })
    return NextResponse.json({ ok: true })
  }

  const data = JSON.parse(await fs.readFile(TEMPLATES_PATH, "utf-8").catch(() => "{}"))
  if (base64) data[type] = base64
  else delete data[type]
  await fs.writeFile(TEMPLATES_PATH, JSON.stringify(data, null, 2), "utf-8")
  return NextResponse.json({ ok: true })
}
