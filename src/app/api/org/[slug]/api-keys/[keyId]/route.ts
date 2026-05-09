import { NextResponse } from "next/server"
import { requireOrgOwnerOrAdmin } from "@/lib/orgAuth"
import { findOrgBySlug, getEnterpriseState, logOrgAuditEvent, patchEnterpriseState } from "@/lib/enterpriseStore"

export async function PATCH(req: Request, ctx: { params: Promise<{ slug: string; keyId: string }> }) {
  const { slug, keyId } = await ctx.params
  const org = await findOrgBySlug(slug)
  if (!org?.active || org.suspended) {
    return NextResponse.json({ ok: false, error: "Organization not found" }, { status: 404 })
  }
  const auth = await requireOrgOwnerOrAdmin(slug)
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  if (auth.session.orgId !== org.id) {
    return NextResponse.json({ ok: false, error: "Wrong organization" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const active = body?.active
  if (typeof active !== "boolean") {
    return NextResponse.json({ ok: false, error: "active boolean required" }, { status: 400 })
  }

  const before = await getEnterpriseState()
  const existing = before.apiKeys.find((x) => x.id === keyId)
  if (!existing || existing.orgId !== org.id) {
    return NextResponse.json({ ok: false, error: "Key not found" }, { status: 404 })
  }

  const next = await patchEnterpriseState((s) => ({
    ...s,
    apiKeys: s.apiKeys.map((x) => (x.id === keyId ? { ...x, active } : x)),
  }))
  if (!next) return NextResponse.json({ ok: false, error: "Save failed" }, { status: 500 })

  const updated = next.apiKeys.find((x) => x.id === keyId)!

  await logOrgAuditEvent({
    orgId: org.id,
    actorMemberId: auth.session.memberId,
    actorName: auth.session.memberName,
    action: active ? "api_key_enabled" : "api_key_disabled",
    targetType: "organization",
    targetId: keyId,
    detail: `API key "${updated.name}"`,
  })

  return NextResponse.json({ ok: true })
}
