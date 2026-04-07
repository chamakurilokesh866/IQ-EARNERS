import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getReferrals } from "@/lib/referrals"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const list = await getReferrals()
  const credited = list.filter((r) => r.status === "credited")
  const totalEarnings = credited.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  return NextResponse.json({
    ok: true,
    data: {
      totalReferrals: list.length,
      totalEarnings,
      creditedCount: credited.length,
      pendingCount: list.filter((r) => r.status === "pending").length,
      visitedCount: list.filter((r) => r.status === "visited").length
    }
  })
}
