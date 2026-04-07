import { NextResponse } from "next/server"
import { findPayment, addPayment, updatePayment } from "@/lib/payments"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const orderId = url.searchParams.get("orderId")
  const tournamentId = url.searchParams.get("tournamentId")
  if (!orderId) return NextResponse.json({ ok: false, error: "orderId required" }, { status: 400 })

  const appId = process.env.CASHFREE_APP_ID
  const secretKey = process.env.CASHFREE_SECRET_KEY
  const isProduction = process.env.CASHFREE_ENV === "production"
  if (!appId || !secretKey) return NextResponse.json({ ok: false, error: "Cashfree not configured" }, { status: 500 })

  try {
    const cfUrl = isProduction ? "https://api.cashfree.com/pg/orders" : "https://sandbox.cashfree.com/pg/orders"
    const versions = ["2025-01-01", "2023-08-01"]
    let data: Record<string, unknown> = {}
    let lastError: string | null = null
    let found = false
    for (const ver of versions) {
      const r = await fetch(`${cfUrl}/${orderId}`, {
        headers: {
          "x-api-version": ver,
          "x-client-id": appId,
          "x-client-secret": secretKey
        }
      })
      data = (await r.json().catch(() => ({}))) as Record<string, unknown>
      if (r.ok) {
        found = true
        break
      }
      lastError = (data?.message as string) || "Order not found"
      if (r.status !== 404 && r.status !== 400) break
    }
    if (!found)
      return NextResponse.json({ ok: false, error: lastError || "Order not found" }, { status: 404 })
    const orderData = (data?.order ?? data) as Record<string, unknown>
    const status =
      orderData?.order_status ??
      orderData?.payment_status ??
      (data as any)?.order_status ??
      (data as any)?.orderStatus ??
      (data as any)?.payment_status
    const paid = status === "PAID" || status === "ACTIVE" || status === "SUCCESS" || status === "success"
    if (!paid)
      return NextResponse.json(
        { ok: false, error: "Payment not completed", status },
        { status: 400 }
      )

    const amount = Number(
      orderData?.order_amount ?? orderData?.orderAmount ?? (data as any)?.order_amount ?? (data as any)?.orderAmount ?? 0
    )
    let existing = await findPayment({ orderId })
    if (!existing) {
      const entry = {
        id: String(Date.now()),
        orderId,
        cashfreeOrderId: orderId,
        amount,
        type: (tournamentId ? "tournament_entry" : "tournament") as string,
        status: "success",
        gateway: "cashfree",
        created_at: Date.now(),
        confirmed_at: Date.now(),
        meta: { fromPaymentLink: true, tournamentId: tournamentId || undefined }
      } as import("@/lib/payments").Payment
      await addPayment(entry)
    } else if (existing.status !== "success") {
      await updatePayment(existing.id, { status: "success", confirmed_at: Date.now() })
    }
    return NextResponse.json({ ok: true, status: "success", tournamentId: tournamentId || null })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Verification failed" }, { status: 500 })
  }
}
