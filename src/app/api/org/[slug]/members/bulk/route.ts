import { NextResponse } from "next/server"
import { findOrgBySlug, addOrgMembersBulk } from "@/lib/enterpriseStore"
import { requireOrgOwnerOrAdmin } from "@/lib/orgAuth"
import { sendEmail } from "@/lib/email"
import { buildOrgMemberInviteHtml, buildOrgMemberInviteText } from "@/lib/orgMemberInviteEmail"
import { absoluteOrgPortalLoginUrl } from "@/lib/orgPortalPaths"

type InputRow = {
  username?: string
  displayName?: string
  email?: string
  password?: string
  role?: "admin" | "teacher" | "student"
  phone?: string
  department?: string
  grade?: string
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const auth = await requireOrgOwnerOrAdmin(slug)
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const org = await findOrgBySlug(slug)
  if (!org) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const rows = Array.isArray(body?.rows) ? (body.rows as InputRow[]) : []
  const sendInviteEmails = Boolean(body?.sendInviteEmails)
  if (!rows.length) return NextResponse.json({ ok: false, error: "No rows provided" }, { status: 400 })
  if (rows.length > 1000) return NextResponse.json({ ok: false, error: "Too many rows (max 1000)" }, { status: 400 })

  const normalized = rows.map((r) => ({
    username: String(r.username ?? "").trim().toLowerCase(),
    displayName: String(r.displayName ?? r.username ?? "").trim(),
    email: String(r.email ?? "").trim() || undefined,
    password: String(r.password ?? "").trim(),
    role: r.role && ["admin", "teacher", "student"].includes(r.role) ? r.role : "student",
    profile: {
      phone: String(r.phone ?? "").trim() || undefined,
      department: String(r.department ?? "").trim() || undefined,
      grade: String(r.grade ?? "").trim() || undefined,
    },
  }))

  const result = await addOrgMembersBulk(org.id, normalized)
  const createdByUsername = new Map(result.created.map((m) => [m.username.toLowerCase(), m]))
  let inviteEmailSent = 0
  let inviteEmailFailed = 0
  if (sendInviteEmails) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.iqearners.online"
    const portal = org.portalCode?.trim() || ""
    const loginUrl = portal ? absoluteOrgPortalLoginUrl(baseUrl, slug, portal) : `${baseUrl.replace(/\/$/, "")}/org/${slug}/login`
    const tasks = normalized
      .filter((r) => r.email && createdByUsername.has(r.username.toLowerCase()))
      .map(async (r) => {
        const member = createdByUsername.get(r.username.toLowerCase())
        if (!member?.email) return false
        const mail = await sendEmail({
          to: member.email,
          subject: `${org.name} — your portal account is ready`,
          html: buildOrgMemberInviteHtml({
            orgName: org.name,
            loginUrl,
            username: member.username,
            displayName: member.displayName,
            tempPassword: r.password,
          }),
          text: buildOrgMemberInviteText({
            orgName: org.name,
            loginUrl,
            username: member.username,
            displayName: member.displayName,
            tempPassword: r.password,
          }),
        })
        return mail.ok
      })
    const settled = await Promise.allSettled(tasks)
    for (const item of settled) {
      if (item.status === "fulfilled" && item.value) inviteEmailSent += 1
      else inviteEmailFailed += 1
    }
  }
  return NextResponse.json({
    ok: true,
    data: {
      createdCount: result.created.length,
      failedCount: result.failed.length,
      inviteEmailSent,
      inviteEmailFailed,
      failed: result.failed,
      created: result.created.map(({ passwordHash: _p, ...safe }) => safe),
    },
  })
}
