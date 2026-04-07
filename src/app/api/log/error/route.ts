import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { requireAdmin } from "@/lib/auth"

const LOG_DIR = path.join(process.cwd(), "src", "logs")

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  await fs.mkdir(LOG_DIR, { recursive: true })
  const bodyTxt = await req.text()
  const d = new Date()
  const name = `errors-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}.log`
  const file = path.join(LOG_DIR, name)
  const ip = (req as any).headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() || (req as any).headers?.get?.("x-real-ip") || "unknown"
  const line = JSON.stringify({ ts: Date.now(), ip, body: bodyTxt })
  await fs.appendFile(file, line + "\n", "utf-8").catch(() => {})
  return NextResponse.json({ ok: true })
}
