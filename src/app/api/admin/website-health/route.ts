/**
 * Admin-only: Aggregate website health for Admin AI error analysis.
 */
import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getWebsiteHealth } from "@/lib/websiteHealth"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  const health = await getWebsiteHealth()
  return NextResponse.json({
    ok: true,
    ...health,
    checkedAt: new Date().toISOString()
  })
}
