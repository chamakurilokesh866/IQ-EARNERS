import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import os from "os"
import { rateLimit } from "@/lib/rateLimit"

// Use /tmp on Vercel (read-only filesystem elsewhere); fallback to project data dir in dev
const AD_ANALYTICS_PATH = process.env.VERCEL
  ? path.join(os.tmpdir(), "ad-analytics.json")
  : path.join(process.cwd(), "src", "data", "ad-analytics.json")

type AdEvent = {
  snippetId: string
  type: "impression" | "click"
  timestamp: number
  page?: string
}

async function appendEvent(event: AdEvent): Promise<void> {
  const dir = path.dirname(AD_ANALYTICS_PATH)
  await fs.mkdir(dir, { recursive: true }).catch(() => {})
  let arr: AdEvent[] = []
  try {
    const txt = await fs.readFile(AD_ANALYTICS_PATH, "utf-8")
    arr = JSON.parse(txt || "[]")
    if (!Array.isArray(arr)) arr = []
  } catch {
    arr = []
  }
  arr.push(event)
  if (arr.length > 20000) arr = arr.slice(-10000)
  try {
    await fs.writeFile(AD_ANALYTICS_PATH, JSON.stringify(arr, null, 2), "utf-8")
  } catch {
    // Vercel /tmp or permission issues — don't fail the request
  }
}

export async function POST(req: Request) {
  try {
    const rl = await rateLimit(req, "api").catch(() => ({ ok: true as const }))
    if (!rl.ok) return NextResponse.json({ ok: false }, { status: 429 })
    const body = await req.json().catch(() => ({}))
    const snippetId = typeof body?.snippetId === "string" ? body.snippetId.trim() : ""
    const type = body?.type === "impression" || body?.type === "click" ? body.type : null
    const page = typeof body?.page === "string" ? body.page : undefined
    if (!snippetId || !type) {
      return NextResponse.json({ ok: true }) // Accept but skip invalid payloads; never 500
    }
    await appendEvent({ snippetId, type, timestamp: Date.now(), page }).catch(() => {})
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true }) // Never 500; analytics are non-critical
  }
}
