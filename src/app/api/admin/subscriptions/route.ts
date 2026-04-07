import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getEnterpriseState, recomputePlanSubscriberCounts } from "@/lib/enterpriseStore"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const s = recomputePlanSubscriberCounts(await getEnterpriseState())
  return NextResponse.json({ ok: true, data: s.subscriptions })
}
