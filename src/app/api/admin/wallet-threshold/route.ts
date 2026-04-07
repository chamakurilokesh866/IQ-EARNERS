import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getProfiles } from "@/lib/profiles"
import { WITHDRAWAL_THRESHOLD_INR } from "@/lib/referralWalletConstants"

const MIN_WALLET = WITHDRAWAL_THRESHOLD_INR

export async function GET() {
  const store = await cookies()
  if (store.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }
  const profiles = await getProfiles()
  const eligible = profiles.filter((p) => Number(p.wallet ?? 0) >= MIN_WALLET)
  const data = eligible.map((p) => ({
    uid: p.uid,
    username: p.username ?? null,
    wallet: Number(p.wallet ?? 0),
    referralCode: p.referralCode ?? null
  }))
  return NextResponse.json({ ok: true, data, threshold: MIN_WALLET })
}
