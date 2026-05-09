import { NextResponse } from "next/server"
import {
  findOrgBySlug,
  authenticateOrgOwner,
  authenticateOrgMember,
  getEnterpriseState,
  listOrgMembers,
  setOrgMemberPassword,
  orgPortalCodeMatches,
} from "@/lib/enterpriseStore"
import { encodeOrgSession, orgCookieOptions, orgClearOptions, getOrgSession } from "@/lib/orgAuth"
import { rateLimit } from "@/lib/rateLimit"

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
  const guard = await rateLimit(req, "orgLogin")
  if (!guard.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many login attempts. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(guard.retryAfter) } }
    )
  }

  const { slug } = await ctx.params
  const org = await findOrgBySlug(slug)
  if (!org) return NextResponse.json({ ok: false, error: "Organization not found" }, { status: 404 })
  if (!org.active || org.suspended) return NextResponse.json({ ok: false, error: "Organization is suspended" }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const portalCodeRaw = String(body?.portalCode ?? "").trim()
  if (!portalCodeRaw) {
    return NextResponse.json({ ok: false, error: "Portal access code required (use your organization login link)." }, { status: 400 })
  }
  if (!orgPortalCodeMatches(org, portalCodeRaw)) {
    return NextResponse.json({ ok: false, error: "Invalid organization login link" }, { status: 401 })
  }

  const username = String(body?.username ?? body?.email ?? "").trim()
  const password = String(body?.password ?? "").trim()
  if (!username || !password) return NextResponse.json({ ok: false, error: "Username and password required" }, { status: 400 })

  const ownerResult = await authenticateOrgOwner(slug, username, password)
  if (ownerResult) {
    const { org: o, member } = ownerResult
    const token = encodeOrgSession({ orgId: o.id, orgSlug: o.slug, memberId: member.id, memberName: member.displayName, role: "owner" })
    const state = await getEnterpriseState()
    const hasApiKey = state.apiKeys.some((k) => k.orgId === o.id && k.active)
    const res = NextResponse.json({
      ok: true,
      role: "owner",
      name: member.displayName,
      orgName: o.name,
      requiresApiSetup: !hasApiKey,
      requiresPasswordReset: !!member.mustChangePassword,
    })
    const opts = orgCookieOptions()
    res.cookies.set(opts.name, token, opts)
    return res
  }

  const member = await authenticateOrgMember(org.id, username, password)
  if (member) {
    const token = encodeOrgSession({ orgId: org.id, orgSlug: org.slug, memberId: member.id, memberName: member.displayName, role: member.role })
    let requiresApiSetup = false
    if (member.role === "owner" || member.role === "admin") {
      const state = await getEnterpriseState()
      requiresApiSetup = !state.apiKeys.some((k) => k.orgId === org.id && k.active)
    }
    const res = NextResponse.json({
      ok: true,
      role: member.role,
      name: member.displayName,
      orgName: org.name,
      requiresApiSetup,
      requiresPasswordReset: !!member.mustChangePassword,
    })
    const opts = orgCookieOptions()
    res.cookies.set(opts.name, token, opts)
    return res
  }

  return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Authentication failed"
    if (message.includes("ORG_SESSION_SECRET")) {
      return NextResponse.json({ ok: false, error: "Organization auth is not configured on server" }, { status: 503 })
    }
    return NextResponse.json({ ok: false, error: "Authentication failed" }, { status: 500 })
  }
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
  const members = org ? await listOrgMembers(org.id) : []
  const me = members.find((m) => m.id === session.memberId)
  return NextResponse.json({
    ok: true,
    loggedIn: true,
    role: session.role,
    name: session.memberName,
    orgName: org?.name,
    portalCode: org?.portalCode ?? null,
    requiresPasswordReset: !!me?.mustChangePassword,
  })
}

export async function PATCH(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const session = await getOrgSession()
  if (!session || session.orgSlug !== slug) {
    return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 })
  }
  const body = await req.json().catch(() => ({}))
  const nextPassword = String(body?.newPassword ?? "").trim()
  if (nextPassword.length < 8) {
    return NextResponse.json({ ok: false, error: "Password must be at least 8 characters" }, { status: 400 })
  }
  const updated = await setOrgMemberPassword(session.orgId, session.memberId, nextPassword)
  if (!updated) return NextResponse.json({ ok: false, error: "Failed to update password" }, { status: 500 })
  return NextResponse.json({ ok: true })
}
