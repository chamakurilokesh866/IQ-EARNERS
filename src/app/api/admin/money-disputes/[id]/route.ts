import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { updateMoneyDispute, type MoneyDisputeStatus } from "@/lib/moneyDisputes"

const STATUSES: MoneyDisputeStatus[] = ["open", "reviewing", "resolved", "rejected"]

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const status = body?.status as MoneyDisputeStatus | undefined
  if (status && !STATUSES.includes(status)) {
    return NextResponse.json({ ok: false, error: "invalid status" }, { status: 400 })
  }
  const next = await updateMoneyDispute(id, {
    status,
    adminNotes: typeof body?.adminNotes === "string" ? body.adminNotes : undefined,
  })
  if (!next) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
  return NextResponse.json({ ok: true, data: next })
}
