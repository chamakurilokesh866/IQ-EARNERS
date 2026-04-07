/**
 * Cashfree Payment Form redirect handler.
 * Some Cashfree Payment Form setups send POST instead of GET with order_id.
 * This route accepts both, extracts order_id, and redirects to the callback page.
 */
import { NextRequest, NextResponse } from "next/server"

const CALLBACK_BASE = "/payment/callback"

function getOrderId(req: NextRequest): string | null {
  const url = new URL(req.url)
  const fromQuery =
    url.searchParams.get("order_id") ||
    url.searchParams.get("orderId") ||
    url.searchParams.get("cf_order_id") ||
    url.searchParams.get("reference_id")
  if (fromQuery && !fromQuery.startsWith("{")) return fromQuery
  return null
}

export async function GET(req: NextRequest) {
  const orderId = getOrderId(req)
  const url = new URL(req.nextUrl.origin + CALLBACK_BASE)
  if (orderId) url.searchParams.set("order_id", orderId)
  const tid = req.nextUrl.searchParams.get("tournamentId")
  if (tid) url.searchParams.set("tournamentId", tid)
  return NextResponse.redirect(url, 302)
}

export async function POST(req: NextRequest) {
  let orderId = getOrderId(req)
  let tid = req.nextUrl.searchParams.get("tournamentId")
  try {
    const contentType = req.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}))
      if (!orderId) {
        orderId =
          body?.order_id ??
          body?.orderId ??
          body?.data?.order?.order_id ??
          body?.cf_order_id ??
          body?.reference_id ??
          null
      }
      if (!tid) tid = body?.tournamentId ?? body?.tournament_id ?? null
    } else {
      const form = await req.formData().catch(() => null)
      if (form) {
        if (!orderId) {
          orderId =
            form.get("order_id")?.toString() ??
            form.get("orderId")?.toString() ??
            form.get("cf_order_id")?.toString() ??
            form.get("reference_id")?.toString() ??
            null
        }
        if (!tid) tid = form.get("tournamentId")?.toString() ?? form.get("tournament_id")?.toString() ?? null
      }
    }
  } catch {}
  const url = new URL(req.nextUrl.origin + CALLBACK_BASE)
  if (orderId) url.searchParams.set("order_id", orderId)
  if (tid) url.searchParams.set("tournamentId", tid)
  return NextResponse.redirect(url, 302)
}
