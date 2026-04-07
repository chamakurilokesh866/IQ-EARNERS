import { NextResponse } from "next/server"
import { findPayment } from "@/lib/payments"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  const orderId = url.searchParams.get("orderId")
  const detail = url.searchParams.get("detail") === "1" || url.searchParams.get("full") === "1"
  if (!id && !orderId) return NextResponse.json({ ok: false, error: "id or orderId required" }, { status: 400 })
  const payment = await findPayment(id ? { paymentId: id } : { orderId: orderId! })
  if (!payment) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })

  if (detail) {
    return NextResponse.json({
      ok: true,
      status: payment.status,
      gateway: payment.gateway,
      data: {
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        gateway: payment.gateway,
        type: payment.type,
        meta: payment.meta ?? {},
        created_at: payment.created_at,
        profileId: payment.profileId
      }
    })
  }

  return NextResponse.json({ ok: true, status: payment.status, gateway: payment.gateway })
}
