import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { syncCashfreeOrderIfPaid } from "@/lib/cashfreeSyncOrder"
import { rateLimitByAccount } from "@/lib/rateLimit"
import { isAuthorizedToVerifyOrder } from "@/lib/orderProofCookie"
import { appendSecurityEvent } from "@/lib/securityEventLog"
import { getClientIp } from "@/lib/inspectSecurity"
import { logApiSecurity } from "@/lib/requestContextLog"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const orderId = url.searchParams.get("orderId")
  const tournamentId = url.searchParams.get("tournamentId")
  const rl = await rateLimitByAccount(req, "payment", orderId ?? "verify-order")
  if (!rl.ok) {
    await appendSecurityEvent({
      type: "rate_limit",
      ip: getClientIp(req),
      path: "/api/payments/cashfree/verify-order"
    })
    return NextResponse.json({ ok: false, error: "Too many requests", retryAfter: rl.retryAfter }, { status: 429 })
  }

  if (!orderId) return NextResponse.json({ ok: false, error: "orderId required" }, { status: 400 })

  const store = await cookies()
  const uid = store.get("uid")?.value ?? ""
  logApiSecurity(req, "info", "verify_order", {
    uid: uid ? `${uid.slice(0, 8)}…` : undefined,
    orderPrefix: orderId.slice(0, 16)
  })

  const allowed = await isAuthorizedToVerifyOrder(orderId)
  if (!allowed) {
    await appendSecurityEvent({
      type: "verify_order_denied",
      ip: getClientIp(req),
      path: "/api/payments/cashfree/verify-order",
      detail: { orderHint: orderId.slice(0, 14) }
    })
    logApiSecurity(req, "warn", "verify_order_forbidden", { orderPrefix: orderId.slice(0, 14) })
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }

  const appId = process.env.CASHFREE_APP_ID
  const secretKey = process.env.CASHFREE_SECRET_KEY
  if (!appId || !secretKey) return NextResponse.json({ ok: false, error: "Cashfree not configured" }, { status: 500 })

  try {
    const confirmed = await syncCashfreeOrderIfPaid(orderId, tournamentId)
    if (!confirmed) {
      return NextResponse.json({ ok: false, error: "Payment not completed" }, { status: 400 })
    }
    return NextResponse.json({ ok: true, status: "success", tournamentId: tournamentId || null })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Verification failed"
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
