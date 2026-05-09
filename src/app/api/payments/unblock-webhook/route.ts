/**
 * Webhook for Cashfree Blocked form payments.
 * Configure this URL in your Cashfree Blocked form: https://your-domain.com/api/payments/unblock-webhook
 *
 * On success: extracts username, unblocks user in DB, creates payment record.
 */

import { NextResponse } from "next/server"
import { findPayment, addPayment, updatePayment } from "@/lib/payments"
import { unblockUser } from "@/lib/blocked"
import { recordUnblocked } from "@/lib/unblocked"
import { verifyCashfreeWebhookSignature, isCashfreeWebhookTimestampFresh } from "@/lib/cashfreeWebhookSecurity"
import { appendSecurityEvent } from "@/lib/securityEventLog"
import { getClientIp } from "@/lib/inspectSecurity"
import { buildWebhookIdempotencyKey, markWebhookEventSeen } from "@/lib/webhookIdempotency"

function extractUsername(payload: any): string | null {
  const order = payload?.data?.order ?? payload?.order ?? {}
  const customer = payload?.data?.customer_details ?? order?.customer_details ?? {}
  const meta = order?.order_meta ?? payload?.data?.order_meta ?? {}

  const candidates = [
    meta?.unblock_username,
    meta?.username,
    meta?.customer_username,
    order?.order_note,
    customer?.customer_name,
    customer?.customerName,
    payload?.data?.customer_details?.customer_name
  ]

  for (const c of candidates) {
    const s = String(c ?? "").trim()
    if (s && s.length >= 2 && s.length <= 50 && !s.includes(" ")) return s
  }
  return null
}

/** GET: Cashfree may send GET to validate URL reachability - return 200 */
export async function GET() {
  return new NextResponse(JSON.stringify({ status: "ok", message: "Webhook endpoint is active" }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  })
}

export async function POST(req: Request) {
  let raw = ""
  try {
    raw = await req.text()
  } catch {
    return NextResponse.json({ received: true }, { status: 200 })
  }

  let payload: any = {}
  try {
    payload = raw ? JSON.parse(raw) : {}
  } catch {
    return NextResponse.json({ received: true }, { status: 200 })
  }

  const isTest =
    payload?.type === "TEST" ||
    payload?.event_type === "TEST" ||
    payload?.event === "webhook.test" ||
    payload?.event === "WEBHOOK_TEST" ||
    (payload?.data?.object?.object === "event" && payload?.data?.object?.type === "test")

  const orderId = payload?.data?.order?.order_id ?? payload?.order_id ?? payload?.orderId
  const hasPaymentData = !!orderId || !!payload?.data?.order
  if (!hasPaymentData && typeof payload === "object" && Object.keys(payload).length <= 5) {
    return NextResponse.json({ received: true }, { status: 200 })
  }

  const secretKey = process.env.CASHFREE_SECRET_KEY ?? ""
  const webhookSig = req.headers.get("x-webhook-signature")
  const webhookTs = req.headers.get("x-webhook-timestamp")

  if (!secretKey) {
    return NextResponse.json({ ok: false, error: "CASHFREE_SECRET_KEY not set" }, { status: 500 })
  }
  if (!webhookSig || !webhookTs) {
    if (hasPaymentData || orderId) {
      return NextResponse.json({ ok: false, error: "Missing webhook signature" }, { status: 401 })
    }
    return NextResponse.json({ received: true }, { status: 200 })
  }
  if (!verifyCashfreeWebhookSignature(raw, webhookSig, webhookTs, secretKey)) {
    await appendSecurityEvent({ type: "webhook_invalid_signature", ip: getClientIp(req), path: "/api/payments/unblock-webhook" })
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 })
  }
  if (!isCashfreeWebhookTimestampFresh(webhookTs)) {
    await appendSecurityEvent({ type: "webhook_replay", ip: getClientIp(req), path: "/api/payments/unblock-webhook" })
    return NextResponse.json({ ok: false, error: "Stale timestamp" }, { status: 401 })
  }
  const eventKey = buildWebhookIdempotencyKey("/api/payments/unblock-webhook", raw, webhookTs)
  if (!markWebhookEventSeen(eventKey)) {
    return NextResponse.json({ ok: true, message: "Duplicate ignored" })
  }

  if (isTest) return NextResponse.json({ received: true }, { status: 200 })

  const paymentStatus =
    payload?.data?.payment?.payment_status ??
    payload?.data?.order?.order_status ??
    payload?.payment_status ??
    payload?.status
  const type = payload?.type ?? payload?.event_type
  const isSuccess =
    type === "PAYMENT_SUCCESS_WEBHOOK" ||
    paymentStatus === "PAID" ||
    paymentStatus === "SUCCESS" ||
    paymentStatus === "success"

  if (!isSuccess) return NextResponse.json({ ok: true, message: "Event ignored" })

  const orderAmount = payload?.data?.order?.order_amount ?? payload?.data?.payment?.payment_amount ?? payload?.order_amount ?? 0
  const username = extractUsername(payload)

  let payment = await findPayment({ orderId })
  if (payment) {
    if (payment.status !== "success") {
      const meta = { ...(payment.meta ?? {}), unblock_username: username ?? (payment.meta as any)?.unblock_username }
      await updatePayment(payment.id, { status: "success", confirmed_at: Date.now(), meta })
    }
    if (username) {
      await unblockUser(username)
      await recordUnblocked(username, Date.now())
    }
  } else {
    const entry = {
      id: `cf_unblock_${orderId.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
      orderId,
      cashfreeOrderId: orderId,
      amount: Number(orderAmount) || 50,
      type: "unblock",
      status: "success",
      gateway: "cashfree",
      created_at: Date.now(),
      confirmed_at: Date.now(),
      meta: { fromWebhook: true, unblock_username: username ?? undefined, unblockFor: username ?? undefined }
    }
    await addPayment(entry)
    if (username) {
      await unblockUser(username)
      await recordUnblocked(username, Date.now())
    }
  }

  return NextResponse.json({ ok: true })
}
