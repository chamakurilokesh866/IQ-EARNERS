import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { rateLimit } from "@/lib/rateLimit"
import { validateOrigin } from "@/lib/auth"
import { validateCsrf } from "@/lib/csrf"
import { getProfileByReferralCode, getProfileByUid, updateProfileWallet } from "@/lib/profiles"
import { getReferrals, findReferralByReferred, findReferralByVisitorNoReferred, addReferral, updateReferral } from "@/lib/referrals"
import { getPayments, findPayment } from "@/lib/payments"
import { REFERRAL_CREDIT_INR } from "@/lib/referralWalletConstants"

export async function GET() {
  const store = await cookies()
  const uid = store.get("uid")?.value ?? ""
  if (!uid) return NextResponse.json({ ok: true, data: [] })
  const list = await getReferrals(uid)
  const enriched = await Promise.all(list.map(async (r) => {
    const referrerProfile = r.referrerUid ? await getProfileByUid(r.referrerUid) : null
    return { ...r, referrerUsername: referrerProfile?.username ?? null }
  }))
  return NextResponse.json({ ok: true, data: enriched })
}

export async function POST(req: Request) {
  const originCheck = validateOrigin(req)
  if (originCheck === false) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  const csrfOk = await validateCsrf(req)
  if (!csrfOk) return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 403 })
  const rl = await rateLimit(req, "referral")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests", retryAfter: rl.retryAfter }, { status: 429 })
  const store = await cookies()
  const referredUid = store.get("uid")?.value ?? ""
  const refcode = store.get("refcode")?.value ?? ""
  const visitorId = store.get("vid")?.value ?? ""
  if (!referredUid || !refcode) return NextResponse.json({ ok: true, data: null })
  const body = await req.json().catch(() => ({}))
  const orderIdFromBody = typeof body?.orderId === "string" ? body.orderId.trim() : ""
  const referrer = await getProfileByReferralCode(refcode)
  if (!referrer || referrer.uid === referredUid) return NextResponse.json({ ok: true, data: null })
  const referredProfile = await getProfileByUid(referredUid)
  const referredUsername = referredProfile?.username ?? ""
  const payments = await getPayments()
  const validTypes = ["tournament", "tournament_entry"]
  const metaName = (p: { meta?: Record<string, unknown> }) =>
    String((p?.meta?.username ?? p?.meta?.name ?? p?.meta?.customerName ?? "") as string).toLowerCase()
  let hasSuccessfulPayment = payments.some((p) =>
    p.status === "success" &&
    validTypes.includes(p.type) &&
    (p.profileId === referredUid || metaName(p) === referredUsername.toLowerCase())
  )
  if (!hasSuccessfulPayment && orderIdFromBody && referredUsername) {
    const payByOrder = await findPayment({ orderId: orderIdFromBody })
    if (
      payByOrder?.status === "success" &&
      validTypes.includes(payByOrder.type) &&
      (payByOrder.profileId === referredUid || metaName(payByOrder) === referredUsername.toLowerCase())
    ) {
      hasSuccessfulPayment = true
    }
  }
  // Credit referrer only when referred user has both paid AND created username
  const canCredit = hasSuccessfulPayment && !!referredUsername
  const status = canCredit ? "credited" : "pending"
  let entry = await findReferralByReferred(referredUid, referrer.uid)
  if (entry) {
    let changed = false
    const updates: any = {}

    if (referredUsername && entry.referredUsername !== referredUsername) {
      updates.referredUsername = referredUsername
      entry.referredUsername = referredUsername
      changed = true
    }

    const alreadyCredited = entry.status === "credited"
    if (canCredit && !alreadyCredited) {
      updates.status = "credited"
      entry.status = "credited"
      changed = true
    }

    if (changed) {
      updates.updated_at = Date.now()
      await updateReferral(entry.id, updates)
      if (updates.status === "credited") {
        await updateProfileWallet(referrer.uid, Number(entry.amount ?? REFERRAL_CREDIT_INR))
      }
    }
    return NextResponse.json({ ok: true, data: entry })
  }
  const existingByVisitor = visitorId ? await findReferralByVisitorNoReferred(visitorId, referrer.uid) : null
  if (existingByVisitor) {
    const alreadyCredited = existingByVisitor.status === "credited"
    existingByVisitor.referredUid = referredUid
    existingByVisitor.referredUsername = referredUsername || existingByVisitor.referredUsername
    existingByVisitor.status = status
    existingByVisitor.updated_at = Date.now()
    await updateReferral(existingByVisitor.id, {
      referredUid,
      referredUsername: existingByVisitor.referredUsername,
      status,
      updated_at: existingByVisitor.updated_at
    })
    if (canCredit && !alreadyCredited) {
      await updateProfileWallet(referrer.uid, Number(existingByVisitor.amount ?? REFERRAL_CREDIT_INR))
    }
    return NextResponse.json({ ok: true, data: existingByVisitor })
  }
  entry = {
    id: String(Date.now()),
    referrerUid: referrer.uid,
    referrerCode: refcode,
    referredUid,
    referredUsername: referredUsername || undefined,
    visitorId: visitorId || undefined,
    status,
    amount: REFERRAL_CREDIT_INR,
    created_at: Date.now()
  }
  const ok = await addReferral(entry)
  if (!ok) return NextResponse.json({ ok: false, error: "Failed to save" }, { status: 500 })
  if (canCredit) {
    await updateProfileWallet(referrer.uid, REFERRAL_CREDIT_INR)
  }
  return NextResponse.json({ ok: true, data: entry })
}
