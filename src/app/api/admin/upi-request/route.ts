import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getUpiRequestState, setUpiRequestState } from "@/lib/upiRequests"

export async function GET() {
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  const data = await getUpiRequestState()
  return NextResponse.json({ ok: true, data })
}

export async function POST(req: Request) {
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const targetUsername = typeof body?.targetUsername === "string" ? body.targetUsername.trim() : ""
  const message = typeof body?.message === "string" ? body.message.trim() : ""
  const rank = typeof body?.rank === "number" ? body.rank : undefined
  if (!targetUsername || !message) return NextResponse.json({ ok: false, error: "targetUsername and message required" }, { status: 400 })
  const data = await getUpiRequestState()
  if (data.active) return NextResponse.json({ ok: false, error: "A request is already active" }, { status: 400 })
  const id = "req-" + Date.now()
  const active = { id, targetUsername, message, status: "sent", createdAt: Date.now(), rank }
  const ok = await setUpiRequestState({ ...data, active })
  if (!ok) return NextResponse.json({ ok: false, error: "Failed to save" }, { status: 500 })
  return NextResponse.json({ ok: true, data: { active } })
}
