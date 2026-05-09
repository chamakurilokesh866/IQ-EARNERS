import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { createMoneyDispute, listMoneyDisputes } from "@/lib/moneyDisputes"

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const limit = Math.min(500, Math.max(1, Number(new URL(req.url).searchParams.get("limit")) || 200))
  const rows = await listMoneyDisputes(limit)
  return NextResponse.json({ ok: true, data: rows })
}

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const body = await req.json().catch(() => ({}))
  const subject = String(body?.subject ?? "").trim()
  const detail = String(body?.detail ?? "").trim()
  if (!subject || !detail) {
    return NextResponse.json({ ok: false, error: "subject and detail required" }, { status: 400 })
  }
  const row = await createMoneyDispute({
    subject,
    detail,
    username: body?.username,
    paymentId: body?.paymentId,
    tournamentId: body?.tournamentId,
  })
  return NextResponse.json({ ok: true, data: row })
}
