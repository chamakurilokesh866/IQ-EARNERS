import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getUpiRequestState, setUpiRequestState } from "@/lib/upiRequests"

export async function POST() {
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  const data = await getUpiRequestState()
  if (!data.pendingNext?.targetUsername) return NextResponse.json({ ok: false, error: "No next user pending. Rank 1 must 'Pass' first." }, { status: 400 })
  const id = "req-" + Date.now()
  const rank = data.pendingNext.rank ?? 2
  const active = { id, targetUsername: data.pendingNext.targetUsername, message: data.pendingNext.message || "", status: "sent", createdAt: Date.now(), rank }
  const ok = await setUpiRequestState({ ...data, active, pendingNext: null })
  if (!ok) return NextResponse.json({ ok: false, error: "Failed to save" }, { status: 500 })
  return NextResponse.json({ ok: true, data: { active } })
}
