import { NextResponse } from "next/server"
import { findPayment } from "@/lib/payments"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const orderId = url.searchParams.get("orderId")
  const paymentId = url.searchParams.get("paymentId")

  if (!orderId && !paymentId) {
    return NextResponse.json({ ok: false, error: "orderId or paymentId required" }, { status: 400 })
  }

  const payment = await findPayment(orderId ? { orderId } : { paymentId: paymentId as string })

  if (!payment) {
    return NextResponse.json({ ok: false, error: "Payment not found" }, { status: 404 })
  }

  return NextResponse.json({
    ok: true,
    status: payment.status,
    paymentId: payment.id,
    orderId: payment.orderId,
    amount: payment.amount
  })
}
