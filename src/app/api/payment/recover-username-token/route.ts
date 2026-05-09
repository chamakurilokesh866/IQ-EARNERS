import { NextResponse } from "next/server"
import { getPayments } from "@/lib/payments"
import { signUsernameToken } from "@/lib/usernameToken"
import { rateLimit } from "@/lib/rateLimit"
import { verifyTurnstile } from "@/lib/turnstile"

export async function POST(req: Request) {
  const rl = await rateLimit(req, "payment")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests", retryAfter: rl.retryAfter }, { status: 429 })

  const body = await req.json().catch(() => ({}))
  const emailRaw = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
  const turnstileToken = typeof body?.turnstileToken === "string" ? body.turnstileToken.trim() : ""
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    return NextResponse.json({ ok: false, error: "Valid email is required." }, { status: 400 })
  }

  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "").split(",")[0] || null
  const turnstileResult = await verifyTurnstile(turnstileToken, ip)
  if (!turnstileResult.success) {
    return NextResponse.json({ ok: false, error: "Verification failed. Please try again." }, { status: 400 })
  }

  const all = await getPayments()
  const candidates = all
    .filter((p) => {
      if (p.status !== "success") return false
      if (p.profileId) return false
      if (p.type === "unblock") return false
      const meta = (p.meta ?? {}) as Record<string, unknown>
      const metaEmail = String(meta.email ?? meta.customerEmail ?? "").trim().toLowerCase()
      return metaEmail === emailRaw
    })
    .sort((a, b) => Number(b.created_at ?? 0) - Number(a.created_at ?? 0))

  const payment = candidates[0]
  if (!payment) {
    return NextResponse.json({ ok: false, error: "No approved pending account setup payment found for this email." }, { status: 404 })
  }

  const oid = payment.orderId ?? payment.cashfreeOrderId ?? payment.paymentSessionId ?? ""
  const token = signUsernameToken(oid || undefined, payment.id)
  if (!token) {
    return NextResponse.json({ ok: false, error: "Could not generate recovery link." }, { status: 500 })
  }
  return NextResponse.json({ ok: true, token })
}
