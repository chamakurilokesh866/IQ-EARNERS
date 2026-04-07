import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { requireAdmin } from "@/lib/auth"

const AD_ANALYTICS_PATH = path.join(process.cwd(), "src", "data", "ad-analytics.json")
const ADS_PATH = path.join(process.cwd(), "src", "data", "ads.json")

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  let events: any[] = []
  let adsConfig: any = {}
  try {
    const txt = await fs.readFile(AD_ANALYTICS_PATH, "utf-8")
    events = JSON.parse(txt || "[]")
    if (!Array.isArray(events)) events = []
  } catch {}
  try {
    const txt = await fs.readFile(ADS_PATH, "utf-8")
    adsConfig = JSON.parse(txt || "{}")
  } catch {}

  const now = Date.now()
  const day = 24 * 60 * 60 * 1000

  const impressions = events.filter((e: any) => e.type === "impression")
  const clicks = events.filter((e: any) => e.type === "click")

  const slots = Array.isArray(adsConfig?.slots) ? adsConfig.slots : (Array.isArray(adsConfig?.snippets) ? adsConfig.snippets : [])
  const perSnippet = slots.map((s: any) => {
    const sImpressions = impressions.filter((e: any) => e.snippetId === s.id)
    const sClicks = clicks.filter((e: any) => e.snippetId === s.id)
    return {
      id: s.id,
      name: s.name,
      impressions: sImpressions.length,
      clicks: sClicks.length,
      ctr: sImpressions.length > 0 ? ((sClicks.length / sImpressions.length) * 100).toFixed(1) + "%" : "0%",
      impressionsToday: sImpressions.filter((e: any) => now - e.timestamp < day).length,
      clicksToday: sClicks.filter((e: any) => now - e.timestamp < day).length
    }
  })

  return NextResponse.json({
    ok: true,
    data: {
      totalImpressions: impressions.length,
      totalClicks: clicks.length,
      overallCtr: impressions.length > 0 ? ((clicks.length / impressions.length) * 100).toFixed(1) + "%" : "0%",
      impressionsToday: impressions.filter((e: any) => now - e.timestamp < day).length,
      clicksToday: clicks.filter((e: any) => now - e.timestamp < day).length,
      impressionsWeek: impressions.filter((e: any) => now - e.timestamp < 7 * day).length,
      clicksWeek: clicks.filter((e: any) => now - e.timestamp < 7 * day).length,
      perSnippet
    }
  })
}
