/**
 * Verify unblock payment with Cashfree and create/update payment record.
 */
import { NextResponse } from "next/server"
import { verifyUnblockPayment } from "@/lib/unblock-verify"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const orderId = url.searchParams.get("orderId")
  const usernameParam = url.searchParams.get("username")

  if (!orderId) return NextResponse.json({ ok: false, error: "orderId required" }, { status: 400 })

  const appId = process.env.CASHFREE_APP_ID
  const secretKey = process.env.CASHFREE_SECRET_KEY
  const isProduction = process.env.CASHFREE_ENV === "production"

  if (!appId || !secretKey) return NextResponse.json({ ok: false, error: "Cashfree not configured" }, { status: 500 })

  try {
    const result = await verifyUnblockPayment(orderId, usernameParam, appId, secretKey, !!isProduction)

    if (result.ok) {
      return NextResponse.json(result)
    }

    return NextResponse.json({ ok: false, error: result.error, status: result.status }, { status: 400 })
  } catch (e) {
    const err = e as Error
    return NextResponse.json({ ok: false, error: err?.message || "Verification failed" }, { status: 500 })
  }
}
