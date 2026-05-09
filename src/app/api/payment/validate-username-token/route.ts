import { NextResponse } from "next/server"
import { findPayment } from "@/lib/payments"
import { verifyUsernameToken } from "@/lib/usernameToken"
import { isCashfreeOrderPaidLive, syncCashfreeOrderIfPaid } from "@/lib/cashfreeSyncOrder"

/**
 * GET /api/payment/validate-username-token?token=...
 * Validates a username creation token.
 * Returns orderId/paymentId if valid; used by /create-username page.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")?.trim()
    if (!token) {
      return NextResponse.json({ ok: false, error: "Token required" }, { status: 400 })
    }

    const payload = verifyUsernameToken(token)
    if (!payload) {
      return NextResponse.json({ ok: false, error: "Invalid or expired token" }, { status: 403 })
    }

    let payment = payload.p
      ? await findPayment({ paymentId: payload.p })
      : await findPayment({ orderId: payload.o })
    if (!payment) {
      return NextResponse.json({ ok: false, error: "Payment not found" }, { status: 404 })
    }
    if (payment.status === "pending" && payment.gateway === "cashfree") {
      const orderForSync = (payload.o || payment.orderId || payment.cashfreeOrderId || "").trim()
      if (orderForSync) {
        const tid =
          typeof (payment.meta as Record<string, unknown> | undefined)?.tournamentId === "string"
            ? String((payment.meta as Record<string, unknown>).tournamentId)
            : null
        await syncCashfreeOrderIfPaid(orderForSync, tid)
        payment = payload.p
          ? await findPayment({ paymentId: payload.p })
          : await findPayment({ orderId: payload.o })
      }
    }
    if (!payment) {
      return NextResponse.json({ ok: false, error: "Payment not found" }, { status: 404 })
    }
    if (payment.gateway === "cashfree") {
      const oid = (payload.o || payment.orderId || payment.cashfreeOrderId || payment.paymentSessionId || "").trim()
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
      return NextResponse.json({ ok: false, error: "Username already created" }, { status: 403 })
    }

    return NextResponse.json({
      ok: true,
      orderId: payment.orderId ?? payment.cashfreeOrderId ?? payment.paymentSessionId ?? "",
      paymentId: payment.id
    })
  } catch {
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 })
  }
}
