import { NextResponse } from "next/server"
import { findPayment } from "@/lib/payments"
import { signUsernameToken } from "@/lib/usernameToken"
import { isCashfreeOrderPaidLive, syncCashfreeOrderIfPaid } from "@/lib/cashfreeSyncOrder"
import { verifyOrderProofCookieMatches, orderProofConfigured } from "@/lib/orderProofCookie"

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

    let payment = orderId
      ? await findPayment({ orderId })
      : await findPayment({ paymentId })
    if (!payment) {
      return NextResponse.json({ ok: false, error: "Payment not found" }, { status: 404 })
    }
    if (payment.status === "pending" && payment.gateway === "cashfree") {
      const orderForSync = (orderId || payment.orderId || payment.cashfreeOrderId || "").trim()
      if (orderForSync) {
        const tid =
          typeof (payment.meta as Record<string, unknown> | undefined)?.tournamentId === "string"
            ? String((payment.meta as Record<string, unknown>).tournamentId)
            : null
        await syncCashfreeOrderIfPaid(orderForSync, tid)
        payment = orderId
          ? await findPayment({ orderId })
          : await findPayment({ paymentId })
      }
    }
    if (!payment) {
      return NextResponse.json({ ok: false, error: "Payment not found" }, { status: 404 })
    }
    if (payment.gateway === "cashfree") {
      const oid = (orderId || payment.orderId || payment.cashfreeOrderId || payment.paymentSessionId || "").trim()
      if (oid) {
        const livePaid = await isCashfreeOrderPaidLive(oid)
        if (!livePaid) {
          return NextResponse.json({ ok: false, error: "Payment not confirmed" }, { status: 403 })
        }
      }
    }
    if (payment.status !== "success") {
      return NextResponse.json({ ok: false, error: "Payment not confirmed" }, { status: 403 })
    }
    if (payment.profileId) {
      return NextResponse.json({ ok: false, error: "Username already created for this payment" }, { status: 403 })
    }

    const oidForCookie = (orderId || payment.orderId || payment.cashfreeOrderId || payment.paymentSessionId || "").trim()
    // Session-bound order proof only when client looks up by orderId (same browser that started checkout).
    if (payment.gateway === "cashfree" && orderId && oidForCookie && orderProofConfigured()) {
      const cookieOk = await verifyOrderProofCookieMatches(oidForCookie)
      if (!cookieOk) {
        return NextResponse.json(
          {
            ok: false,
            error: "Open this link in the same browser where you paid, or return from the payment app to our site."
          },
          { status: 403 }
        )
      }
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
