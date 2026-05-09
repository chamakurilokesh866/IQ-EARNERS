import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getSettings } from "@/lib/settings"
import { addPayment } from "@/lib/payments"
import { rateLimit } from "@/lib/rateLimit"
import { verifyTurnstile } from "@/lib/turnstile"
import { validateOrigin } from "@/lib/auth"
import { getProfileByUid } from "@/lib/profiles"
import { setOrderProofCookieOnResponse } from "@/lib/orderProofCookie"

export async function POST(req: Request) {
  const originCheck = validateOrigin(req)
  if (originCheck === false) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  const rl = await rateLimit(req, "payment")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests", retryAfter: rl.retryAfter }, { status: 429 })
  const body = await req.json().catch(() => ({}))
  const turnstileToken = typeof body?.turnstileToken === "string" ? body.turnstileToken.trim() : ""
  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "").split(",")[0] || null

  const turnstileResult = await verifyTurnstile(turnstileToken, ip)
  if (!turnstileResult.success) {
    return NextResponse.json({ ok: false, error: "Verification failed. Please try again." }, { status: 400 })
  }

  const settings = await getSettings()
  const entryFee = Math.max(1, Number(settings?.entryFee ?? 100))
  const blockedUnblockAmount = Math.max(1, Number(settings?.blockedAmount ?? 50))
  const tournamentId = typeof body?.tournamentId === "string" ? body.tournamentId.trim() : undefined
  const requestedPlan = String(body?.paymentPlan ?? "").toLowerCase()
  if (!tournamentId && requestedPlan === "annual") {
    return NextResponse.json({ ok: false, error: "Annual payment plan is disabled." }, { status: 400 })
  }
  const paymentPlan: "entry" = "entry"
  const bodyTypeRaw = typeof body?.type === "string" ? body.type.trim().toLowerCase() : ""
  const unblockUsername =
    typeof body?.unblockUsername === "string"
      ? body.unblockUsername.trim()
      : typeof body?.unblockFor === "string"
        ? body.unblockFor.trim()
        : ""
  const isUnblockOrder = bodyTypeRaw === "unblock"
  const type: string = isUnblockOrder
    ? "unblock"
    : tournamentId
      ? "tournament_entry"
      : typeof body?.type === "string"
        ? body.type
        : "entry"
  let amount: number

  if (isUnblockOrder) {
    if (!unblockUsername || unblockUsername.length < 2) {
      return NextResponse.json({ ok: false, error: "unblockUsername required" }, { status: 400 })
    }
    amount = blockedUnblockAmount
  } else if (tournamentId) {
    const { getTournaments } = await import("@/lib/tournaments")
    const tournaments = await getTournaments()
    const t = tournaments.find((x: any) => x.id === tournamentId)
    const rawFee = (t as any)?.fee ?? (t as any)?.entryFee ?? entryFee
    amount = Number(rawFee) || (typeof rawFee === "string" ? parseInt(String(rawFee).replace(/\D/g, "") || "100", 10) : 100)
  } else {
    amount = entryFee
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ ok: false, error: "Invalid amount" }, { status: 400 })
  }

  // Get Cashfree credentials from environment
  const appId = process.env.CASHFREE_APP_ID
  const secretKey = process.env.CASHFREE_SECRET_KEY
  const isProduction = process.env.CASHFREE_ENV === "production"
  
  if (!appId || !secretKey) {
    return NextResponse.json({ ok: false, error: "Cashfree not configured" }, { status: 500 })
  }

  let username = ""
  if (isUnblockOrder) {
    username = unblockUsername
  } else if (tournamentId) {
    const cookieStore = await cookies()
    const uid = cookieStore.get("uid")?.value ?? ""
    try { username = decodeURIComponent(cookieStore.get("username")?.value ?? "") } catch {}
    if (!username && uid) {
      const me = await getProfileByUid(uid)
      if (me?.username) username = me.username
    }
    if (!username) {
      return NextResponse.json({ ok: false, error: "Sign in required to join tournament" }, { status: 401 })
    }
  }

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.iqearners.online").replace(/\/$/, "")
  let returnUrl = `${baseUrl}/payment/callback?order_id={order_id}`
  if (tournamentId) returnUrl += `&tournamentId=${encodeURIComponent(tournamentId)}`
  if (isUnblockOrder) {
    returnUrl = `${baseUrl}/payment/unblock-callback?order_id={order_id}&username=${encodeURIComponent(unblockUsername)}`
  }

  // Generate order ID
  const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substring(7)}`
  const orderAmount = amount
  const orderCurrency = "INR"
  
  // Create order in Cashfree
  const cashfreeUrl = isProduction 
    ? "https://api.cashfree.com/pg/orders"
    : "https://sandbox.cashfree.com/pg/orders"
  
  try {
    const orderResponse = await fetch(cashfreeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": appId,
        "x-client-secret": secretKey
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: orderAmount,
        order_currency: orderCurrency,
        order_note: isUnblockOrder
          ? `Unblock @${unblockUsername}`
          : tournamentId
            ? `Tournament ${tournamentId} - ${username}`
            : `Entry fee - ${type}`,
        customer_details: {
          customer_id: body?.customerId || `CUST_${Date.now()}`,
          customer_name: isUnblockOrder ? unblockUsername : body?.customerName || "Guest User",
          customer_email: body?.customerEmail || "",
          customer_phone: (typeof body?.customerPhone === "string" && /^\d{10}$/.test(body.customerPhone.trim())) ? body.customerPhone.trim() : "9999999999"
        },
        order_meta: {
          return_url: returnUrl,
          notify_url: `${baseUrl}/api/payments/webhook`,
          ...(isUnblockOrder ? { unblock_username: unblockUsername, username: unblockUsername } : {})
        }
      })
    })

    const orderData = await orderResponse.json()
    
    if (orderResponse.ok && orderData.payment_session_id) {
      const paymentId = String(Date.now())
      const entry = {
        id: paymentId,
        orderId: orderId,
        cashfreeOrderId: orderData.order_id || orderId,
        paymentSessionId: orderData.payment_session_id,
        amount,
        type,
        status: "pending",
        gateway: "cashfree",
        created_at: Date.now(),
        meta: isUnblockOrder
          ? {
              unblockFor: unblockUsername,
              name: unblockUsername,
              username: unblockUsername,
              unblock_username: unblockUsername
            }
          : {
              customerName: body?.customerName,
              customerEmail: body?.customerEmail,
              customerPhone: body?.customerPhone,
              paymentPlan: tournamentId ? undefined : paymentPlan,
              ...(tournamentId && username ? { tournamentId, username } : {})
            }
      } as import("@/lib/payments").Payment
      await addPayment(entry)

      const res = NextResponse.json({
        ok: true,
        paymentId,
        orderId: orderData.order_id || orderId,
        paymentSessionId: orderData.payment_session_id,
        appId,
        orderAmount,
        orderCurrency,
        mode: isProduction ? "production" : "sandbox"
      })
      setOrderProofCookieOnResponse(res, String(orderData.order_id || orderId))
      return res
    } else {
      return NextResponse.json({ ok: false, error: orderData.message || "Failed to create order" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("Cashfree order creation error:", error)
    return NextResponse.json({ ok: false, error: error.message || "Payment gateway error" }, { status: 500 })
  }
}
