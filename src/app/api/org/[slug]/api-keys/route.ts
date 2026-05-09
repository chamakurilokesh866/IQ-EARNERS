import { NextResponse } from "next/server"
import { requireOrgOwnerOrAdmin } from "@/lib/orgAuth"
import {
  findOrgBySlug,
  generateApiKeyFull,
  getEnterpriseState,
  logOrgAuditEvent,
  patchEnterpriseState,
  toPublicApiKey,
} from "@/lib/enterpriseStore"
import type { StoredApiKey } from "@/lib/enterpriseState"

/** Permissions org admins may assign to their own integration keys (same surface as admin UI, scoped to org). */
const ORG_ALLOWED_PERMISSIONS = new Set([
  "quiz:read",
  "quiz:write",
  "user:read",
  "user:write",
  "leaderboard:read",
  "analytics:read",
  "certificate:read",
  "certificate:write",
  "tournament:read",
  "tournament:write",
])

const ORG_KEY_RATE_MIN = 1
const ORG_KEY_RATE_MAX = 5_000

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const org = await findOrgBySlug(slug)
  if (!org?.active || org.suspended) {
    return NextResponse.json({ ok: false, error: "Organization not found" }, { status: 404 })
  }
  const auth = await requireOrgOwnerOrAdmin(slug)
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  if (auth.session.orgId !== org.id) {
    return NextResponse.json({ ok: false, error: "Wrong organization" }, { status: 403 })
  }

  const s = await getEnterpriseState()
  const mine = s.apiKeys.filter((k) => k.orgId === org.id)
  return NextResponse.json({ ok: true, data: mine.map(toPublicApiKey) })
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
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
  const name = String(body?.name ?? "").trim()
  if (!name) return NextResponse.json({ ok: false, error: "Name required" }, { status: 400 })

  const rawPerms = Array.isArray(body?.permissions) ? body.permissions.map(String) : []
  const permissions = rawPerms.filter((p: string) => ORG_ALLOWED_PERMISSIONS.has(p))
  if (!permissions.length) {
    return NextResponse.json({ ok: false, error: "At least one valid permission required" }, { status: 400 })
  }

  const rateLimit = Math.max(ORG_KEY_RATE_MIN, Math.min(ORG_KEY_RATE_MAX, Number(body?.rateLimit) || 100))
  const { full, prefix, hash } = generateApiKeyFull()

  const row: StoredApiKey = {
    id: `key_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    name,
    keyHash: hash,
    keyPrefix: prefix,
    orgId: org.id,
    orgName: org.name,
    permissions,
    rateLimit,
    requestsToday: 0,
    requestsMonth: 0,
    active: true,
    createdAt: new Date().toISOString(),
    usageDay: new Date().toISOString().slice(0, 10),
    usageMonth: new Date().toISOString().slice(0, 7),
  }

  const next = await patchEnterpriseState((s) => ({ ...s, apiKeys: [...s.apiKeys, row] }))
  if (!next) return NextResponse.json({ ok: false, error: "Save failed" }, { status: 500 })

  await logOrgAuditEvent({
    orgId: org.id,
    actorMemberId: auth.session.memberId,
    actorName: auth.session.memberName,
    action: "api_key_created",
    targetType: "organization",
    targetId: row.id,
    detail: `API key "${name}"`,
  })

  return NextResponse.json({ ok: true, data: { key: full, id: row.id } })
}
