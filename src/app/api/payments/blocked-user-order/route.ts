/**
 * Returns the first entry-fee payment order_id for a blocked user.
 * Used to pass to the Cashfree blocked payment form.
 */
import { NextRequest, NextResponse } from "next/server"
import { getFirstEntryOrderId } from "@/lib/payments"

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username")?.trim()
  if (!username) {
    return NextResponse.json({ ok: false, error: "username required" }, { status: 400 })
  }
  try {
    const orderId = await getFirstEntryOrderId(username)
    return NextResponse.json({ ok: true, orderId: orderId ?? null })
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Failed to get order" }, { status: 500 })
  }
}
