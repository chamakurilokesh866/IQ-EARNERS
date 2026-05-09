import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { listMoneyLedgerEntries } from "@/lib/moneyLedger"

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const url = new URL(req.url)
  const limit = Math.min(2000, Math.max(1, Number(url.searchParams.get("limit")) || 800))
  const rows = await listMoneyLedgerEntries(limit)
  return NextResponse.json({ ok: true, data: rows })
}
