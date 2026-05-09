import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { requireAdmin } from "@/lib/auth"
import { getPayments } from "@/lib/payments"
import { getProfiles } from "@/lib/profiles"
import { getEnterpriseState } from "@/lib/enterpriseStore"

async function exists(relPath: string): Promise<boolean> {
  try {
    await fs.access(path.join(process.cwd(), relPath))
    return true
  } catch {
    return false
  }
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  const [payments, profiles, enterprise, hasCi, hasE2E, hasEnvChecker] = await Promise.all([
    getPayments(),
    getProfiles(),
    getEnterpriseState(),
    exists("../.github/workflows/ci.yml"),
    exists("playwright.config.ts"),
    exists("scripts/check-env.js")
  ])

  const paidPayments = payments.filter((p) => p.status === "success" && p.type !== "withdraw")
  const revenueAllTime = paidPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  const paidProfiles = profiles.filter((p) => p.paid === "P" || Boolean(p.memberId)).length
  const totalProfiles = profiles.length
  const conversionRate = totalProfiles > 0 ? Number(((paidProfiles / totalProfiles) * 100).toFixed(2)) : 0

  const activeSubs = enterprise.subscriptions.filter((s) => s.status === "active")
  const mrr = activeSubs.reduce((sum, s) => {
    const amount = Number(s.amount ?? 0)
    if (amount > 0) return sum + amount
    const fallbackPlan = enterprise.plans.find((p) => p.id === s.planId)
    return sum + Number(fallbackPlan?.priceMonthly ?? 0)
  }, 0)

  const checklist = [
    { key: "ci", label: "CI pipeline configured", pass: hasCi },
    { key: "e2e", label: "E2E test framework configured", pass: hasE2E },
    { key: "env", label: "Environment validation script", pass: hasEnvChecker },
    { key: "plans", label: "Enterprise plans configured", pass: enterprise.plans.length > 0 },
    { key: "subscriptions", label: "Active paid subscriptions", pass: activeSubs.length > 0 },
    { key: "payments", label: "Successful payment history", pass: paidPayments.length > 0 }
  ]

  return NextResponse.json({
    ok: true,
    data: {
      generatedAt: new Date().toISOString(),
      business: {
        revenueAllTime,
        mrr,
        arrRunRate: mrr * 12,
        totalProfiles,
        paidProfiles,
        conversionRate
      },
      enterprise: {
        organizations: enterprise.organizations.length,
        subscriptions: enterprise.subscriptions.length,
        activeSubscriptions: activeSubs.length
      },
      technicalReadiness: checklist,
      riskNotes: [
        "Use retention cohorts (D7/D30) and churn trend for buyer-grade forecasting.",
        "Keep payout dispute SLA and webhook incident logs exportable for diligence.",
        "Run E2E and build checks before sharing snapshots with buyers."
      ]
    }
  })
}
