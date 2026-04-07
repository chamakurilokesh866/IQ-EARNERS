import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getEnterpriseState, patchEnterpriseState, recomputePlanSubscriberCounts } from "@/lib/enterpriseStore"
import type { EnterprisePlan } from "@/lib/enterpriseState"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const s = recomputePlanSubscriberCounts(await getEnterpriseState())
  return NextResponse.json({ ok: true, data: s.plans })
}

export async function PUT(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object" || typeof (body as EnterprisePlan).id !== "string") {
    return NextResponse.json({ ok: false, error: "Invalid plan" }, { status: 400 })
  }
  const incoming = body as EnterprisePlan
  const next = await patchEnterpriseState((s) => {
    const plans = s.plans.map((p) => (p.id === incoming.id ? { ...p, ...incoming } : p))
    return recomputePlanSubscriberCounts({ ...s, plans })
  })
  if (!next) return NextResponse.json({ ok: false, error: "Save failed" }, { status: 500 })
  return NextResponse.json({ ok: true, data: next.plans.find((p) => p.id === incoming.id) })
}
