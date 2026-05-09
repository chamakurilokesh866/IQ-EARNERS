/**
 * Shared Cashfree PG order fetch + local payments row sync (used by verify-order API and signup payment proof).
 *
 * IMPORTANT: Cashfree PG `order_status` / `ACTIVE` means the order session exists — it is NOT payment success.
 * Only `PAID` / `SUCCESS` (and matching payment_status) count as paid. See also cashfreeVerifyUtr.ts.
 */
import { findPayment, addPayment, updatePayment, type Payment } from "@/lib/payments"
import { recordTournamentEntryLedgerIfNeeded } from "@/lib/moneyLedger"

type CfOrderParts = { data: Record<string, unknown>; orderData: Record<string, unknown> }

/** Fetch order JSON from Cashfree PG API. */
export async function fetchCashfreePgOrder(orderId: string): Promise<CfOrderParts | null> {
  const appId = process.env.CASHFREE_APP_ID
  const secretKey = process.env.CASHFREE_SECRET_KEY
  const isProduction = process.env.CASHFREE_ENV === "production"
  if (!appId || !secretKey || !orderId) return null

  const cfUrl = isProduction ? "https://api.cashfree.com/pg/orders" : "https://sandbox.cashfree.com/pg/orders"
  const versions = ["2025-01-01", "2023-08-01"]
  let data: Record<string, unknown> = {}
  let found = false

  for (const ver of versions) {
    const r = await fetch(`${cfUrl}/${orderId}`, {
      headers: {
        "x-api-version": ver,
        "x-client-id": appId,
        "x-client-secret": secretKey,
      },
    })
    data = (await r.json().catch(() => ({}))) as Record<string, unknown>
    if (r.ok) {
      found = true
      break
    }
    if (r.status !== 404 && r.status !== 400) break
  }
  if (!found) return null

  const orderData = (data?.order ?? data) as Record<string, unknown>
  return { data, orderData }
}

/**
 * True only when Cashfree reports a completed payment — not ACTIVE/PENDING (order created but unpaid).
 */
export function isCashfreePgOrderPaid(orderData: Record<string, unknown>, root: Record<string, unknown>): boolean {
  const os = String(orderData?.order_status ?? root?.order_status ?? "").toUpperCase()
  const ps = String(orderData?.payment_status ?? root?.payment_status ?? "").toUpperCase()
  // Payment layer is authoritative when present
  if (ps === "PAID" || ps === "SUCCESS") return true
  if (os === "PAID" || os === "SUCCESS") return true
  // Legacy lowercase from some responses
  const raw =
    orderData?.order_status ??
    orderData?.payment_status ??
    root?.order_status ??
    root?.payment_status
  const s = String(raw ?? "")
  if (s === "success" || s === "paid") return true
  return false
}

/** Live check — use before username token mint / profile signup (do not trust stale DB alone). */
export async function isCashfreeOrderPaidLive(orderId: string): Promise<boolean> {
  const parsed = await fetchCashfreePgOrder(orderId)
  if (!parsed) return false
  return isCashfreePgOrderPaid(parsed.orderData, parsed.data)
}

export async function syncCashfreeOrderIfPaid(orderId: string, tournamentId?: string | null): Promise<Payment | null> {
  const parsed = await fetchCashfreePgOrder(orderId)
  if (!parsed) return null

  const { data, orderData } = parsed
  const root = data as Record<string, unknown>
  const paid = isCashfreePgOrderPaid(orderData, root)

  const existing = await findPayment({ orderId })

  if (!paid) {
    // Revert mistaken success (e.g. old bug treated ACTIVE as paid)
    if (existing?.status === "success" && existing.gateway === "cashfree") {
      await updatePayment(existing.id, { status: "pending" })
    }
    return null
  }

  const amount = Number(
    orderData?.order_amount ?? orderData?.orderAmount ?? root?.order_amount ?? root?.orderAmount ?? 0
  )
  if (!existing) {
    const entry = {
      id: String(Date.now()),
      orderId,
      cashfreeOrderId: orderId,
      amount,
      type: (tournamentId ? "tournament_entry" : "entry") as string,
      status: "success",
      gateway: "cashfree",
      created_at: Date.now(),
      confirmed_at: Date.now(),
      meta: { fromPaymentLink: true, tournamentId: tournamentId || undefined },
    } as Payment
    await addPayment(entry)
  } else if (existing.status !== "success") {
    await updatePayment(existing.id, { status: "success", confirmed_at: Date.now() })
  }
  const confirmedPayment = await findPayment({ orderId })
  if (confirmedPayment?.status === "success") {
    try {
      await recordTournamentEntryLedgerIfNeeded(confirmedPayment)
    } catch {
      /* ledger file may be read-only */
    }
  }
  return confirmedPayment
}
