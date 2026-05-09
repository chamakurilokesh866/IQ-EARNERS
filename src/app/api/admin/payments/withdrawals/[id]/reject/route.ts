import { NextResponse } from "next/server"
import { updatePayment, findPayment } from "@/lib/payments"
import { audit } from "@/lib/audit"
import { requireAdminPermission, requireRecentAdminAuth, withRefreshedAdminAuth } from "@/lib/auth"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const perm = await requireAdminPermission("payout.reject")
  if (!perm.ok) return NextResponse.json({ ok: false, error: perm.error }, { status: perm.status })
  const recent = await requireRecentAdminAuth()
  if (!recent.ok) return NextResponse.json({ ok: false, error: recent.error }, { status: recent.status })
  const { id } = await params
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 })

  const payment = await findPayment({ paymentId: id })
  if (!payment) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })

  const meta = (payment.meta || {}) as Record<string, unknown>
  const username = String(meta.username ?? "")
  const amount = payment.amount

  const ok = await updatePayment(id, {
    status: "rejected",
    meta: { ...meta, rejectedAt: Date.now() }
  })

  if (!ok) {
    return NextResponse.json({ ok: false, error: "Failed to update" }, { status: 500 })
  }

  // Refund wallet balance since withdrawal was rejected
  if (username && amount > 0) {
    try {
      const { getProfileByUsername, updateProfileWallet } = await import("@/lib/profiles")
      const profile = await getProfileByUsername(username)
      if (profile) {
        await updateProfileWallet(profile.uid, amount)
      }
    } catch {}
  }

  await audit(req, "withdrawal_rejected", { paymentId: id, username, amount })

  return withRefreshedAdminAuth(NextResponse.json({ ok: true }))
}
