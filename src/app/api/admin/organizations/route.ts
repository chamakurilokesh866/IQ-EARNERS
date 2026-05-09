import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { createOrganization, getEnterpriseState } from "@/lib/enterpriseStore"
import { sendEmail } from "@/lib/email"
import { buildOrgMemberInviteHtml, buildOrgMemberInviteText } from "@/lib/orgMemberInviteEmail"
import { absoluteOrgPortalLoginUrl } from "@/lib/orgPortalPaths"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const s = await getEnterpriseState()
  return NextResponse.json({ ok: true, data: s.organizations })
}

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const body = await req.json().catch(() => ({}))
  const ownerName = String(body?.ownerName ?? "").trim()
  const ownerEmail = String(body?.ownerEmail ?? "").trim().toLowerCase()
  const contactEmailRaw = String(body?.contactEmail ?? "").trim().toLowerCase()
  const contactEmail = contactEmailRaw || ownerEmail
  const emailOk = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  if (!ownerName || !ownerEmail) {
    return NextResponse.json({ ok: false, error: "Owner name and owner email are required." }, { status: 400 })
  }
  if (!emailOk(ownerEmail) || !emailOk(contactEmail)) {
    return NextResponse.json({ ok: false, error: "Please provide valid owner/contact email." }, { status: 400 })
  }
  const org = await createOrganization({ ...body, ownerName, ownerEmail, contactEmail })
  if (!org) return NextResponse.json({ ok: false, error: "Invalid data or duplicate slug" }, { status: 400 })

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.iqearners.online"
  const portal = org.portalCode?.trim() || ""
  const loginUrl = portal ? absoluteOrgPortalLoginUrl(baseUrl, org.slug, portal) : `${baseUrl.replace(/\/$/, "")}/org/${org.slug}/login`
  const mail = await sendEmail({
    to: org.ownerEmail,
    subject: `${org.name} on IQ Earners — owner portal access`,
    text: buildOrgMemberInviteText({
      orgName: `${org.name} (IQ Earners)`,
      loginUrl,
      username: org.ownerUsername,
      displayName: org.ownerName,
      tempPassword: org.ownerTempPassword,
    }),
    html: buildOrgMemberInviteHtml({
      orgName: `${org.name} (IQ Earners)`,
      loginUrl,
      username: org.ownerUsername,
      displayName: org.ownerName,
      tempPassword: org.ownerTempPassword,
    }),
  })

  return NextResponse.json({
    ok: true,
    data: org,
    credentialsEmail: { sent: mail.ok, error: mail.ok ? undefined : mail.error },
  })
}
