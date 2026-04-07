import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getProfileByUid } from "@/lib/profiles"
import { getPayments } from "@/lib/payments"

export async function GET() {
  const store = await cookies()
  const uid = store.get("uid")?.value ?? ""
  if (!uid) return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 })

  const profile = await getProfileByUid(uid)
  if (!profile) return NextResponse.json({ ok: false, error: "Profile not found" }, { status: 404 })

  const payments = await getPayments()
  const withdrawals = payments
    .filter((p) => p.type === "withdraw" && (p.meta as Record<string, unknown>)?.uid === uid)
    .sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))
    .slice(0, 20)
    .map((p) => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      created_at: p.created_at,
      upiId: (p.meta as Record<string, unknown>)?.upiId ?? ""
    }))

  return NextResponse.json({
    ok: true,
    balance: Number(profile.wallet ?? 0),
    username: profile.username,
    withdrawals
  })
}
