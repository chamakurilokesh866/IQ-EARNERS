import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { rateLimit } from "@/lib/rateLimit"

const DATA_PATH = path.join(process.cwd(), "src", "data", "affiliate-links.json")
const ANALYTICS_PATH = path.join(process.cwd(), "src", "data", "affiliate-analytics.json")

type AffiliateLink = {
  id: string
  url: string
  clicks: number
  impressions: number
  [k: string]: unknown
}

type ClickEvent = {
  linkId: string
  timestamp: number
  referer?: string
}

async function readLinks(): Promise<AffiliateLink[]> {
  try {
    const txt = await fs.readFile(DATA_PATH, "utf-8")
    const arr = JSON.parse(txt || "[]")
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}

async function writeLinks(arr: AffiliateLink[]): Promise<void> {
  const dir = path.dirname(DATA_PATH)
  await fs.mkdir(dir, { recursive: true }).catch(() => {})
  await fs.writeFile(DATA_PATH, JSON.stringify(arr, null, 2), "utf-8")
}

async function appendAnalytics(event: ClickEvent): Promise<void> {
  const dir = path.dirname(ANALYTICS_PATH)
  await fs.mkdir(dir, { recursive: true }).catch(() => {})
  let arr: ClickEvent[] = []
  try {
    const txt = await fs.readFile(ANALYTICS_PATH, "utf-8")
    arr = JSON.parse(txt || "[]")
    if (!Array.isArray(arr)) arr = []
  } catch {}
  arr.push(event)
  if (arr.length > 10000) arr = arr.slice(-5000)
  await fs.writeFile(ANALYTICS_PATH, JSON.stringify(arr, null, 2), "utf-8")
}

export async function POST(req: Request) {
  const rl = await rateLimit(req, "api")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 })
  const body = await req.json().catch(() => ({}))
  const id = body?.id
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 })
  const links = await readLinks()
  const idx = links.findIndex((l) => l.id === id)
  if (idx === -1) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 })
  links[idx].clicks = (links[idx].clicks ?? 0) + 1
  await writeLinks(links)
  await appendAnalytics({
    linkId: id,
    timestamp: Date.now(),
    referer: req.headers.get("referer") ?? undefined
  })
  return NextResponse.json({ ok: true, url: links[idx].url })
}
