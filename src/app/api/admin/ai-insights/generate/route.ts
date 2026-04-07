import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { chatCompletionForAdminAI, isAdminAiConfigured } from "@/lib/aiGateway"
import { patchEnterpriseState } from "@/lib/enterpriseStore"
import { DEMO_INSIGHT_DATA, parseInsightJson, type InsightData } from "@/lib/aiInsightsDemo"

const SYSTEM = `You are an analytics engine for an edtech quiz platform. Output ONLY valid JSON matching this TypeScript shape (no markdown):
{
  "performanceTrend": { "month": string, "avgScore": number, "participation": number }[],
  "difficultyAnalysis": { "category": string, "avgScore": number, "totalAttempts": number, "hardestTopic": string }[],
  "predictions": { "metric": string, "current": number, "predicted": number, "confidence": number, "trend": "up"|"down"|"stable" }[],
  "aiRecommendations": { "title": string, "description": string, "impact": "high"|"medium"|"low", "category": string }[],
  "cheatRiskScore": number,
  "engagementScore": number,
  "retentionRate": number,
  "averageSessionDuration": number
}
Use plausible numbers. Include at least 4 months in performanceTrend, 5 difficulty rows, 4 predictions, 6 recommendations.`

export async function POST() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  let data: InsightData = DEMO_INSIGHT_DATA

  if (isAdminAiConfigured()) {
    const user = `Generate fresh admin dashboard insights for today (${new Date().toISOString().slice(0, 10)}). Vary metrics slightly from typical SaaS quiz apps in India. JSON only.`
    const res = await chatCompletionForAdminAI(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: user }
      ],
      { temperature: 0.5, max_tokens: 4096 }
    )
    if (res.ok && res.content) {
      data = parseInsightJson(res.content)
    }
  }

  const next = await patchEnterpriseState((s) => ({
    ...s,
    aiInsights: { data, updatedAt: Date.now() }
  }))
  if (!next) return NextResponse.json({ ok: false, error: "Save failed" }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}
