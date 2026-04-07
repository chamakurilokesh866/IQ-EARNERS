/**
 * Cashfree unblock payment verification logic.
 * Extracted to avoid parser issues in route handler.
 */
import { findPayment, addPayment, updatePayment, createUnblockPaymentEntry } from "./payments"
import { unblockUser } from "./blocked"
import { recordUnblocked } from "./unblocked"

function extractUsername(orderData: Record<string, unknown>): string | null {
  const meta = (orderData?.order_meta ?? {}) as Record<string, unknown>
  const customer = (orderData?.customer_details ?? {}) as Record<string, unknown>
  const candidates = [
    meta?.unblock_username,
    meta?.username,
    meta?.customer_username,
    orderData?.order_note,
    customer?.customer_name,
    customer?.customerName
  ]
  for (const c of candidates) {
    const s = String(c ?? "").trim()
    if (s && s.length >= 2 && s.length <= 50 && !s.includes(" ")) return s
  }
  return null
}

export type VerifyResult = { ok: true; status: string; unblocked: boolean; username: string | null } | { ok: false; error: string; status?: number }

export async function verifyUnblockPayment(
  orderId: string,
  usernameParam: string | null,
  appId: string,
  secretKey: string,
  isProduction: boolean
): Promise<VerifyResult> {
  let payment = await findPayment({ orderId })
  if (payment?.status === "success") {
    const meta = payment.meta as Record<string, unknown> | undefined
    const raw = meta?.unblock_username ?? meta?.unblockFor ?? usernameParam
    const username = (typeof raw === "string" ? raw.trim() : "") || null
    return { ok: true, status: "success", unblocked: !!username, username }
  }

  const cfUrl = isProduction ? "https://api.cashfree.com/pg/orders" : "https://sandbox.cashfree.com/pg/orders"
  const versions = ["2025-01-01", "2023-08-01"]
  let data: Record<string, unknown> = {}
  for (const ver of versions) {
    const r = await fetch(`${cfUrl}/${orderId}`, {
      headers: {
        "x-api-version": ver,
        "x-client-id": appId,
        "x-client-secret": secretKey
      }
    })
    data = (await r.json().catch(() => ({}))) as Record<string, unknown>
    if (r.ok) break
  }

  const orderData = (data?.order ?? data) as Record<string, unknown>
  const status =
    orderData?.order_status ?? orderData?.payment_status ?? (data as Record<string, unknown>)?.order_status ?? (data as Record<string, unknown>)?.payment_status
  const paid = status === "PAID" || status === "ACTIVE" || status === "SUCCESS" || status === "success"
  if (!paid) {
    return { ok: false, error: "Payment not completed", status: status as number }
  }

  const amount = Number(orderData?.order_amount ?? orderData?.orderAmount ?? 0)
  const username = extractUsername(orderData) ?? (usernameParam?.trim() || null)

  const existing = payment
  if (existing) {
    if (existing.status !== "success") {
      const meta = { ...(existing.meta ?? {}), unblock_username: username ?? (existing.meta as Record<string, unknown>)?.unblock_username }
      await updatePayment(existing.id, { status: "success", confirmed_at: Date.now(), meta })
    }
  } else {
    await addPayment(createUnblockPaymentEntry(orderId, amount, username))
  }

  if (username) {
    await unblockUser(username)
    await recordUnblocked(username, Date.now())
  }
  return { ok: true, status: "success", unblocked: true, username }
}
