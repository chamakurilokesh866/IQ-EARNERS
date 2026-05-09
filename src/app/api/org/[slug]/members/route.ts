import { NextResponse } from "next/server"
import { requireOrgOwnerOrAdmin } from "@/lib/orgAuth"
import { addOrgMember, listOrgMembers, findOrgBySlug } from "@/lib/enterpriseStore"
import { sendEmail } from "@/lib/email"
import { buildOrgMemberInviteHtml, buildOrgMemberInviteText } from "@/lib/orgMemberInviteEmail"
import { absoluteOrgPortalLoginUrl } from "@/lib/orgPortalPaths"

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
  const sendInvite = Boolean((body as { sendInviteEmail?: boolean }).sendInviteEmail)
  const plainPassword = String((body as { password?: string }).password ?? "").trim()
  const member = await addOrgMember(org.id, body)
  if (!member) return NextResponse.json({ ok: false, error: "Could not add member (duplicate, plan limit, or invalid data)" }, { status: 400 })
  if (sendInvite && member.email?.includes("@") && plainPassword.length >= 4) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.iqearners.online"
    const portal = org.portalCode?.trim() || ""
    const loginUrl = portal ? absoluteOrgPortalLoginUrl(baseUrl, slug, portal) : `${baseUrl.replace(/\/$/, "")}/org/${slug}/login`
    await sendEmail({
      to: member.email,
      subject: `${org.name} — your portal account is ready`,
      html: buildOrgMemberInviteHtml({
        orgName: org.name,
        loginUrl,
        username: member.username,
        displayName: member.displayName,
        tempPassword: plainPassword,
      }),
      text: buildOrgMemberInviteText({
        orgName: org.name,
        loginUrl,
        username: member.username,
        displayName: member.displayName,
        tempPassword: plainPassword,
      }),
    })
  }
  const { passwordHash: _, ...safe } = member
  return NextResponse.json({ ok: true, data: safe })
}
