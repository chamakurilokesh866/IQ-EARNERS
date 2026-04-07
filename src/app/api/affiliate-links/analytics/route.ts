import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { requireAdmin } from "@/lib/auth"

const LINKS_PATH = path.join(process.cwd(), "src", "data", "affiliate-links.json")
const ANALYTICS_PATH = path.join(process.cwd(), "src", "data", "affiliate-analytics.json")

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  let links: any[] = []
  let events: any[] = []
  try {
    const txt = await fs.readFile(LINKS_PATH, "utf-8")
    links = JSON.parse(txt || "[]")
  } catch {}
  try {
    const txt = await fs.readFile(ANALYTICS_PATH, "utf-8")
    events = JSON.parse(txt || "[]")
  } catch {}

  const totalClicks = links.reduce((s: number, l: any) => s + (l.clicks ?? 0), 0)
  const totalImpressions = links.reduce((s: number, l: any) => s + (l.impressions ?? 0), 0)

  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const clicksToday = events.filter((e: any) => now - e.timestamp < day).length
  const clicksWeek = events.filter((e: any) => now - e.timestamp < 7 * day).length
  const clicksMonth = events.filter((e: any) => now - e.timestamp < 30 * day).length

  const topLinks = [...links]
    .sort((a: any, b: any) => (b.clicks ?? 0) - (a.clicks ?? 0))
    .slice(0, 10)
    .map((l: any) => ({ id: l.id, title: l.title, clicks: l.clicks, impressions: l.impressions, commission: l.commission }))

  return NextResponse.json({
    ok: true,
    data: { totalClicks, totalImpressions, clicksToday, clicksWeek, clicksMonth, topLinks, totalLinks: links.length }
  })
}
