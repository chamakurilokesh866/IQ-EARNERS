import { NextResponse } from "next/server"
import { getSettings } from "@/lib/settings"
import { getPayments } from "@/lib/payments"
import { getProfiles } from "@/lib/profiles"

export async function GET() {
  try {
    const [payments, settings, profiles] = await Promise.all([
      getPayments(),
      getSettings(),
      getProfiles()
    ])
    const targetAudience = Math.max(1, Number(settings?.targetAudience ?? 100))
    const baseCount = Number(settings?.progressBaseCount ?? 0)
    const lastResetAt = Number(settings?.lastResetAt ?? 0)

    // Count successful entry-fee payments strictly
    const entryTypes = ["entry", "tournament", "tournament_entry", "prize_entry"]
    const paidCount = payments.filter((p: any) => {
      if (p.status !== "success") return false
      // Exclude unblock payments from the "Launch Progress" count
      if (p.type === "unblock") return false
      // Only count payments made AFTER the last reset
      if (lastResetAt > 0 && (p.created_at ?? 0) < lastResetAt) return false
      // Include standard entry types or anything marked as entry/tournament
      return entryTypes.includes(p.type) || (p.gateway === "qr" && p.amount > 0)
    }).length

    // The user wants it "connected" to payments only now
    const effectiveCount = Math.max(0, paidCount + baseCount)
    const pct = Math.min(100, Math.max(0, Math.round((effectiveCount / targetAudience) * 100)))

    return NextResponse.json({
      ok: true,
      paidCount,
      activeType: "payments",
      lastResetAt,
      targetAudience,
      percentage: pct
    }, {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=5, must-revalidate" }
    })
  } catch {
    return NextResponse.json({
      ok: true,
      paidCount: 0,
      usernameCount: 0,
      activeType: "payments",
      targetAudience: 100,
      percentage: 0
    }, {
      headers: { "Cache-Control": "no-store, must-revalidate" }
    })
  }
}
