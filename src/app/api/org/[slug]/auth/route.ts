import { NextResponse } from "next/server"
import { findOrgBySlug, authenticateOrgOwner, authenticateOrgMember } from "@/lib/enterpriseStore"
import { encodeOrgSession, orgCookieOptions, orgClearOptions, getOrgSession } from "@/lib/orgAuth"

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const org = await findOrgBySlug(slug)
  if (!org) return NextResponse.json({ ok: false, error: "Organization not found" }, { status: 404 })
  if (!org.active || org.suspended) return NextResponse.json({ ok: false, error: "Organization is suspended" }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const username = String(body?.username ?? body?.email ?? "").trim()
  const password = String(body?.password ?? "").trim()
  if (!username || !password) return NextResponse.json({ ok: false, error: "Username and password required" }, { status: 400 })

  const ownerResult = await authenticateOrgOwner(slug, username, password)
  if (ownerResult) {
    const { org: o, member } = ownerResult
    const token = encodeOrgSession({ orgId: o.id, orgSlug: o.slug, memberId: member.id, memberName: member.displayName, role: "owner" })
    const res = NextResponse.json({ ok: true, role: "owner", name: member.displayName, orgName: o.name })
    const opts = orgCookieOptions()
    res.cookies.set(opts.name, token, opts)
    return res
  }

  const member = await authenticateOrgMember(org.id, username, password)
  if (member) {
    const token = encodeOrgSession({ orgId: org.id, orgSlug: org.slug, memberId: member.id, memberName: member.displayName, role: member.role })
    const res = NextResponse.json({ ok: true, role: member.role, name: member.displayName, orgName: org.name })
    const opts = orgCookieOptions()
    res.cookies.set(opts.name, token, opts)
    return res
  }

  return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 })
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  await ctx.params
  const res = NextResponse.json({ ok: true })
  const opts = orgClearOptions()
  res.cookies.set(opts.name, "", opts)
  return res
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const session = await getOrgSession()
  if (!session || session.orgSlug !== slug) return NextResponse.json({ ok: false, loggedIn: false })
  const org = await findOrgBySlug(slug)
  return NextResponse.json({ ok: true, loggedIn: true, role: session.role, name: session.memberName, orgName: org?.name })
}
