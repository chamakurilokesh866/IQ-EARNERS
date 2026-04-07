import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { listOrgMembers } from "@/lib/enterpriseStore"

export async function GET(_req: Request, ctx: { params: Promise<{ orgId: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const { orgId } = await ctx.params
  const members = await listOrgMembers(orgId)
  return NextResponse.json({ ok: true, data: members })
}
