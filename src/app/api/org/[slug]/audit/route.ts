import { NextResponse } from "next/server"
import { requireOrgSession } from "@/lib/orgAuth"
import { findOrgBySlug, listOrgAuditEvents } from "@/lib/enterpriseStore"

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const auth = await requireOrgSession(slug)
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  if (!["owner", "admin", "teacher"].includes(auth.session.role)) {
    return NextResponse.json({ ok: false, error: "Only owner/admin/teacher can view audit log" }, { status: 403 })
  }
  const org = await findOrgBySlug(slug)
  if (!org) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
  const data = await listOrgAuditEvents(org.id)
  return NextResponse.json({ ok: true, data })
}

