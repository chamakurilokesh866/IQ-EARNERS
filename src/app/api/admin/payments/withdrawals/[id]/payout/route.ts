import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { updatePayment } from "@/lib/payments"
import { audit } from "@/lib/audit"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }
  const { id } = await params
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 })

  const ok = await updatePayment(id, {
    status: "completed",
    confirmed_at: Date.now(),
    meta: { paidOut: true, paidOutAt: Date.now() }
  })

  if (!ok) {
    return NextResponse.json({ ok: false, error: "Failed to update" }, { status: 500 })
  }

  await audit(req, "withdrawal_payout", { paymentId: id })

  try {
    const { getPayments } = await import("@/lib/payments")
    const all = await getPayments()
    const payment = all.find((p) => p.id === id)
    const meta = (payment?.meta || {}) as Record<string, unknown>
    const username = String(meta.username ?? "")
    const amount = payment?.amount ?? 0
    if (username) {
      const adminEmail = process.env.ADMIN_EMAIL || ""
      if (adminEmail) {
        const { sendEmail } = await import("@/lib/email")
        const { getEmailTemplate } = await import("@/lib/emailTheme")
        sendEmail({
          to: adminEmail,
          subject: `Withdrawal ₹${amount} paid to ${username}`,
          html: getEmailTemplate({
            title: "IQ Earners",
            subtitle: "Withdrawal Completed",
            content: `₹${amount} has been paid out to <strong>${username}</strong>.`,
            footerText: `Payment ID: ${id}`
          })
        }).catch(() => {})
      }
    }
  } catch {}

  return NextResponse.json({ ok: true })
}
