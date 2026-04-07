import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { updatePayment, findPayment } from "@/lib/payments"
import { audit } from "@/lib/audit"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }
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

  return NextResponse.json({ ok: true })
}
