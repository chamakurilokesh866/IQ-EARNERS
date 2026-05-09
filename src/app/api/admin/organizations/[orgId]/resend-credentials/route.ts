import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getEnterpriseState, rotateOrgOwnerCredentials } from "@/lib/enterpriseStore"
import { sendEmail } from "@/lib/email"
import { buildOrgMemberInviteHtml, buildOrgMemberInviteText } from "@/lib/orgMemberInviteEmail"
import { absoluteOrgPortalLoginUrl } from "@/lib/orgPortalPaths"

export async function POST(_req: Request, ctx: { params: Promise<{ orgId: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  const { orgId } = await ctx.params
  const state = await getEnterpriseState()
  const org = state.organizations.find((o) => o.id === orgId)
  if (!org) return NextResponse.json({ ok: false, error: "Organization not found" }, { status: 404 })

  const rotated = await rotateOrgOwnerCredentials(orgId)
  if (!rotated) return NextResponse.json({ ok: false, error: "Could not rotate owner credentials" }, { status: 500 })

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.iqearners.online"
  const fresh = (await getEnterpriseState()).organizations.find((o) => o.id === orgId) ?? org
  const portal = fresh.portalCode?.trim() || ""
  const loginUrl = portal ? absoluteOrgPortalLoginUrl(baseUrl, fresh.slug, portal) : `${baseUrl.replace(/\/$/, "")}/org/${fresh.slug}/login`
  const sent = await sendEmail({
    to: rotated.ownerEmail,
    subject: `${org.name} — updated portal credentials`,
    text: buildOrgMemberInviteText({
      orgName: `${org.name} (IQ Earners) — credentials reset`,
      loginUrl,
      username: rotated.username,
      displayName: rotated.ownerName,
      tempPassword: rotated.tempPassword,
    }),
    html: buildOrgMemberInviteHtml({
      orgName: `${org.name} (IQ Earners)`,
      loginUrl,
      username: rotated.username,
      displayName: rotated.ownerName,
      tempPassword: rotated.tempPassword,
    }),
  })

  return NextResponse.json({
    ok: true,
    data: {
      ownerEmail: rotated.ownerEmail,
      ownerUsername: rotated.username,
      ownerTempPassword: rotated.tempPassword,
      emailSent: sent.ok,
      emailError: sent.ok ? undefined : sent.error,
    },
  })
}
