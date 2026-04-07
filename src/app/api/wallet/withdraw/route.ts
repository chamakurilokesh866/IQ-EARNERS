import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { rateLimit } from "@/lib/rateLimit"
import { getProfileByUid, updateProfileWallet } from "@/lib/profiles"
import { addPayment } from "@/lib/payments"
import { MAX_WITHDRAWAL_PER_REQUEST_INR, WITHDRAWAL_THRESHOLD_INR } from "@/lib/referralWalletConstants"

const MIN_WITHDRAW = 100

export async function POST(req: Request) {
  const rl = await rateLimit(req, "payment")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests", retryAfter: rl.retryAfter }, { status: 429 })

  const body = await req.json().catch(() => ({}))
  const amount = Number(body?.amount ?? MIN_WITHDRAW)
  const upiId = typeof body?.upiId === "string" ? body.upiId.trim().slice(0, 100) : ""

  if (!Number.isFinite(amount) || amount < MIN_WITHDRAW) {
    return NextResponse.json({ ok: false, error: `Minimum withdraw is ₹${MIN_WITHDRAW}` }, { status: 400 })
  }
  if (amount > MAX_WITHDRAWAL_PER_REQUEST_INR) {
    return NextResponse.json(
      { ok: false, error: `Maximum withdrawal per request is ₹${MAX_WITHDRAWAL_PER_REQUEST_INR}` },
      { status: 400 }
    )
  }

  const store = await cookies()
  const uid = store.get("uid")?.value ?? ""
  if (!uid) return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 })

  const profile = await getProfileByUid(uid)
  if (!profile) return NextResponse.json({ ok: false, error: "Profile not found" }, { status: 404 })

  const bal = Number(profile.wallet ?? 0)
  const username = profile.username || "User"
  if (bal < WITHDRAWAL_THRESHOLD_INR) {
    return NextResponse.json(
      { ok: false, error: `Wallet must reach ₹${WITHDRAWAL_THRESHOLD_INR} before withdrawal` },
      { status: 400 }
    )
  }
  if (bal < amount) return NextResponse.json({ ok: false, error: "Insufficient balance" }, { status: 400 })

  // Deduct from wallet
  const deductOk = await updateProfileWallet(uid, -amount)
  if (!deductOk) return NextResponse.json({ ok: false, error: "Failed to update wallet" }, { status: 500 })

  // Record withdrawal as pending payment
  const id = String(Date.now())
  await addPayment({
    id,
    amount,
    type: "withdraw",
    status: "pending",
    created_at: Date.now(),
    meta: { uid, username, upiId }
  })

  // Notify admin
  try {
    const adminEmail = process.env.ADMIN_EMAIL || (process.env.ADMIN_USERNAME?.includes("@") ? process.env.ADMIN_USERNAME : "")
    if (adminEmail) {
      const { sendEmail } = await import("@/lib/email")
      const { getEmailTemplate } = await import("@/lib/emailTheme")
      const dashboardUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ""}/more/admin-dashboard`
      const htmlTemplate = getEmailTemplate({
        title: "IQ Earners Admin",
        subtitle: "New Withdrawal Request",
        content: `User <strong>${username}</strong> has requested a withdrawal of ₹${amount}${upiId ? ` to UPI: ${upiId}` : ""}. This requires manual approval in the dashboard.`,
        highlightContent: `₹${amount}`,
        buttonLink: dashboardUrl,
        buttonText: "Review Payment",
        footerText: `Wallet balance after deduction: ₹${bal - amount}`
      })
      sendEmail({
        to: adminEmail,
        subject: `[ACTION REQUIRED] Withdrawal ₹${amount} from ${username}`,
        html: htmlTemplate
      }).catch(() => {})
    }
  } catch {}

  return NextResponse.json({ ok: true, withdrawalId: id })
}
