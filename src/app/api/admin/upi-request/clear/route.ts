import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getUpiRequestState, setUpiRequestState } from "@/lib/upiRequests"

export async function POST(req: Request) {
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const what = body?.what ?? "active" // "active" | "pending" | "both" | "history"
  const data = await getUpiRequestState()
  if (what === "active" || what === "both") data.active = null
  if (what === "pending" || what === "both") data.pendingNext = null
  if (what === "history") data.history = []
  const ok = await setUpiRequestState(data)
  if (!ok) return NextResponse.json({ ok: false, error: "Failed to save" }, { status: 500 })
  return NextResponse.json({ ok: true })
}
