import { NextResponse } from "next/server"
import { requireOrgOwnerOrAdmin } from "@/lib/orgAuth"
import { addOrgMember, listOrgMembers, findOrgBySlug } from "@/lib/enterpriseStore"

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const auth = await requireOrgOwnerOrAdmin(slug)
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const org = await findOrgBySlug(slug)
  if (!org) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
  const members = await listOrgMembers(org.id)
  const safe = members.map(({ passwordHash: _, ...m }) => m)
  return NextResponse.json({ ok: true, data: safe })
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const auth = await requireOrgOwnerOrAdmin(slug)
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const org = await findOrgBySlug(slug)
  if (!org) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  const member = await addOrgMember(org.id, body)
  if (!member) return NextResponse.json({ ok: false, error: "Could not add member (duplicate, plan limit, or invalid data)" }, { status: 400 })
  const { passwordHash: _, ...safe } = member
  return NextResponse.json({ ok: true, data: safe })
}
