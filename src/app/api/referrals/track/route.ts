import { NextResponse } from "next/server"
import crypto from "crypto"
import { cookies } from "next/headers"
import { rateLimit } from "@/lib/rateLimit"
import { cookieOptions } from "@/lib/cookieOptions"
import { getProfileByReferralCode } from "@/lib/profiles"
import { findReferralByVisitor, addReferral } from "@/lib/referrals"
import { getCreatorByHandle } from "@/lib/creators"
import { REFERRAL_CREDIT_INR } from "@/lib/referralWalletConstants"

export async function POST(req: Request) {
  const store = await cookies()
  let refcode = store.get("refcode")?.value ?? ""
  if (!refcode) {
    const url = new URL(req.url)
    const refFromQuery = url.searchParams.get("ref")?.trim()
    if (refFromQuery) refcode = refFromQuery
  }
  let visitorId = store.get("vid")?.value ?? ""
  if (!refcode) return NextResponse.json({ ok: false, error: "no ref" }, { status: 400 })
  const rl = await rateLimit(req, "referral")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests", retryAfter: rl.retryAfter }, { status: 429 })
  const standardReferrer = await getProfileByReferralCode(refcode)
  const creatorReferrer = !standardReferrer ? await getCreatorByHandle(refcode) : null
  const referrer = standardReferrer || creatorReferrer

  if (!referrer) return NextResponse.json({ ok: false, error: "invalid ref" }, { status: 400 })
  const referrerUid = standardReferrer ? standardReferrer.uid : (creatorReferrer?.uid || "")
  const referralAmount = REFERRAL_CREDIT_INR
  if (!visitorId) visitorId = crypto.randomBytes(12).toString("hex")
  const exists = await findReferralByVisitor(visitorId, referrer.uid)
  if (exists) {
    const res = NextResponse.json({ ok: true, data: exists })
    res.cookies.set("vid", visitorId, cookieOptions({ maxAge: 60 * 60 * 24 * 30 }))
    res.cookies.set("refcode", refcode, cookieOptions({ maxAge: 60 * 60 * 24 * 30 }))
    return res
  }
  const entry = {
    id: String(Date.now()),
    referrerUid: referrerUid,
    referrerCode: refcode,
    referredUid: null as string | null,
    visitorId,
    status: "visited" as const,
    amount: referralAmount,
    created_at: Date.now()
  }
  const ok = await addReferral(entry)
  if (!ok) return NextResponse.json({ ok: false, error: "Failed to save" }, { status: 500 })
  const res = NextResponse.json({ ok: true, data: entry })
  res.cookies.set("vid", visitorId, cookieOptions({ maxAge: 60 * 60 * 24 * 30 }))
  res.cookies.set("refcode", refcode, cookieOptions({ maxAge: 60 * 60 * 24 * 30 }))
  return res
}
