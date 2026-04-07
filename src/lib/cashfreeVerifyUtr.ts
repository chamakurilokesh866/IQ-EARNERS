/**
 * Verify payments against Cashfree APIs.
 *
 * CASHFREE DASHBOARD FIELDS → HOW WE VERIFY:
 * - Transaction ID (from receipt) = UTR in bank/UPI terms → GET /pg/vba/payments/{utr}
 * - Order ID (from dashboard) → GET /pg/orders/{order_id}
 *
 * METHOD 1 - UTR/Transaction ID (VBA API):
 * Works for: Cashfree Auto Collect (Virtual UPI QR, Virtual Bank Account)
 * The "Transaction ID" on customer's UPI receipt is the UTR - same 12-digit reference.
 *
 * METHOD 2 - Order ID (Orders API):
 * Works for: Cashfree Payment Links, PG checkout
 * Use the Order ID from your Cashfree dashboard.
 */
const CF_API_VERSIONS = ["2024-07-10", "2023-08-01"]
const PG_API_VERSIONS = ["2025-01-01", "2024-07-10", "2023-08-01"]
const MAX_TX_AGE_HOURS = Number(process.env.CASHFREE_MAX_TX_AGE_HOURS) || 48

function parseTxTime(txtime: unknown): Date | null {
  if (!txtime || typeof txtime !== "string") return null
  const s = String(txtime).trim()
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

export type VerifyUtrResult = { matched: true; amount?: number; utr: string; txTime?: string } | { matched: false; error?: string } | null

/** Verify by Order ID (Payment Links / PG checkout). Dashboard: Order ID, Transaction ID, etc. */
export async function verifyOrderWithCashfree(orderId: string, expectedAmount?: number): Promise<VerifyUtrResult> {
  const appId = process.env.CASHFREE_APP_ID?.trim()
  const secretKey = process.env.CASHFREE_SECRET_KEY?.trim()
  const isProduction = process.env.CASHFREE_ENV === "production"
  if (!appId || !secretKey) return null

  const baseUrl = (isProduction ? "https://api.cashfree.com" : "https://sandbox.cashfree.com") + "/pg"
  const clean = String(orderId || "").trim().replace(/\s/g, "")
  if (clean.length < 4) return null

  for (const version of PG_API_VERSIONS) {
    try {
      const res = await fetch(`${baseUrl}/orders/${encodeURIComponent(clean)}`, {
        method: "GET",
        headers: {
          "x-client-id": appId,
          "x-client-secret": secretKey,
          "x-api-version": version,
          "Content-Type": "application/json"
        }
      })
      if (res.status === 404) return { matched: false }
      if (!res.ok) {
        const err = await res.text()
        return { matched: false, error: err || `HTTP ${res.status}` }
      }
      const data = (await res.json()) as Record<string, unknown>
      const orderStatus = String(data?.order_status ?? "").toUpperCase()
      if (orderStatus !== "PAID") {
        if (orderStatus === "ACTIVE") return { matched: false, error: "Order not yet paid" }
        return { matched: false, error: orderStatus ? `Order status: ${orderStatus}` : "Order not paid" }
      }
      const amount = Number(data?.order_amount ?? 0)
      if (expectedAmount != null && expectedAmount > 0 && Math.abs(amount - expectedAmount) > 1) {
        return { matched: false, error: `Amount mismatch: expected ₹${expectedAmount}, got ₹${amount}` }
      }
      const txTime = data?.created_at ? String(data.created_at) : undefined
      return { matched: true, amount, utr: clean, txTime }
    } catch (e) {
      if (version === PG_API_VERSIONS[PG_API_VERSIONS.length - 1]) {
        return { matched: false, error: (e as Error)?.message }
      }
    }
  }
  return null
}

/** Verify by UTR/Transaction ID (Auto Collect / VBA). Transaction ID on receipt = UTR. */
export async function verifyUtrWithCashfree(utr: string, expectedAmount?: number): Promise<VerifyUtrResult> {
  const appId = process.env.CASHFREE_APP_ID?.trim()
  const secretKey = process.env.CASHFREE_SECRET_KEY?.trim()
  const isProduction = process.env.CASHFREE_ENV === "production"
  if (!appId || !secretKey) return null

  const baseUrl = isProduction ? "https://api.cashfree.com" : "https://sandbox.cashfree.com"
  const cleanUtr = String(utr || "").trim().replace(/\s/g, "")
  if (cleanUtr.length < 8) return null

  for (const version of CF_API_VERSIONS) {
    try {
      const res = await fetch(`${baseUrl}/pg/vba/payments/${encodeURIComponent(cleanUtr)}`, {
        method: "GET",
        headers: {
          "x-client-id": appId,
          "x-client-secret": secretKey,
          "x-api-version": version,
          "Content-Type": "application/json"
        }
      })
      if (res.status === 404) return { matched: false }
      if (!res.ok) {
        const err = await res.text()
        return { matched: false, error: err || `HTTP ${res.status}` }
      }
      const data = (await res.json()) as Record<string, unknown>
      // Cashfree returns { payment_details: [ { amount, txstatus, is_settled, txtime, ... } ] }
      const details = Array.isArray(data?.payment_details) ? (data.payment_details as any[])[0] : data
      const amount = Number(details?.amount ?? data?.amount ?? data?.order_amount ?? 0)
      const txStatus = String(details?.txstatus ?? data?.txstatus ?? details?.payment_status ?? "").toLowerCase()
      const isSettled = details?.is_settled === "1" || details?.is_settled === true || txStatus === "success" || txStatus === "credited"
      if (!isSettled && txStatus && txStatus !== "success" && txStatus !== "credited") {
        return { matched: false, error: `Status: ${txStatus}` }
      }
      if (expectedAmount != null && expectedAmount > 0 && Math.abs(amount - expectedAmount) > 1) {
        return { matched: false, error: `Amount mismatch: expected ₹${expectedAmount}, got ₹${amount}` }
      }
      // Validate transaction is recent (within MAX_TX_AGE_HOURS, 0 = disabled)
      const txTimeStr = details?.txtime ?? data?.txtime
      const txDate = parseTxTime(txTimeStr)
      if (txDate && MAX_TX_AGE_HOURS > 0) {
        const ageHours = (Date.now() - txDate.getTime()) / (1000 * 60 * 60)
        if (ageHours > MAX_TX_AGE_HOURS) {
          return { matched: false, error: `Transaction too old (${Math.round(ageHours)}h ago). Max ${MAX_TX_AGE_HOURS}h allowed.` }
        }
      }
      return { matched: true, amount, utr: cleanUtr, txTime: txTimeStr ? String(txTimeStr) : undefined }
    } catch (e) {
      if (version === CF_API_VERSIONS[CF_API_VERSIONS.length - 1]) {
        return { matched: false, error: (e as Error)?.message }
      }
    }
  }
  return null
}
