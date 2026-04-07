import { NextResponse } from "next/server"
import crypto from "crypto"
import { promises as fs } from "fs"
import path from "path"
import { findPayment, updatePayment, addPayment } from "@/lib/payments"
import { getLeaderboard, upsertByName } from "@/lib/leaderboard"
import { addEnrollment, isEnrolled } from "@/lib/enrollments"
import { generateEnrollmentCode } from "@/lib/enrollmentCode"

/**
 * Verify Cashfree webhook signature.
 * Cashfree uses: Base64(HMACSHA256(timestamp + rawBody, secretKey))
 * Headers: x-webhook-signature, x-webhook-timestamp
 */
function verifyCashfreeSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  secretKey: string
): boolean {
  if (!signature || !timestamp || !secretKey) return false
  try {
    const signedPayload = timestamp + rawBody
    const expected = crypto
      .createHmac("sha256", secretKey)
      .update(signedPayload)
      .digest("base64")
    try {
      const sigBuf = Buffer.from(signature)
      const expBuf = Buffer.from(expected)
      if (sigBuf.length !== expBuf.length) return false
      return crypto.timingSafeEqual(sigBuf, expBuf)
    } catch {
      return false
    }
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  const raw = await req.text()
  let payload: any = {}
  try {
    payload = JSON.parse(raw)
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 })
  }

  // Handle Cashfree dashboard test/validation request – return 200 so "Add Webhook" passes
  const isTest =
    payload?.type === "TEST" ||
    payload?.event_type === "TEST" ||
    payload?.event === "webhook.test" ||
    (payload?.data?.object?.object === "event" && payload?.data?.object?.type === "test")
  if (isTest) {
    return NextResponse.json({ received: true })
  }

  // If no payment-related data, treat as validation ping and return 200
  const orderId = payload?.data?.order?.order_id ?? payload?.order_id ?? payload?.orderId
  const hasPaymentData = !!orderId || !!payload?.data?.order
  if (!hasPaymentData && typeof payload === "object" && Object.keys(payload).length <= 3) {
    return NextResponse.json({ received: true })
  }

  const secretKey = process.env.CASHFREE_SECRET_KEY ?? ""
  const webhookSig = req.headers.get("x-webhook-signature")
  const webhookTs = req.headers.get("x-webhook-timestamp")

  if (!secretKey) {
    return NextResponse.json({ ok: false, error: "Webhook not configured (set CASHFREE_SECRET_KEY)" }, { status: 500 })
  }

  if (!verifyCashfreeSignature(raw, webhookSig, webhookTs, secretKey)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 })
  }

  // Cashfree PAYMENT_SUCCESS_WEBHOOK format (2023-08-01 + 2025-01-01)
  const paymentStatus =
    payload?.data?.payment?.payment_status ??
    payload?.data?.order?.order_status ??
    payload?.data?.order?.transaction_status ??
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

  const orderAmount = payload?.data?.order?.order_amount ?? payload?.data?.payment?.payment_amount ?? payload?.order_amount ?? 0

  let payment = await findPayment({ orderId })
  if (payment) {
    if (payment.status !== "success") {
      await updatePayment(payment.id, { status: "success", confirmed_at: Date.now() })
    }
  } else {
    // Payment Forms create orders in Cashfree – we don't have the record yet; create it
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

  // Enroll user in tournament when payment is tournament_entry with tournamentId + username in meta
  payment = await findPayment({ orderId })
  const tournamentId = (payment?.meta as any)?.tournamentId
  const username = (payment?.meta as any)?.username ?? (payment?.meta as any)?.name ?? ""
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
      const participants: any[] = JSON.parse(ptxt || "[]")
      if (!participants.some((p: any) => String(p?.name ?? "").toLowerCase() === username.toLowerCase())) {
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

  return NextResponse.json({ ok: true })
}
