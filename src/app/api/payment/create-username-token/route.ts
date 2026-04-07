import { NextResponse } from "next/server"
import { findPayment } from "@/lib/payments"
import { signUsernameToken } from "@/lib/usernameToken"

/**
 * POST /api/payment/create-username-token
 * Creates a signed one-time token for username creation.
 * Requires: orderId (Cashfree) or paymentId (manual/QR).
 * Validates: payment exists, status=success, not yet consumed.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : ""
    const paymentId = typeof body?.paymentId === "string" ? body.paymentId.trim() : ""

    if (!orderId && !paymentId) {
      return NextResponse.json({ ok: false, error: "orderId or paymentId required" }, { status: 400 })
    }

    const payment = orderId
      ? await findPayment({ orderId })
      : await findPayment({ paymentId })
    if (!payment) {
      return NextResponse.json({ ok: false, error: "Payment not found" }, { status: 404 })
    }
    if (payment.status !== "success") {
      return NextResponse.json({ ok: false, error: "Payment not confirmed" }, { status: 403 })
    }
    if (payment.profileId) {
      return NextResponse.json({ ok: false, error: "Username already created for this payment" }, { status: 403 })
    }

    const oid = payment.orderId ?? payment.cashfreeOrderId ?? payment.paymentSessionId ?? ""
    const pid = payment.id
    const token = signUsernameToken(oid || undefined, pid)
    if (!token) {
      return NextResponse.json({ ok: false, error: "Token generation failed" }, { status: 500 })
    }

    return NextResponse.json({ ok: true, token })
  } catch {
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 })
  }
}
