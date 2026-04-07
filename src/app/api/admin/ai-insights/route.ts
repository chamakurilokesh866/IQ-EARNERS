import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getEnterpriseState } from "@/lib/enterpriseStore"
import { DEMO_INSIGHT_DATA, type InsightData } from "@/lib/aiInsightsDemo"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const s = await getEnterpriseState()
  const raw = s.aiInsights.data
  const data: InsightData =
    raw && typeof raw === "object" && "performanceTrend" in (raw as object)
      ? (raw as InsightData)
      : DEMO_INSIGHT_DATA
  return NextResponse.json({ ok: true, data })
}
