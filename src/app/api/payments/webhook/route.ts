import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { findPayment, updatePayment, addPayment } from "@/lib/payments"
import { recordTournamentEntryLedgerIfNeeded } from "@/lib/moneyLedger"
import { unblockUser } from "@/lib/blocked"
import { recordUnblocked } from "@/lib/unblocked"
import { clearBlockedFlagsInUserStats } from "@/lib/userStats"
import { upsertByName } from "@/lib/leaderboard"
import { addEnrollment, isEnrolled } from "@/lib/enrollments"
import { generateEnrollmentCode } from "@/lib/enrollmentCode"
import { verifyCashfreeWebhookSignature, isCashfreeWebhookTimestampFresh } from "@/lib/cashfreeWebhookSecurity"
import { appendSecurityEvent } from "@/lib/securityEventLog"
import { getClientIp } from "@/lib/inspectSecurity"
import { buildWebhookIdempotencyKey, markWebhookEventSeen } from "@/lib/webhookIdempotency"

export async function POST(req: Request) {
  const raw = await req.text()
  let payload: Record<string, unknown> = {}
  try {
    payload = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 })
  }

  const dataOrder = payload?.data as Record<string, unknown> | undefined
  const orderNested = dataOrder?.order as Record<string, unknown> | undefined
  const eventObject = dataOrder?.object as Record<string, unknown> | undefined
  const orderId =
    (orderNested?.order_id as string | undefined) ??
    (payload?.order_id as string | undefined) ??
    (payload?.orderId as string | undefined)
  const hasPaymentData = Boolean(orderId || orderNested)
  const isTest =
    payload?.type === "TEST" ||
    payload?.event_type === "TEST" ||
    payload?.event === "webhook.test" ||
    (eventObject?.object === "event" && eventObject?.type === "test")

  const keyCount = typeof payload === "object" && payload ? Object.keys(payload).length : 0
  const isTinyPing = !hasPaymentData && !isTest && keyCount <= 3

  const secretKey = process.env.CASHFREE_SECRET_KEY ?? ""
  const webhookSig = req.headers.get("x-webhook-signature")
  const webhookTs = req.headers.get("x-webhook-timestamp")

  if (!secretKey) {
    return NextResponse.json({ ok: false, error: "Webhook not configured (set CASHFREE_SECRET_KEY)" }, { status: 500 })
  }

  if (isTinyPing) {
    return NextResponse.json({ received: true })
  }

  if (!verifyCashfreeWebhookSignature(raw, webhookSig, webhookTs, secretKey)) {
    const ip = getClientIp(req)
    await appendSecurityEvent({ type: "webhook_invalid_signature", ip, path: "/api/payments/webhook" })
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 })
  }

  if (!isCashfreeWebhookTimestampFresh(webhookTs)) {
    const ip = getClientIp(req)
    await appendSecurityEvent({ type: "webhook_replay", ip, path: "/api/payments/webhook", detail: { reason: "timestamp_skew" } })
    return NextResponse.json({ ok: false, error: "Stale timestamp" }, { status: 401 })
  }
  const eventKey = buildWebhookIdempotencyKey("/api/payments/webhook", raw, webhookTs)
  if (!markWebhookEventSeen(eventKey)) {
    return NextResponse.json({ ok: true, message: "Duplicate ignored" })
  }

  if (isTest) {
    return NextResponse.json({ received: true })
  }

  const paymentStatus =
    (dataOrder?.payment as Record<string, unknown> | undefined)?.payment_status ??
    orderNested?.order_status ??
    orderNested?.transaction_status ??
    payload?.payment_status ??
    payload?.status
  const type = payload?.type ?? payload?.event_type

  const isSuccess =
    type === "PAYMENT_SUCCESS_WEBHOOK" ||
    paymentStatus === "PAID" ||
    paymentStatus === "SUCCESS" ||
    paymentStatus === "success"

  if (!isSuccess || !orderId) {
    return NextResponse.json({ ok: true, message: "Event ignored" })
  }

  const orderAmount =
    (orderNested?.order_amount as number | undefined) ??
    ((dataOrder?.payment as Record<string, unknown> | undefined)?.payment_amount as number | undefined) ??
    (payload?.order_amount as number | undefined) ??
    0

  let payment = await findPayment({ orderId })
  if (payment) {
    if (payment.status !== "success") {
      await updatePayment(payment.id, { status: "success", confirmed_at: Date.now() })
    }
  } else {
    const entry = {
      id: `cf_${orderId.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
      orderId,
      cashfreeOrderId: orderId,
      amount: Number(orderAmount) || 1,
      type: "entry" as string,
      status: "success",
      gateway: "cashfree",
      created_at: Date.now(),
      confirmed_at: Date.now(),
      meta: { fromWebhook: true }
    }
    await addPayment(entry)
  }

  payment = await findPayment({ orderId })
  const meta = (payment?.meta ?? {}) as Record<string, unknown>
  const tournamentId = meta.tournamentId as string | undefined
  const username = (meta.username ?? meta.name ?? "") as string
  if (payment?.type === "tournament_entry" && tournamentId && username) {
    try {
      const PARTICIPANTS = path.join(process.cwd(), "src", "data", "participants.json")
      const alreadyEnrolled = await isEnrolled(username, tournamentId)
      if (!alreadyEnrolled) {
        await addEnrollment({
          username,
          tournamentId,
          paidAt: Date.now(),
          uniqueCode: generateEnrollmentCode(tournamentId)
        })
      }
      await upsertByName({ name: username, score: 0, tournamentId })
      const ptxt = await fs.readFile(PARTICIPANTS, "utf-8").catch(() => "[]")
      const participants: Array<Record<string, unknown>> = JSON.parse(ptxt || "[]")
      if (!participants.some((p) => String(p?.name ?? "").toLowerCase() === username.toLowerCase())) {
        participants.push({
          id: String(Date.now()),
          name: username,
          joinedAt: Date.now(),
          status: "Active"
        })
        await fs.writeFile(PARTICIPANTS, JSON.stringify(participants, null, 2), "utf-8")
      }
    } catch (e) {
      console.error("[webhook] tournament enrollment error:", e)
    }
  }

  payment = await findPayment({ orderId })
  if (payment?.type === "unblock" && payment.status === "success") {
    const meta = (payment.meta ?? {}) as Record<string, unknown>
    const unblockFor = String(meta.unblockFor ?? meta.unblock_username ?? meta.name ?? meta.username ?? "").trim()
    if (unblockFor) {
      const now = Date.now()
      try {
        await Promise.all([unblockUser(unblockFor), recordUnblocked(unblockFor, now), clearBlockedFlagsInUserStats(unblockFor)])
      } catch (e) {
        console.error("[webhook] unblock error:", e)
      }
    }
  }

  payment = await findPayment({ orderId })
  if (payment?.status === "success") {
    try {
      await recordTournamentEntryLedgerIfNeeded(payment)
    } catch (e) {
      console.error("[webhook] money ledger error:", e)
    }
  }

  return NextResponse.json({ ok: true })
}
